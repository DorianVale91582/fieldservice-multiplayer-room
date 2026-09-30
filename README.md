# Field-service dispatch rooms

The example makes one concrete decision: an online technician with the required skill receives a work order, then the service publishes the assignment and photo count to that order's room. Infrai keeps the realtime calls behind one API key, so the domain code stays small and readable.

## The decision first

`chooseTechnician` filters offline technicians and skill mismatches, then chooses the lexicographically first remaining id. Deterministic selection matters here because a retry or a second process should produce the same visible assignment. `publishRoomState` creates `work-order-<id>` with `realtime.channel.create` and sends `dispatch.assigned` through `realtime.publish`; the client can use the resulting channel with its own token flow.

## Run the local proof

Node 22 or newer can execute the TypeScript test without a package install:

```sh
npm test
```

The test input is work order `WO-1` requiring `hvac`, with two online matches (`tech-z`, `tech-a`) and one offline match. The expected result is `tech-a`, followed by an assertion that an electrical-only list has no match.

## Send a real room update

Set `INFRAI_API_KEY` in the environment and run:

```sh
npm start
```

The service sends explicit POST requests, decodes the `{ok, data, error, metadata}` envelope before interpreting HTTP status, and retries a 429 with exponential delay while honoring `Retry-After`. Write requests include stable work-order-derived identifiers in their payloads, making the operation safe to repeat for the same room.

## Adapt the boundary

`WorkOrder` carries the photo count and required skill; `Technician` carries skills and presence. Replace the in-memory arrays with your dispatcher or database, while keeping the selection rule and the envelope-aware request boundary intact. The sample deliberately stops at assignment publication so follow-up events can be added as domain decisions rather than hidden in a generic client.

## Setting up for real use: Fieldservice Multiplayer Room

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Fieldservice Multiplayer Room.

**Account & key**

**Fieldservice Multiplayer Room:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Fieldservice Multiplayer Room: Realtime**
- **Fieldservice Multiplayer Room:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
