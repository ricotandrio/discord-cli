import assert from "node:assert/strict";
import test from "node:test";
import { DiscordApiTransport, MessagingService } from "../service.js";

test("sends a channel message with safe mentions", async () => {
  let request: RequestInit | undefined;
  const service = new MessagingService({
    request: async <T>(_path: string, init: RequestInit): Promise<T> => {
      request = init;
      return { id: "1", channel_id: "2", content: "hello" } as T;
    },
  });
  const result = await service.sendToChannel("2", "hello");
  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(String(request?.body)), {
    content: "hello",
    allowed_mentions: { parse: [] },
  });
});

test("creates a message reference when replying", async () => {
  let request: RequestInit | undefined;
  const service = new MessagingService({
    request: async <T>(_path: string, init: RequestInit): Promise<T> => {
      request = init;
      return { id: "1", channel_id: "2", content: "reply" } as T;
    },
  });
  await service.replyToMessage("2", "3", "reply");
  assert.deepEqual(JSON.parse(String(request?.body)).message_reference, {
    message_id: "3",
    channel_id: "2",
  });
});

test("rejects content above Discord's documented limit", async () => {
  const service = new MessagingService({
    request: async <T>(): Promise<T> => ({}) as T,
  });

  test("normalizes rejected send requests", async () => {
    const service = new MessagingService({
      request: async <T>(): Promise<T> => {
        throw { status: 403, code: "discord_api_error", message: "Forbidden" };
      },
    });
    const result = await service.sendToChannel("2", "hello");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, "permission_error");
  });

  test("rejects path-injection IDs", async () => {
    const service = new MessagingService({
      request: async <T>(): Promise<T> => ({}) as T,
    });
    const result = await service.sendToChannel("2/messages?x=1", "hello");
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, "invalid_input");
  });

  test("preserves JSON retry timing and global rate-limit metadata", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ message: "Slow down", retry_after: 1.5, global: true }), {
        status: 429,
        headers: { "content-type": "application/json", "x-ratelimit-scope": "global" },
      });
    try {
      await assert.rejects(
        () => new DiscordApiTransport("token").request("/channels/2/messages", { method: "GET" }),
        (error: { code?: string; details?: Record<string, unknown> }) => {
          assert.equal(error.code, "rate_limited");
          assert.deepEqual(error.details, { retry_after: 1.5, scope: "global", global: true });
          return true;
        },
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
  const result = await service.sendToChannel("2", "x".repeat(2001));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "invalid_input");
});

test("reads paginated channel messages", async () => {
  let path = "";
  const service = new MessagingService({
    request: async <T>(requestPath: string): Promise<T> => {
      path = requestPath;
      return [{ id: "last", channel_id: "2" }] as T;
    },
  });
  const result = await service.listMessages("2", { limit: "10", before: "20" });
  assert.equal(result.ok, true);
  assert.equal(path, "/channels/2/messages?limit=10&before=20");
  if (result.ok) assert.equal(result.next_cursor, "last");
});

test("reports bot message search as unsupported", async () => {
  const service = new MessagingService({ request: async <T>(): Promise<T> => ({}) as T });
  const result = await service.searchMessages();
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "unsupported");
});

test("creates a thread from a message", async () => {
  let path = "";
  let body: unknown;
  const service = new MessagingService({
    request: async <T>(requestPath: string, init: RequestInit): Promise<T> => {
      path = requestPath;
      body = JSON.parse(String(init.body));
      return { id: "thread" } as T;
    },
  });
  const result = await service.createThreadFromMessage("2", "3", { name: "Discussion" });
  assert.equal(result.ok, true);
  assert.equal(path, "/channels/2/messages/3/threads");
  assert.deepEqual(body, { name: "Discussion" });
});
