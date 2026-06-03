import { describe, it, expect } from "vitest";
import { normalizeMeetUrl, InvalidMeetUrlError } from "../src/utils/meetUrl.js";

describe("normalizeMeetUrl", () => {
  it("accepts a full https Meet URL", () => {
    const m = normalizeMeetUrl("https://meet.google.com/abc-defg-hij");
    expect(m.nativeMeetingId).toBe("abc-defg-hij");
    expect(m.url).toBe("https://meet.google.com/abc-defg-hij");
    expect(m.platform).toBe("google_meet");
  });

  it("strips query params", () => {
    const m = normalizeMeetUrl("https://meet.google.com/abc-defg-hij?authuser=0");
    expect(m.nativeMeetingId).toBe("abc-defg-hij");
  });

  it("accepts a bare host without scheme", () => {
    const m = normalizeMeetUrl("meet.google.com/abc-defg-hij");
    expect(m.nativeMeetingId).toBe("abc-defg-hij");
  });

  it("accepts a bare meeting code", () => {
    const m = normalizeMeetUrl("abc-defg-hij");
    expect(m.nativeMeetingId).toBe("abc-defg-hij");
  });

  it("lowercases the code", () => {
    const m = normalizeMeetUrl("https://meet.google.com/ABC-DEFG-HIJ");
    expect(m.nativeMeetingId).toBe("abc-defg-hij");
  });

  it("trims surrounding whitespace", () => {
    const m = normalizeMeetUrl("  https://meet.google.com/abc-defg-hij  ");
    expect(m.nativeMeetingId).toBe("abc-defg-hij");
  });

  it("rejects an empty string", () => {
    expect(() => normalizeMeetUrl("")).toThrow(InvalidMeetUrlError);
  });

  it("rejects a non-Meet host", () => {
    expect(() => normalizeMeetUrl("https://zoom.us/j/123456")).toThrow(InvalidMeetUrlError);
  });

  it("rejects a malformed meeting code", () => {
    expect(() => normalizeMeetUrl("https://meet.google.com/not-a-code")).toThrow(
      InvalidMeetUrlError,
    );
  });

  it("rejects a code with wrong segment lengths", () => {
    expect(() => normalizeMeetUrl("ab-defg-hij")).toThrow(InvalidMeetUrlError);
  });
});
