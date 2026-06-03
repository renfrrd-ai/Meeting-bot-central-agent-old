import { config } from "./config.js";
import { logger } from "./logger.js";
import { createServer } from "./api/server.js";
import { BotOrchestrator } from "./orchestrator/botOrchestrator.js";
import { SessionStore } from "./orchestrator/sessionStore.js";
import { VexaEngine } from "./engines/vexaEngine.js";
import { PlaywrightEngine } from "./engines/playwrightEngine.js";

function main(): void {
  const store = new SessionStore();
  const playwright = new PlaywrightEngine();
  // Engines are tried in order: Vexa first, Playwright as fallback.
  const orchestrator = new BotOrchestrator([new VexaEngine(), playwright], store);

  const app = createServer(orchestrator);
  const server = app.listen(config.port, () => {
    logger.info("Meeting bot API listening", { port: config.port });
  });

  const shutdown = (signal: string) => {
    logger.info("Shutting down", { signal });
    server.close(() => {
      void playwright.shutdown().finally(() => process.exit(0));
    });
    // Force-exit if cleanup hangs.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main();
