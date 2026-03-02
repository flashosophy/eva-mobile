---
name: eva-mobile
description: Read Jun's last known GPS location and battery from Eva Mobile via EVA Core. Use this when location context is required for planning, coordination, or check-ins.
metadata: {"openclaw":{"requires":{"bins":["node"]},"emoji":"📍","homepage":"https://github.com/jun/eva-mobile"}}
---

# Eva Mobile Location Skill

Eva Mobile publishes phone location updates to EVA Core.

Run commands using `{baseDir}/eva-mobile-locate.js`.

All output is JSONL (one JSON object per line).

## Environment

- `EVA_CORE_URL` - EVA Core base URL (example: `http://127.0.0.1:3456`)
- `EVA_CORE_SERVICE_TOKEN` - service token used to read `/api/location/:userId`
- `EVA_CORE_LOCATION_USER_ID` - target user id (defaults to `user-jun`)

## Check status

```bash
node {baseDir}/eva-mobile-locate.js status
```

Examples:

```json
{"type":"status","connected":true,"available":true,"userId":"user-jun","staleSeconds":24,"warning":null}
{"type":"status","connected":true,"available":false,"reason":"location_not_found","userId":"user-jun"}
{"type":"status","connected":false,"available":false,"reason":"request_failed","error":"..."}
```

## Read location

```bash
node {baseDir}/eva-mobile-locate.js read eva-mobile://location
```

Backward compatibility URI also supported:

```bash
node {baseDir}/eva-mobile-locate.js read jun://location
```

Example:

```json
{"type":"resource","uri":"eva-mobile://location","data":{"lat":45.5017,"lng":-73.5673,"accuracy":8.2,"altitude":32.1,"speed":1.4,"heading":274.3,"ts":1771626476045,"battery":82,"staleSeconds":19,"available":true}}
```

## Read battery

```bash
node {baseDir}/eva-mobile-locate.js read eva-mobile://battery
```

Backward compatibility URI also supported:

```bash
node {baseDir}/eva-mobile-locate.js read jun://battery
```

Example:

```json
{"type":"resource","uri":"eva-mobile://battery","data":{"level":82,"ts":1771626477000,"staleSeconds":19,"available":true}}
```

## List resources

```bash
node {baseDir}/eva-mobile-locate.js list-resources
```

## Behavioral Rules

1. Only query location when it is relevant to Jun's request.
2. If `available: false`, explain that the app has not published a location yet.
3. If `staleSeconds > 300`, include a stale-data warning in your response.
4. If `connected: false`, check EVA Core reachability and service token configuration.
