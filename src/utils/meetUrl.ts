import type { NormalizedMeeting } from "../types.js";

/**
 * Google Meet meeting codes look like `abc-defg-hij`:
 * three lowercase letters, four, then three, separated by hyphens.
 */
const MEET_CODE = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;

export class InvalidMeetUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMeetUrlError";
  }
}

/**
 * Validate and normalize a Google Meet URL (or bare meeting code) into a
 * NormalizedMeeting. Throws InvalidMeetUrlError on anything we don't recognize.
 *
 * Accepts:
 *   - https://meet.google.com/abc-defg-hij
 *   - http://meet.google.com/abc-defg-hij?authuser=0
 *   - meet.google.com/abc-defg-hij
 *   - abc-defg-hij  (bare code)
 */
export function normalizeMeetUrl(input: string): NormalizedMeeting {
  const raw = input.trim();
  if (!raw) {
    throw new InvalidMeetUrlError("Meeting URL is empty");
  }

  const code = extractMeetingCode(raw);
  if (!MEET_CODE.test(code)) {
    throw new InvalidMeetUrlError(
      `"${input}" is not a valid Google Meet link or code (expected format abc-defg-hij)`,
    );
  }

  return {
    platform: "google_meet",
    nativeMeetingId: code,
    url: `https://meet.google.com/${code}`,
  };
}

function extractMeetingCode(raw: string): string {
  // Bare code, no host/scheme.
  if (!raw.includes("/") && !raw.includes(".")) {
    return raw.toLowerCase();
  }

  let parsed: URL;
  try {
    // Add a scheme if the user pasted a bare host like meet.google.com/...
    parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new InvalidMeetUrlError(`"${raw}" is not a parseable URL`);
  }

  if (parsed.hostname !== "meet.google.com") {
    throw new InvalidMeetUrlError(
      `Unsupported host "${parsed.hostname}" — only meet.google.com is supported`,
    );
  }

  // First non-empty path segment is the meeting code.
  const segment = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
  return segment.toLowerCase();
}
