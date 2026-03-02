---
name: eva-mobile
description: Read Jun's last known GPS location and battery from Eva Mobile via EVA Core. Use this when location context is required for planning, coordination, or check-ins.
metadata: {"openclaw":{"requires":{"bins":["node"]},"emoji":"📍","homepage":"https://github.com/flashosophy/eva-mobile"}}
---

# Eva Mobile Locate Skill

Eva Mobile continuously publishes location updates to EVA Core.

There is no pairing flow anymore.

- No pair code
- No focus-only WebSocket relay
- No `jun-sense-session.json`

Run commands using `{baseDir}/eva-mobile-locate.js`.

All output is JSONL (one JSON object per line).

## Environment

- `EVA_CORE_URL` - EVA Core base URL (example: `http://127.0.0.1:3456`)
- `EVA_CORE_SERVICE_TOKEN` - service token used to read `/api/location/:userId`
- `EVA_CORE_LOCATION_USER_ID` - target user id (default: `user-jun`)

## Commands

### Pair (compatibility no-op)

```bash
node {baseDir}/eva-mobile-locate.js pair
```

Returns success with `pairingRequired: false`.

### Check status

```bash
node {baseDir}/eva-mobile-locate.js status
```

Examples:

```json
{"type":"status","connected":true,"available":true,"pairingRequired":false,"userId":"user-jun","staleSeconds":24,"warning":null}
{"type":"status","connected":true,"available":false,"pairingRequired":false,"reason":"location_not_found","userId":"user-jun"}
{"type":"status","connected":false,"available":false,"pairingRequired":false,"reason":"request_failed","error":"..."}
```

### Read location

```bash
node {baseDir}/eva-mobile-locate.js read eva-mobile://location
```

Legacy URI alias is also supported:

```bash
node {baseDir}/eva-mobile-locate.js read jun://location
```

Example:

```json
{"type":"resource","uri":"eva-mobile://location","data":{"lat":45.5017,"lng":-73.5673,"accuracy":8.2,"altitude":32.1,"speed":1.4,"heading":274.3,"ts":1771626476045,"battery":82,"staleSeconds":19,"available":true}}
```

### Read battery

```bash
node {baseDir}/eva-mobile-locate.js read eva-mobile://battery
```

Legacy URI alias is also supported:

```bash
node {baseDir}/eva-mobile-locate.js read jun://battery
```

Example:

```json
{"type":"resource","uri":"eva-mobile://battery","data":{"level":82,"ts":1771626477000,"staleSeconds":19,"available":true}}
```

### List resources

```bash
node {baseDir}/eva-mobile-locate.js list-resources
```

## Legacy command compatibility

Old command names continue to work:

```bash
node {baseDir}/jun-sense-connect.js pair
node {baseDir}/jun-sense-connect.js status
node {baseDir}/jun-sense-connect.js read jun://location
```

`jun-sense-connect` is now a compatibility wrapper around `eva-mobile-locate`.

## Behavioral Rules

1. Query location only when relevant to Jun's request.
2. If `available: false`, explain that the app has not published a fix yet.
3. If `staleSeconds > 300`, include a stale-data warning.
4. If `connected: false`, verify EVA Core reachability and service token config.
