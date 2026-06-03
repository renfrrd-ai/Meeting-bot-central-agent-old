/**
 * Central configuration, loaded from environment variables.
 * Uses Node's built-in `--env-file` support (see npm scripts) plus process.env,
 * so there is no runtime dotenv dependency.
 */

function str(name: string, fallback: string): string {
  const v = process.env[name];
  return v === undefined || v === "" ? fallback : v;
}

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  return v.toLowerCase() === "true" || v === "1";
}

export const config = {
  port: num("PORT", 3000),

  vexa: {
    apiKey: str("VEXA_API_KEY", ""),
    baseUrl: str("VEXA_BASE_URL", "https://api.cloud.vexa.ai"),
  },

  fallback: {
    enabled: bool("FALLBACK_ENABLED", true),
    headless: bool("HEADLESS", false),
    sessionDir: str("GOOGLE_SESSION_DIR", "./data/google-profile"),
    botDisplayName: str("BOT_DISPLAY_NAME", "Meeting Bot"),
  },

  bot: {
    joinTimeoutMs: num("JOIN_TIMEOUT_MS", 60_000),
    maxRetries: num("MAX_RETRIES", 2),
  },
} as const;

export type Config = typeof config;
