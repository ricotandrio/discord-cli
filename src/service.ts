import type {
  ApiError,
  DiscordChannel,
  DiscordMessage,
  MessagePayload,
  MessageQuery,
  Result,
  ThreadCreateOptions,
} from "./types.js";

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

export async function checkBotToken(token: string): Promise<Result<true>> {
  try {
    await new DiscordApiTransport(token).request("/users/@me", { method: "GET" });
    return { ok: true, data: true, next_cursor: null };
  } catch (error) {
    return { ok: false, error: normalizeError(error) };
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

  public async listMessages(
    channelId: string,
    query: MessageQuery = {},
  ): Promise<Result<DiscordMessage[]>> {
    return this.getCollection<DiscordMessage[]>(`/channels/${channelId}/messages`, query, channelId);
  }

  public async getMessage(
    channelId: string,
    messageId: string,
  ): Promise<Result<DiscordMessage>> {
    if (!isId(channelId) || !isId(messageId)) {
      return { ok: false, error: { status: 0, code: "invalid_input", message: "channel_id and message_id are required" } };
    }
    return this.get<DiscordMessage>(`/channels/${channelId}/messages/${messageId}`);
  }

  public async searchMessages(): Promise<Result<never>> {
    return {
      ok: false,
      error: {
        status: 0,
        code: "unsupported",
        message: "Discord does not provide a general message-search endpoint for bots",
      },
    };
  }

  public async listActiveThreads(channelId: string): Promise<Result<Record<string, unknown>>> {
    if (!isId(channelId)) {
      return { ok: false, error: { status: 0, code: "invalid_input", message: "channel_id is required" } };
    }
    return this.get<Record<string, unknown>>(`/channels/${channelId}/threads/active`);
  }

  public async getThread(threadId: string): Promise<Result<DiscordChannel>> {
    if (!isId(threadId)) {
      return { ok: false, error: { status: 0, code: "invalid_input", message: "thread_id is required" } };
    }
    return this.get<DiscordChannel>(`/channels/${threadId}`);
  }

  public async createThreadFromMessage(
    channelId: string,
    messageId: string,
    options: ThreadCreateOptions,
  ): Promise<Result<DiscordChannel>> {
    if (!isId(channelId) || !isId(messageId) || !options.name) {
      return { ok: false, error: { status: 0, code: "invalid_input", message: "channel_id, message_id, and name are required" } };
    }
    return this.post<DiscordChannel>(
      `/channels/${channelId}/messages/${messageId}/threads`,
      threadOptions(options),
    );
  }

  public async createThread(
    channelId: string,
    options: ThreadCreateOptions,
  ): Promise<Result<DiscordChannel>> {
    if (!isId(channelId) || !options.name) {
      return { ok: false, error: { status: 0, code: "invalid_input", message: "channel_id and name are required" } };
    }
    return this.post<DiscordChannel>(`/channels/${channelId}/threads`, {
      type: 11,
      ...threadOptions(options),
    });
  }

  private async send(channelId: string, payload: MessagePayload): Promise<Result<DiscordMessage>> {
    if (!isId(channelId) || !contentIsValid(payload.content)) {
      return {
        ok: false,
        error: { status: 0, code: "invalid_input", message: "channel_id and content are required" },
      };
    }
    try {
      return this.post<DiscordMessage>(`/channels/${channelId}/messages`, payload);
    } catch (error) {
      return { ok: false, error: normalizeError(error) };
    }
  }

  private async get<T>(path: string): Promise<Result<T>> {
    try {
      const data = await this.transport.request<T>(path, { method: "GET" });
      return { ok: true, data, next_cursor: null };
    } catch (error) {
      return { ok: false, error: normalizeError(error) };
    }
  }

  private async post<T>(path: string, body: unknown): Promise<Result<T>> {
    try {
      const data = await this.transport.request<T>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return { ok: true, data, next_cursor: null };
    } catch (error) {
      return { ok: false, error: normalizeError(error) };
    }
  }

  private async getCollection<T>(
    path: string,
    query: MessageQuery,
    channelId: string,
  ): Promise<Result<T>> {
    if (!isId(channelId)) {
      return { ok: false, error: { status: 0, code: "invalid_input", message: "channel_id is required" } };
    }
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) params.set(key, value);
    }
    try {
      const data = await this.transport.request<T>(`${path}?${params.toString()}`, { method: "GET" });
      const values = Array.isArray(data) ? data : [];
      const next = values.length > 0 ? String((values[values.length - 1] as Record<string, unknown>).id ?? "") || null : null;
      return { ok: true, data, next_cursor: next };
    } catch (error) {
      return { ok: false, error: normalizeError(error) };
    }
  }
}

function contentIsValid(content: string): boolean {
  return content.length > 0 && content.length <= 2000;
}

function isId(value: string): boolean {
  return value.trim().length > 0;
}

function threadOptions(options: ThreadCreateOptions): Record<string, unknown> {
  return {
    name: options.name,
    ...(options.auto_archive_duration ? { auto_archive_duration: Number(options.auto_archive_duration) } : {}),
    ...(options.rate_limit_per_user ? { rate_limit_per_user: Number(options.rate_limit_per_user) } : {}),
    ...(options.invitable !== undefined ? { invitable: options.invitable === "true" } : {}),
  };
}

function normalizeError(error: unknown): ApiError {
  if (isApiError(error)) {
    const code =
      error.status === 401 ? "auth_error" :
      error.status === 403 ? "permission_error" :
      error.status === 404 ? "not_found" :
      error.status === 429 ? "rate_limited" : error.code;
    return { ...error, code };
  }
  return { status: 0, code: "api_error", message: "Discord request failed" };
}

function isApiError(error: unknown): error is ApiError {
  return typeof error === "object" && error !== null && "status" in error && "code" in error;
}
