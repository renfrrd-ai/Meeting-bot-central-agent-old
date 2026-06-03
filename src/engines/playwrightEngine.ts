import { chromium, type BrowserContext, type Page } from "playwright";
import { config } from "../config.js";
import { logger } from "../logger.js";
import { googleAuth } from "../auth/googleAuth.js";
import type { BotSession, NormalizedMeeting } from "../types.js";
import type { JoinResult, MeetingBotEngine } from "./engine.js";

/**
 * Fallback engine: drives a real Chromium instance to join the meeting using a
 * persistent Google profile.
 *
 * Google Meet's UI is unstable, so the join flow is intentionally defensive:
 * every interaction is best-effort and guarded by timeouts. We keep one browser
 * context per process and one page per active session.
 */
export class PlaywrightEngine implements MeetingBotEngine {
  readonly name = "playwright" as const;

  private context: BrowserContext | null = null;
  private readonly pages = new Map<string, Page>();

  isAvailable(): boolean {
    return config.fallback.enabled && googleAuth.hasSession();
  }

  async join(meeting: NormalizedMeeting): Promise<JoinResult> {
    const context = await this.getContext();
    const page = await context.newPage();
    this.pages.set(meeting.nativeMeetingId, page);

    try {
      logger.info("Playwright joining meeting", {
        nativeMeetingId: meeting.nativeMeetingId,
      });
      await page.goto(meeting.url, {
        waitUntil: "load",
        timeout: config.bot.joinTimeoutMs,
      });

      await this.dismissDeviceCheck(page);
      await this.turnOffMicAndCamera(page);
      await this.maybeSetDisplayName(page);
      await this.clickJoin(page);

      logger.info("Playwright join requested", {
        nativeMeetingId: meeting.nativeMeetingId,
      });
      return { engineRef: meeting.nativeMeetingId };
    } catch (err) {
      this.pages.delete(meeting.nativeMeetingId);
      await page.close().catch(() => {});
      throw err;
    }
  }

  async leave(session: BotSession): Promise<void> {
    const page = this.pages.get(session.meeting.nativeMeetingId);
    if (!page) return;
    this.pages.delete(session.meeting.nativeMeetingId);
    await page.close().catch(() => {});
    if (this.pages.size === 0) {
      await this.context?.close().catch(() => {});
      this.context = null;
    }
  }

  private async getContext(): Promise<BrowserContext> {
    if (this.context) return this.context;
    // Persistent context reuses the logged-in Google profile on disk.
    this.context = await chromium.launchPersistentContext(googleAuth.profileDir(), {
      headless: config.fallback.headless,
      args: [
        "--use-fake-ui-for-media-stream", // auto-accept mic/cam permission prompts
        "--disable-blink-features=AutomationControlled",
      ],
      permissions: ["camera", "microphone"],
    });
    return this.context;
  }

  /** Some sessions show a "Your devices are ready" / continue gate first. */
  private async dismissDeviceCheck(page: Page): Promise<void> {
    await clickFirst(page, ['button:has-text("Continue")'], 3_000);
  }

  private async turnOffMicAndCamera(page: Page): Promise<void> {
    // Toggle buttons expose their state via aria-label; only click when "on".
    await clickFirst(
      page,
      ['[aria-label*="Turn off microphone"]', '[aria-label="Turn off microphone (⌘ + d)"]'],
      3_000,
    );
    await clickFirst(
      page,
      ['[aria-label*="Turn off camera"]', '[aria-label="Turn off camera (⌘ + e)"]'],
      3_000,
    );
  }

  /** Anonymous joins prompt for a name; signed-in bots usually skip this. */
  private async maybeSetDisplayName(page: Page): Promise<void> {
    const input = page.locator('input[placeholder*="name" i]').first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill(config.fallback.botDisplayName).catch(() => {});
    }
  }

  private async clickJoin(page: Page): Promise<void> {
    const clicked = await clickFirst(
      page,
      [
        'button:has-text("Join now")',
        'button:has-text("Ask to join")',
        '[aria-label="Join now"]',
        '[aria-label="Ask to join"]',
      ],
      config.bot.joinTimeoutMs,
    );
    if (!clicked) {
      throw new Error("Could not find a Join / Ask to join button");
    }
  }

  /** Close all pages and the browser. Called on graceful shutdown. */
  async shutdown(): Promise<void> {
    for (const page of this.pages.values()) await page.close().catch(() => {});
    this.pages.clear();
    await this.context?.close().catch(() => {});
    this.context = null;
  }
}

/**
 * Click the first selector that becomes visible within `timeoutMs`.
 * Returns true if something was clicked, false if none appeared.
 */
async function clickFirst(page: Page, selectors: string[], timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const selector of selectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible().catch(() => false)) {
        await el.click({ timeout: 2_000 }).catch(() => {});
        return true;
      }
    }
    await page.waitForTimeout(250);
  }
  return false;
}
