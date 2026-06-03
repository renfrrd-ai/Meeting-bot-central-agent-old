import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "../config.js";

/**
 * Manages the persistent Chromium profile that keeps the Playwright fallback
 * bot logged into Google between runs.
 *
 * We use a persistent user-data directory (rather than serializing cookies)
 * because Google's login is multi-cookie and device-bound; a real profile
 * survives token refreshes far more reliably. Populate it once with
 * `npm run login`.
 */
export const googleAuth = {
  /** Absolute path to the Chromium user-data directory. */
  profileDir(): string {
    return resolve(config.fallback.sessionDir);
  },

  /** Whether a profile directory has been created (i.e. login was attempted). */
  hasSession(): boolean {
    return existsSync(this.profileDir());
  },
};
