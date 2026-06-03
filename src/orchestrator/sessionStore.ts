import { randomUUID } from "node:crypto";
import type { BotSession, NormalizedMeeting, SessionStatus, EngineName } from "../types.js";

/**
 * In-memory store of bot sessions. Sufficient for the MVP (single process);
 * swap for a database when multi-instance support is needed.
 */
export class SessionStore {
  private readonly sessions = new Map<string, BotSession>();

  create(meeting: NormalizedMeeting): BotSession {
    const now = new Date().toISOString();
    const session: BotSession = {
      id: randomUUID(),
      meeting,
      status: "pending",
      engine: null,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string): BotSession | undefined {
    return this.sessions.get(id);
  }

  list(): BotSession[] {
    return [...this.sessions.values()];
  }

  update(
    id: string,
    patch: Partial<Pick<BotSession, "status" | "engine" | "engineRef" | "error">>,
  ): BotSession | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    Object.assign(session, patch, { updatedAt: new Date().toISOString() });
    return session;
  }

  setStatus(id: string, status: SessionStatus, engine?: EngineName): void {
    this.update(id, engine ? { status, engine } : { status });
  }
}
