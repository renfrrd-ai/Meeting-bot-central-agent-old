import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { normalizeMeetUrl, InvalidMeetUrlError } from "../utils/meetUrl.js";
import type { BotOrchestrator } from "../orchestrator/botOrchestrator.js";
import { logger } from "../logger.js";

const joinSchema = z.object({
  url: z.string().min(1, "url is required"),
});

export function createRoutes(orchestrator: BotOrchestrator): Router {
  const router = Router();

  router.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // Trigger a bot to join a meeting.
  router.post("/bots", (req: Request, res: Response) => {
    const parsed = joinSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request" });
      return;
    }

    let meeting;
    try {
      meeting = normalizeMeetUrl(parsed.data.url);
    } catch (err) {
      if (err instanceof InvalidMeetUrlError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }

    const session = orchestrator.startJoin(meeting);
    logger.info("Join requested", { sessionId: session.id, url: meeting.url });
    res.status(202).json(session);
  });

  // Check session status.
  router.get("/bots/:id", (req: Request, res: Response) => {
    const session = orchestrator.getSession(req.params.id as string);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json(session);
  });

  // List all sessions.
  router.get("/bots", (_req: Request, res: Response) => {
    res.json({ sessions: orchestrator.listSessions() });
  });

  // Remove the bot from a meeting.
  router.delete("/bots/:id", async (req: Request, res: Response) => {
    const session = orchestrator.getSession(req.params.id as string);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    await orchestrator.leave(session);
    res.json(orchestrator.getSession(session.id));
  });

  return router;
}
