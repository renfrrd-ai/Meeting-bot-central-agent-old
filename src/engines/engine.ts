import type { BotSession, NormalizedMeeting, EngineName } from "../types.js";

/** Result of an engine attempting to join a meeting. */
export interface JoinResult {
  /** Engine-specific handle (e.g. Vexa bot id), stored on the session. */
  engineRef?: string;
}

/**
 * A meeting bot engine. The orchestrator treats engines uniformly and falls
 * back from one to the next when `join` throws.
 */
export interface MeetingBotEngine {
  readonly name: EngineName;

  /** Whether this engine is configured and usable right now. */
  isAvailable(): boolean;

  /** Join the meeting. Resolve once the bot is in (or admitted-pending). */
  join(meeting: NormalizedMeeting): Promise<JoinResult>;

  /** Best-effort removal of the bot from the meeting. */
  leave(session: BotSession): Promise<void>;
}
