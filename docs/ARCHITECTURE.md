# Architecture

How the meeting bot is put together. See [PRD.md](./PRD.md) for the why.

## Layers

```
HTTP client
   │  POST /bots { "url": "https://meet.google.com/abc-defg-hij" }
   ▼
┌──────────────┐
│  API layer   │  src/api/  — Express, request validation (zod), routing
└──────┬───────┘
       ▼
┌──────────────┐
│ Orchestrator │  src/orchestrator/  — session lifecycle, engine selection,
│              │  retries + fallback
└──────┬───────┘
       ▼
┌──────────────────────────────┐
│  Engines (MeetingBotEngine)  │  src/engines/
│  1. VexaEngine   (primary)   │  Vexa.ai REST API
│  2. PlaywrightEngine (fallback) │ Chromium automation
└──────┬───────────────────────┘
       ▼
┌──────────────┐
│ Auth system  │  src/auth/  — persistent Google Chromium profile
└──────────────┘
```

## Request flow

1. `POST /bots` validates the body and normalizes the Meet URL into a
   `native_meeting_id` (`src/utils/meetUrl.ts`).
2. The orchestrator creates a session (`pending`) and returns `202` immediately
   with a session id — joining happens asynchronously.
3. The orchestrator tries each **available** engine in order. Each engine gets
   `MAX_RETRIES + 1` attempts with exponential backoff before falling through to
   the next engine.
4. On success the session becomes `active`; if every engine is exhausted it
   becomes `failed`. Clients poll `GET /bots/:id` for status.

## Engine contract

Every engine implements `MeetingBotEngine` (`src/engines/engine.ts`):
`isAvailable()`, `join(meeting)`, `leave(session)`. The orchestrator is
engine-agnostic, so adding Zoom/Teams later is a matter of adding an engine.

- **VexaEngine** — `POST /bots`, `DELETE /bots/{platform}/{id}` against
  `VEXA_BASE_URL`, authenticated with `X-API-Key`. Available when `VEXA_API_KEY`
  is set.
- **PlaywrightEngine** — drives Chromium with a persistent Google profile.
  Defensive, timeout-guarded clicks for the unstable Meet join UI (mic/cam off,
  Join / Ask to join). Available when fallback is enabled and a profile exists.

## Authentication

Persistent Google login lives in a Chromium user-data directory
(`GOOGLE_SESSION_DIR`), populated once via `npm run login`. We use a real
profile rather than serialized cookies because Google's auth is multi-cookie and
device-bound; a profile survives token refreshes. See `src/auth/googleAuth.ts`.

## State

Sessions are kept in memory (`SessionStore`). Fine for a single-process MVP;
swap for a database to support restarts or multiple instances.

## Known limitations

- Playwright join selectors track Google Meet's current UI and may need updates.
- Headless Chromium is often blocked by Meet — run with a display or `xvfb`.
- No persistence across restarts; no auth on the API itself yet.
