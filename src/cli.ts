#!/usr/bin/env node

import { readBotToken } from "./config.js";
import { DiscordApiTransport, MessagingService } from "./service.js";
import type { Result } from "./types.js";

const EXIT_CODES: Record<string, number> = {
  usage_error: 2,
  invalid_input: 2,
  auth_error: 3,
  permission_error: 4,
  not_found: 5,
  rate_limited: 6,
};

const args = process.argv.slice(2);
const [domain, action] = args;

if (!["message", "thread", "channel", "search"].includes(domain ?? "")) {
  fail("usage_error", "Expected message, thread, channel, or search command");
}

const flags = parseFlags(args.slice(2));
const dryRun = flags["dry-run"] === "true";
if (dryRun && !isWriteCommand(domain, action)) {
  fail("usage_error", "--dry-run is only supported for write commands");
}

if (dryRun) {
  const preview = previewWrite(domain, action, flags);
  process.stdout.write(`${JSON.stringify({ ok: true, data: preview, next_cursor: null })}\n`);
  process.exit(0);
}

const token = await readBotToken();
if (!token) fail("auth_error", "Bot token was not found in ~/mcp.json");

const service = new MessagingService(new DiscordApiTransport(token));

let result: Result<unknown>;
if (domain === "message" && ["send", "reply"].includes(action ?? "")) {
  const content = required(flags, "content");
  if (action === "send") {
    result = await service.sendToChannel(required(flags, "channel-id"), content);
  } else {
    result = await service.replyToMessage(required(flags, "channel-id"), required(flags, "message-id"), content);
  }
} else if (domain === "thread" && ["send", "reply"].includes(action ?? "")) {
  const content = required(flags, "content");
  if (action === "send") {
    result = await service.sendToThread(required(flags, "thread-id"), content);
  } else {
    result = await service.replyInThread(required(flags, "thread-id"), required(flags, "message-id"), content);
  }
} else if (domain === "channel" && action === "messages") {
  result = await service.listMessages(required(flags, "channel-id"), queryFlags(flags));
} else if (domain === "thread" && action === "messages") {
  result = await service.listMessages(required(flags, "thread-id"), queryFlags(flags));
} else if (domain === "message" && action === "get") {
  result = await service.getMessage(required(flags, "channel-id"), required(flags, "message-id"));
} else if (domain === "search" && action === "messages") {
  result = await service.searchMessages();
} else if (domain === "thread" && action === "list-active") {
  result = await service.listActiveThreads(required(flags, "channel-id"));
} else if (domain === "thread" && action === "get") {
  result = await service.getThread(required(flags, "thread-id"));
} else if (domain === "thread" && action === "create-from-message") {
  result = await service.createThreadFromMessage(required(flags, "channel-id"), required(flags, "message-id"), threadOptions(flags));
} else if (domain === "thread" && action === "create") {
  result = await service.createThread(required(flags, "channel-id"), threadOptions(flags));
} else {
  fail("usage_error", "Unsupported Discord command");
}

if (result.ok) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
} else {
  fail(result.error.code, result.error.message, result.error.details);
}

function parseFlags(values: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  const booleanFlags = new Set(["dry-run"]);
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) fail("usage_error", `Invalid flag: ${value}`);
    const name = value.slice(2);
    const next = values[index + 1];
    if (booleanFlags.has(name) && (!next || next.startsWith("--"))) {
      parsed[name] = "true";
      continue;
    }
    if (!next || next.startsWith("--")) fail("usage_error", `Missing value for --${name}`);
    parsed[name] = next;
    index += 1;
  }
  return parsed;
}

function isWriteCommand(domain: string | undefined, action: string | undefined): boolean {
  return (
    (domain === "message" && ["send", "reply"].includes(action ?? "")) ||
    (domain === "thread" && ["send", "reply", "create", "create-from-message"].includes(action ?? ""))
  );
}

function previewWrite(
  domain: string | undefined,
  action: string | undefined,
  flags: Record<string, string>,
): Record<string, unknown> {
  if (domain === "message" && action === "send") {
    const channelId = required(flags, "channel-id");
    return {
      dry_run: true,
      method: "POST",
      path: `/channels/${channelId}/messages`,
      body: messageBody(required(flags, "content")),
    };
  }
  if (domain === "message" && action === "reply") {
    const channelId = required(flags, "channel-id");
    return {
      dry_run: true,
      method: "POST",
      path: `/channels/${channelId}/messages`,
      body: messageBody(required(flags, "content"), channelId, required(flags, "message-id")),
    };
  }
  if (domain === "thread" && action === "send") {
    const threadId = required(flags, "thread-id");
    return {
      dry_run: true,
      method: "POST",
      path: `/channels/${threadId}/messages`,
      body: messageBody(required(flags, "content")),
    };
  }
  if (domain === "thread" && action === "reply") {
    const threadId = required(flags, "thread-id");
    return {
      dry_run: true,
      method: "POST",
      path: `/channels/${threadId}/messages`,
      body: messageBody(required(flags, "content"), threadId, required(flags, "message-id")),
    };
  }
  if (domain === "thread" && action === "create-from-message") {
    const channelId = required(flags, "channel-id");
    return {
      dry_run: true,
      method: "POST",
      path: `/channels/${channelId}/messages/${required(flags, "message-id")}/threads`,
      body: threadOptions(flags),
    };
  }
  if (domain === "thread" && action === "create") {
    const channelId = required(flags, "channel-id");
    return {
      dry_run: true,
      method: "POST",
      path: `/channels/${channelId}/threads`,
      body: { type: 11, ...threadOptions(flags) },
    };
  }
  fail("usage_error", "Unsupported write command");
}

function messageBody(content: string, channelId?: string, messageId?: string): Record<string, unknown> {
  return {
    content,
    allowed_mentions: { parse: [] },
    ...(channelId && messageId
      ? { message_reference: { message_id: messageId, channel_id: channelId } }
      : {}),
  };
}

function required(flags: Record<string, string>, name: string): string {
  const value = flags[name];
  if (!value) fail("invalid_input", `--${name} is required`);
  return value;
}

function queryFlags(flags: Record<string, string>) {
  return {
    ...(flags.limit ? { limit: flags.limit } : {}),
    ...(flags.before ? { before: flags.before } : {}),
    ...(flags.after ? { after: flags.after } : {}),
    ...(flags.around ? { around: flags.around } : {}),
  };
}

function threadOptions(flags: Record<string, string>) {
  const name = required(flags, "name");
  return {
    name,
    ...(flags["auto-archive-duration"] ? { auto_archive_duration: flags["auto-archive-duration"] } : {}),
    ...(flags["rate-limit-per-user"] ? { rate_limit_per_user: flags["rate-limit-per-user"] } : {}),
    ...(flags.invitable ? { invitable: flags.invitable } : {}),
  };
}

function fail(code: string, message: string, details?: Record<string, unknown>): never {
  process.stdout.write(`${JSON.stringify({ ok: false, error: { code, message, ...(details ? { details } : {}) } })}\n`);
  process.exit(EXIT_CODES[code] ?? 1);
}
