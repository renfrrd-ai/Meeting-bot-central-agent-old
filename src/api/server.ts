import express, { type Express, type NextFunction, type Request, type Response } from "express";
import { createRoutes } from "./routes.js";
import type { BotOrchestrator } from "../orchestrator/botOrchestrator.js";
import { logger } from "../logger.js";

export function createServer(orchestrator: BotOrchestrator): Express {
  const app = express();
  app.use(express.json());

  app.use("/", createRoutes(orchestrator));

  // 404 for unmatched routes.
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  // Centralized error handler.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error("Unhandled request error", { error: String(err) });
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
