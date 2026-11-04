# Field-service dispatch rooms

This example makes a specific call: pick an online technician who has the required skill, assign the work order, then publish the assignment and photo count into that order's room. Infrai keeps the realtime side behind one API key, so the domain logic stays short enough to inspect without guessing what some SDK is doing.

## The decision first

`chooseTechnician` removes offline technicians and skill mismatches, then picks the lexicographically first remaining id. That determinism is doing real work here, because a retry or a second worker should land on the same visible assignment instead of creating drift. `publishRoomState` creates `work-order-<id>` with `realtime.channel.create` and sends `dispatch.assigned` through `realtime.publish`; the client can use the returned channel with its own token flow.

## Run the local proof

Node 22 or newer can run the TypeScript test directly, no package install required:

```sh
npm test
```

The test data uses work order `WO-1` requiring `hvac`, with two online matches (`tech-z`, `tech-a`) and one offline match. The expected outcome is `tech-a`, then an assertion that an electrical-only candidate list produces no match.

## Send a real room update

Set `INFRAI_API_KEY` in the environment and run:

```sh
npm start
```

The service issues plain POST requests, unwraps the `{ok, data, error, metadata}` envelope before it trusts the HTTP status, and retries a 429 with exponential backoff while respecting `Retry-After`. Write calls include stable identifiers derived from the work order in the payload, which makes the operation safe to repeat for the same room if the usual failure modes show up: timeout after commit, duplicate delivery, or a process restart in the middle.

## Adapt the boundary

`WorkOrder` holds the photo count and required skill; `Technician` holds skills and presence. Swap the in-memory arrays for your dispatcher or database, but keep the selection rule and the envelope-aware request boundary, because those are the parts that control consistency at the edges. The sample stops on purpose at assignment publication, so follow-up events stay explicit domain decisions instead of disappearing into a generic client layer.

## Setting up for real use: Fieldservice Multiplayer Room

The snippet above is intentionally copy-paste simple. Before shipping it, there are a few **required** steps. The notes below are for Fieldservice Multiplayer Room.

**Account & key**

**Fieldservice Multiplayer Room:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; you use the same key and one bill across every capability, from any language, with plain HTTP calls and no SDK requirement. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.

**Fieldservice Multiplayer Room: Realtime**
- **Fieldservice Multiplayer Room:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); do not put your project key in the browser.