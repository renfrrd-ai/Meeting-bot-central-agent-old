import { describe, it, expect, vi, beforeEach } from "vitest";
import { BotOrchestrator } from "../src/orchestrator/botOrchestrator.js";
import { SessionStore } from "../src/orchestrator/sessionStore.js";
import type { MeetingBotEngine, JoinResult } from "../src/engines/engine.js";
import type { NormalizedMeeting, EngineName } from "../src/types.js";

const MEETING: NormalizedMeeting = {
  platform: "google_meet",
  nativeMeetingId: "abc-defg-hij",
  url: "https://meet.google.com/abc-defg-hij",
};

/** Test double for an engine with configurable availability and behaviour. */
class FakeEngine implements MeetingBotEngine {
  join = vi.fn(async (): Promise<JoinResult> => ({ engineRef: `${this.name}-ref` }));
  leave = vi.fn(async (): Promise<void> => {});

  constructor(
    readonly name: EngineName,
    private available = true,
  ) {}

  isAvailable(): boolean {
    return this.available;
  }
}

/** Poll the session until it reaches a terminal status or times out. */
async function waitForStatus(
  orchestrator: BotOrchestrator,
  id: string,
  statuses: string[],
): Promise<void> {
  for (let i = 0; i < 100; i++) {
    const s = orchestrator.getSession(id);
    if (s && statuses.includes(s.status)) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("Timed out waiting for status");
}

describe("BotOrchestrator", () => {
  beforeEach(() => {
    // Speed up retry backoff in tests.
    vi.useRealTimers();
  });

  it("joins with the primary engine when it succeeds", async () => {
    const vexa = new FakeEngine("vexa");
    const playwright = new FakeEngine("playwright");
    const orchestrator = new BotOrchestrator([vexa, playwright], new SessionStore());

    const session = orchestrator.startJoin(MEETING);
    await waitForStatus(orchestrator, session.id, ["active", "failed"]);

    const final = orchestrator.getSession(session.id)!;
    expect(final.status).toBe("active");
    expect(final.engine).toBe("vexa");
    expect(vexa.join).toHaveBeenCalledTimes(1);
    expect(playwright.join).not.toHaveBeenCalled();
  });

  it("falls back to the secondary engine when the primary fails", async () => {
    const vexa = new FakeEngine("vexa");
    vexa.join.mockRejectedValue(new Error("vexa down"));
    const playwright = new FakeEngine("playwright");
    const orchestrator = new BotOrchestrator([vexa, playwright], new SessionStore());

    const session = orchestrator.startJoin(MEETING);
    await waitForStatus(orchestrator, session.id, ["active", "failed"]);

    const final = orchestrator.getSession(session.id)!;
    expect(final.status).toBe("active");
    expect(final.engine).toBe("playwright");
    expect(playwright.join).toHaveBeenCalledTimes(1);
  });

  it("skips unavailable engines", async () => {
    const vexa = new FakeEngine("vexa", false); // not configured
    const playwright = new FakeEngine("playwright");
    const orchestrator = new BotOrchestrator([vexa, playwright], new SessionStore());

    const session = orchestrator.startJoin(MEETING);
    await waitForStatus(orchestrator, session.id, ["active", "failed"]);

    const final = orchestrator.getSession(session.id)!;
    expect(final.status).toBe("active");
    expect(final.engine).toBe("playwright");
    expect(vexa.join).not.toHaveBeenCalled();
  });

  it("fails when no engine is available", async () => {
    const vexa = new FakeEngine("vexa", false);
    const playwright = new FakeEngine("playwright", false);
    const orchestrator = new BotOrchestrator([vexa, playwright], new SessionStore());

    const session = orchestrator.startJoin(MEETING);
    await waitForStatus(orchestrator, session.id, ["failed"]);

    expect(orchestrator.getSession(session.id)!.status).toBe("failed");
  });

  it("leaves a meeting via the owning engine", async () => {
    const vexa = new FakeEngine("vexa");
    const orchestrator = new BotOrchestrator([vexa], new SessionStore());

    const session = orchestrator.startJoin(MEETING);
    await waitForStatus(orchestrator, session.id, ["active"]);

    await orchestrator.leave(orchestrator.getSession(session.id)!);
    expect(vexa.leave).toHaveBeenCalledTimes(1);
    expect(orchestrator.getSession(session.id)!.status).toBe("ended");
  });
});
