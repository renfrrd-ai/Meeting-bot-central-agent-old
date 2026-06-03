/** Shared domain types. */

export type Platform = "google_meet";

/** A validated, normalized meeting reference derived from a raw Meet URL. */
export interface NormalizedMeeting {
  platform: Platform;
  /** e.g. "abc-defg-hij" — Vexa's `native_meeting_id`. */
  nativeMeetingId: string;
  /** Canonical URL, e.g. "https://meet.google.com/abc-defg-hij". */
  url: string;
}

export type SessionStatus =
  | "pending" // accepted, not yet joined
  | "joining" // engine is actively joining
  | "active" // bot is in the meeting
  | "ended" // meeting finished or bot left
  | "failed"; // all engines failed

export type EngineName = "vexa" | "playwright";

/** A bot session tracked by the orchestrator. */
export interface BotSession {
  id: string;
  meeting: NormalizedMeeting;
  status: SessionStatus;
  /** Which engine currently owns (or last owned) the session. */
  engine: EngineName | null;
  /** Engine-specific handle, e.g. Vexa bot id. Opaque to the orchestrator. */
  engineRef?: string;
  createdAt: string;
  updatedAt: string;
  error?: string;
}
