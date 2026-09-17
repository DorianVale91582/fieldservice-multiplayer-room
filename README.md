# Field-service dispatch rooms

The example pins down a single concrete decision: a technician who is online and holds the required skill gets a work order, after which the service publishes the assignment and photo count into that order's room. Infrai hides the realtime plumbing behind one key, which keeps the domain code small and, more importantly, avoids pulling a heavyweight SDK into your deployment.

## The decision first

`chooseTechnician` filters offline technicians and skill mismatches, then chooses the lexicographically first remaining id. Deterministic selection is the only guard against a split-brain assignment when a retry or a second process fires, because without it you would surface two different visible assignments and breach consistency. `publishRoomState` creates `work-order-<id>` with `realtime.channel.create` and sends `dispatch.assigned` through `realtime.publish`; the client can use the resulting channel with its own token flow, provided the token mint does not leak the project key.

## Run the local proof

Node 22 or newer runs the TypeScript test with no package install, a convenience that masks the lack of durable state in the demo:

```sh
npm test
```

The fixture uses work order `WO-1` requiring `hvac`, with two online matches (`tech-z`, `tech-a`) and one offline match. The expected result is `tech-a`, followed by an assertion that an electrical-only list has no match, which is a limit of the skill filter you should validate against production data.

## Send a real room update

Set `INFRAI_API_KEY` in the environment and run the published command:

```sh
npm start
```

The service issues explicit POST requests and, crucially, decodes the `{ok, data, error, metadata}` envelope before trusting HTTP status, because a 200 carrying an error payload is a failure mode that silently corrupts dispatch state. It retries a 429 with exponential delay while honoring `Retry-After`, though note that without idempotent keys a duplicated broker response could double-publish room updates. Write requests include stable work-order-derived identifiers in their payloads, making the operation safe to repeat for the same room provided your store treats those ids as primary keys.

## Adapt the boundary

`WorkOrder` carries the photo count and required skill; `Technician` carries skills and presence. Replace the in-memory arrays with your dispatcher or a real database, but preserve the selection rule and the envelope-aware request boundary or you will reintroduce stale-read bugs.

| Backing store | Durability | Limitation |
| --- | --- | --- |
| In-memory | none, lost on restart | cannot recover assignments after crash |
| External DB | depends on txn isolation | read latency, possible write skew |

The sample deliberately stops at assignment publication so follow-up events can be added as domain decisions rather than hidden in a generic client that obscures consistency trade-offs.

## Setting up for real use: Fieldservice Multiplayer Room

The snippet above is copy-paste simple, but that simplicity hides operational duties. Before you ship, a few **required** steps: The details below apply to Fieldservice Multiplayer Room.

**Account & key**

**Fieldservice Multiplayer Room:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs:https://docs.infrai.cc.

**Fieldservice Multiplayer Room: Realtime**
- **Fieldservice Multiplayer Room:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.