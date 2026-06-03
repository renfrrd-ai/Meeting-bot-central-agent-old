import { config } from "../config.js";
import { logger } from "../logger.js";
import type { BotSession, NormalizedMeeting } from "../types.js";
import type { JoinResult, MeetingBotEngine } from "./engine.js";

/**
 * Primary engine: delegates joining to the Vexa.ai meeting bot API.
 *
 * API reference (https://vexa.ai/get-started):
 *   POST   /bots                                  { platform, native_meeting_id }
 *   DELETE /bots/{platform}/{native_meeting_id}   stop the bot
 * Auth via the `X-API-Key` header.
 */
export class VexaEngine implements MeetingBotEngine {
  readonly name = "vexa" as const;

  isAvailable(): boolean {
    return config.vexa.apiKey.length > 0;
  }

  async join(meeting: NormalizedMeeting): Promise<JoinResult> {
    const body = {
      platform: meeting.platform,
      native_meeting_id: meeting.nativeMeetingId,
    };

    const res = await this.request("POST", "/bots", body);
    if (!res.ok) {
      throw new Error(`Vexa join failed (${res.status}): ${await safeText(res)}`);
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string | number };
    const engineRef = data.id !== undefined ? String(data.id) : undefined;
    logger.info("Vexa bot dispatched", {
      nativeMeetingId: meeting.nativeMeetingId,
      botId: engineRef,
    });
    return { engineRef };
  }

  async leave(session: BotSession): Promise<void> {
    const { platform, nativeMeetingId } = session.meeting;
    const res = await this.request(
      "DELETE",
      `/bots/${platform}/${encodeURIComponent(nativeMeetingId)}`,
    );
    if (!res.ok && res.status !== 404) {
      throw new Error(`Vexa leave failed (${res.status}): ${await safeText(res)}`);
    }
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    const url = `${config.vexa.baseUrl.replace(/\/$/, "")}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.bot.joinTimeoutMs);
    try {
      return await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": config.vexa.apiKey,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return "<no body>";
  }
}
