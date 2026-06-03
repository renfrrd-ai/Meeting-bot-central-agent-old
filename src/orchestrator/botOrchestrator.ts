import { config } from "../config.js";
import { logger } from "../logger.js";
import type { MeetingBotEngine } from "../engines/engine.js";
import type { BotSession, NormalizedMeeting } from "../types.js";
import { SessionStore } from "./sessionStore.js";

/**
 * Coordinates joining a meeting: creates a session, then tries each configured
 * engine in priority order (Vexa first, Playwright fallback), with retries.
 *
 * Engines are tried in array order; the first available one that succeeds wins.
 */
export class BotOrchestrator {
  constructor(
    private readonly engines: MeetingBotEngine[],
    private readonly store: SessionStore,
  ) {}

  /** Create a session and kick off the join asynchronously. */
  startJoin(meeting: NormalizedMeeting): BotSession {
    const session = this.store.create(meeting);
    // Fire-and-forget: the caller gets an immediate session id and polls status.
    void this.join(session);
    return session;
  }

  getSession(id: string): BotSession | undefined {
    return this.store.get(id);
  }

  listSessions(): BotSession[] {
    return this.store.list();
  }

  async leave(session: BotSession): Promise<void> {
    const engine = this.engines.find((e) => e.name === session.engine);
    if (engine) {
      await engine.leave(session).catch((err) => {
        logger.warn("Engine leave failed", { sessionId: session.id, error: String(err) });
      });
    }
    this.store.setStatus(session.id, "ended");
  }

  private async join(session: BotSession): Promise<void> {
    const available = this.engines.filter((e) => e.isAvailable());
    if (available.length === 0) {
      logger.error("No engines available to join", { sessionId: session.id });
      this.store.update(session.id, { status: "failed", error: "No engine configured" });
      return;
    }

    this.store.setStatus(session.id, "joining");

    for (const engine of available) {
      const ok = await this.tryEngineWithRetries(engine, session);
      if (ok) {
        this.store.setStatus(session.id, "active", engine.name);
        logger.info("Bot joined meeting", {
          sessionId: session.id,
          engine: engine.name,
          nativeMeetingId: session.meeting.nativeMeetingId,
        });
        return;
      }
      logger.warn("Engine exhausted, trying next", {
        sessionId: session.id,
        engine: engine.name,
      });
    }

    this.store.update(session.id, {
      status: "failed",
      error: "All engines failed to join the meeting",
    });
    logger.error("All engines failed", { sessionId: session.id });
  }

  private async tryEngineWithRetries(
    engine: MeetingBotEngine,
    session: BotSession,
  ): Promise<boolean> {
    const attempts = Math.max(1, config.bot.maxRetries + 1);
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const result = await engine.join(session.meeting);
        this.store.update(session.id, {
          engine: engine.name,
          engineRef: result.engineRef,
        });
        return true;
      } catch (err) {
        logger.warn("Engine join attempt failed", {
          sessionId: session.id,
          engine: engine.name,
          attempt,
          attempts,
          error: String(err),
        });
        if (attempt < attempts) {
          await delay(backoffMs(attempt));
        }
      }
    }
    return false;
  }
}

function backoffMs(attempt: number): number {
  return Math.min(1_000 * 2 ** (attempt - 1), 10_000);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
