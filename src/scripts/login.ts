/**
 * One-time Google login helper for the Playwright fallback engine.
 *
 * Opens a visible Chromium window using the persistent profile directory.
 * Log into the Google account the bot should use, then press Enter in the
 * terminal to save and close. The session is reused on every subsequent run.
 *
 * Usage: npm run login
 */
import { chromium } from "playwright";
import { config } from "../config.js";
import { googleAuth } from "../auth/googleAuth.js";

async function main(): Promise<void> {
  const profileDir = googleAuth.profileDir();
  console.log(`Opening Chromium with profile: ${profileDir}`);

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("https://accounts.google.com/");

  console.log(
    `\nLog into the Google account "${config.fallback.botDisplayName}" should use.\n` +
      "When done, press Enter here to save the session and exit.\n",
  );

  await waitForEnter();
  await context.close();
  console.log("Session saved. The bot will reuse this login.");
  process.exit(0);
}

function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => resolve());
  });
}

main().catch((err) => {
  console.error("Login helper failed:", err);
  process.exit(1);
});
