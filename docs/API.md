# API

Base URL: `http://localhost:3000` (set `PORT` to change).

All request/response bodies are JSON.

## `GET /health`

Liveness check.

```json
{ "status": "ok" }
```

## `POST /bots`

Trigger a bot to join a meeting. Returns `202 Accepted` immediately with a
session; the join runs asynchronously. Poll `GET /bots/:id` for progress.

Request:

```json
{ "url": "https://meet.google.com/abc-defg-hij" }
```

`url` may be a full Meet link, `meet.google.com/abc-defg-hij`, or a bare
`abc-defg-hij` code.

Response `202`:

```json
{
  "id": "0f1c…",
  "meeting": {
    "platform": "google_meet",
    "nativeMeetingId": "abc-defg-hij",
    "url": "https://meet.google.com/abc-defg-hij"
  },
  "status": "pending",
  "engine": null,
  "createdAt": "2026-06-02T19:00:00.000Z",
  "updatedAt": "2026-06-02T19:00:00.000Z"
}
```

`400` if the URL is missing or not a valid Google Meet link.

## `GET /bots/:id`

Fetch a session. `status` is one of `pending`, `joining`, `active`, `ended`,
`failed`. `404` if unknown.

## `GET /bots`

List all sessions: `{ "sessions": [ ... ] }`.

## `DELETE /bots/:id`

Remove the bot from the meeting (best-effort) and mark the session `ended`.
Returns the updated session, or `404` if unknown.

## Example

```bash
curl -s -X POST http://localhost:3000/bots \
  -H 'Content-Type: application/json' \
  -d '{ "url": "https://meet.google.com/abc-defg-hij" }'

curl -s http://localhost:3000/bots/<id>
```
