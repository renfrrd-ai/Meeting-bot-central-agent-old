# Meeting-bot-central-agent

A meeting bot that automatically joins Google Meet calls using [Vexa.ai](https://vexa.ai),
with a Playwright browser-automation fallback.

## Quick start

```bash
npm install
npx playwright install chromium     # only needed for the fallback engine
cp .env.example .env                # then fill in VEXA_API_KEY

npm run dev                         # start the API on http://localhost:3000
```

Trigger a join:

```bash
curl -X POST http://localhost:3000/bots \
  -H 'Content-Type: application/json' \
  -d '{ "url": "https://meet.google.com/abc-defg-hij" }'
```

To use the fallback engine, log the bot into Google once:

```bash
npm run login
```

## Docs

- [PRD](docs/PRD.md) — product requirements
- [Architecture](docs/ARCHITECTURE.md) — how it fits together
- [API](docs/API.md) — endpoint reference

## Scripts

| Script              | Purpose                          |
| ------------------- | -------------------------------- |
| `npm run dev`       | Run the API with hot reload      |
| `npm run build`     | Type-check and compile to `dist` |
| `npm start`         | Run the compiled server          |
| `npm test`          | Run unit tests (Vitest)          |
| `npm run typecheck` | Type-check only                  |
| `npm run login`     | One-time Google login for fallback |
