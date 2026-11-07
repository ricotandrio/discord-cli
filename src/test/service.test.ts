import assert from "node:assert/strict";
import test from "node:test";
import { MessagingService } from "../service.js";

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
  const result = await service.sendToChannel("2", "x".repeat(2001));
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, "invalid_input");
});
