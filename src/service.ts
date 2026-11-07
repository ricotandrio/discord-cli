import type { ApiError, DiscordMessage, MessagePayload, Result } from "./types.js";

const API_BASE = "https://discord.com/api/v10";

export interface DiscordTransport {
  request<T>(path: string, init: RequestInit): Promise<T>;
}

export class DiscordApiTransport implements DiscordTransport {
  public constructor(private readonly token: string) {}

  public async request<T>(path: string, init: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        authorization: `Bot ${this.token}`,
        "content-type": "application/json",
        ...init.headers,
      },
    });
    if (response.ok) {
      return (await response.json()) as T;
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
    const retryAfter = response.headers.get("retry-after");
    const details: Record<string, unknown> = {};
    if (retryAfter !== null) details.retry_after = retryAfter;
    const scope = response.headers.get("x-ratelimit-scope");
    if (scope !== null) details.scope = scope;
    const error: ApiError = {
      status: response.status,
      code: response.status === 429 ? "rate_limited" : "discord_api_error",
      message: typeof body.message === "string" ? body.message : response.statusText,
      ...(Object.keys(details).length > 0 ? { details } : {}),
    };
    throw error;
  }
}

export class MessagingService {
  public constructor(private readonly transport: DiscordTransport) {}

  public sendToChannel(channelId: string, content: string): Promise<Result<DiscordMessage>> {
    return this.send(channelId, { content, allowed_mentions: { parse: [] } });
  }

  public replyToMessage(
    channelId: string,
    messageId: string,
    content: string,
  ): Promise<Result<DiscordMessage>> {
    return this.send(channelId, {
      content,
      allowed_mentions: { parse: [] },
      message_reference: { message_id: messageId, channel_id: channelId },
    });
  }

  public sendToThread(threadId: string, content: string): Promise<Result<DiscordMessage>> {
    return this.send(threadId, { content, allowed_mentions: { parse: [] } });
  }

  public replyInThread(
    threadId: string,
    messageId: string,
    content: string,
  ): Promise<Result<DiscordMessage>> {
    return this.send(threadId, {
      content,
      allowed_mentions: { parse: [] },
      message_reference: { message_id: messageId, channel_id: threadId },
    });
  }

  private async send(channelId: string, payload: MessagePayload): Promise<Result<DiscordMessage>> {
    if (!channelId || !contentIsValid(payload.content)) {
      return {
        ok: false,
        error: { status: 0, code: "invalid_input", message: "channel_id and content are required" },
      };
    }
    try {
      const data = await this.transport.request<DiscordMessage>(`/channels/${channelId}/messages`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return { ok: true, data, next_cursor: null };
    } catch (error) {
      return { ok: false, error: normalizeError(error) };
    }
  }
}

function contentIsValid(content: string): boolean {
  return content.length > 0 && content.length <= 2000;
}

function normalizeError(error: unknown): ApiError {
  if (isApiError(error)) return error;
  return { status: 0, code: "api_error", message: "Discord request failed" };
}

function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "status" in error && "code" in error;
}
