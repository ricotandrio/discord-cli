#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { readBotToken, removeBotToken, saveBotToken } from "./config.js";
import {
  checkBotToken,
  contentIsValid,
  DiscordApiTransport,
  isId,
  MessagingService,
  threadOptionsAreValid,
} from "./service.js";
import type { Result } from "./types.js";
import { DomainArgs, HttpMethod } from "./map.js";

const EXIT_CODES: Record<string, number> = {
  usage_error: 2,
  invalid_input: 2,
  auth_error: 3,
  permission_error: 4,
  not_found: 5,
  rate_limited: 6,
};

const args = process.argv.slice(2);

if (args.includes("--version") || args.includes("-v") || args[0] === "version") {
  const version = await readVersion();
  if (args.includes("--json") || (args.includes("--format") && args[args.indexOf("--format") + 1] === "json")) {
    process.stdout.write(`${JSON.stringify({ ok: true, data: { version }, next_cursor: null })}\n`);
  } else {
    process.stdout.write(`${version}\n`);
  }
  process.exit(0);
}

const [domain, action] = args;

if (domain === DomainArgs.Auth) {
  await handleAuth(action);
  process.exit(0);
}

if (!(Object.values(DomainArgs) as string[]).includes(domain ?? "")) {
  fail("usage_error", "Expected auth, message, thread, channel, or search command");
}

const flags = parseFlags(args.slice(2));
const dryRun = flags["dry-run"] === "true";
if (dryRun && !isWriteCommand(domain, action)) {
  fail("usage_error", "--dry-run is only supported for write commands");
}

if (dryRun) {
  validateWriteFlags(domain, action, flags);
  const preview = previewWrite(domain, action, flags);
  process.stdout.write(`${JSON.stringify({ ok: true, data: preview, next_cursor: null })}\n`);
  process.exit(0);
}

const token = await readBotToken();
if (!token) fail("auth_error", "Bot token was not found in ~/discord-cli.json");

const service = new MessagingService(new DiscordApiTransport(token));

let result: Result<unknown>;
if (domain === DomainArgs.Message && ["send", "reply"].includes(action ?? "")) {
  const content = required(flags, "content");
  if (action === "send") {
    result = await service.sendToChannel(required(flags, "channel-id"), content);
  } else {
    result = await service.replyToMessage(required(flags, "channel-id"), required(flags, "message-id"), content);
  }
} else if (domain === DomainArgs.Thread && ["send", "reply"].includes(action ?? "")) {
  const content = required(flags, "content");
  if (action === "send") {
    result = await service.sendToThread(required(flags, "thread-id"), content);
  } else {
    result = await service.replyInThread(required(flags, "thread-id"), required(flags, "message-id"), content);
  }
} else if (domain === DomainArgs.Channel && action === "messages") {
  result = await service.listMessages(required(flags, "channel-id"), queryFlags(flags));
} else if (domain === DomainArgs.Thread && action === "messages") {
  result = await service.listMessages(required(flags, "thread-id"), queryFlags(flags));
} else if (domain === DomainArgs.Message && action === "get") {
  result = await service.getMessage(required(flags, "channel-id"), required(flags, "message-id"));
} else if (domain === DomainArgs.Search && action === "messages") {
  result = await service.searchMessages();
} else if (domain === DomainArgs.Thread && action === "list-active") {
  result = await service.listActiveThreads(required(flags, "channel-id"));
} else if (domain === DomainArgs.Thread && action === "get") {
  result = await service.getThread(required(flags, "thread-id"));
} else if (domain === DomainArgs.Thread && action === "create-from-message") {
  result = await service.createThreadFromMessage(required(flags, "channel-id"), required(flags, "message-id"), threadOptions(flags));
} else if (domain === DomainArgs.Thread && action === "create") {
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

async function handleAuth(action: string | undefined): Promise<void> {
  if (action === "login") {
    if (!process.stdin.isTTY) fail("usage_error", "auth login requires an interactive terminal");
    let token: string;
    try {
      token = await promptHidden("Discord bot token: ");
    } catch {
      fail("invalid_input", "Credential entry was cancelled");
    }
    if (!token) fail("invalid_input", "A non-empty Discord bot token is required");
    const health = await checkBotToken(token);
    if (!health.ok) {
      fail("auth_error", "Discord rejected the bot token");
    }
    try {
      await saveBotToken(token);
    } catch {
      fail("auth_error", "Could not save credentials to ~/discord-cli.json");
    }
    process.stdout.write(JSON.stringify({ ok: true, data: { authenticated: true }, next_cursor: null }) + "\n");
    return;
  }
  if (action === "status") {
    const token = await readBotToken();
    const health = token ? await checkBotToken(token) : undefined;
    process.stdout.write(
      JSON.stringify({
        ok: true,
        data: {
          authenticated: Boolean(token),
          healthy: health?.ok ?? false,
          ...(health && !health.ok ? { error_code: health.error.code } : {}),
        },
        next_cursor: null,
      }) + "\n",
    );
    return;
  }
  if (action === "logout") {
    try {
      const removed = await removeBotToken();
      process.stdout.write(
        JSON.stringify({ ok: true, data: { authenticated: false, removed }, next_cursor: null }) + "\n",
      );
    } catch {
      fail("auth_error", "Could not remove credentials from ~/discord-cli.json");
    }
    return;
  }
  fail("usage_error", "Expected auth login, auth status, or auth logout");
}

function promptHidden(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    const output = process.stderr;
    let value = "";
    const onData = (chunk: string): void => {
      for (const character of chunk) {
        if (character === "\u0003") {
          cleanup();
          reject(new Error("prompt_cancelled"));
        } else if (character === "\r" || character === "\n") {
          cleanup();
          output.write("\n");
          resolve(value);
        } else if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
        } else if (character >= " ") {
          value += character;
        }
      }
    };
    const cleanup = (): void => {
      input.off("data", onData);
      input.setRawMode?.(false);
      input.pause();
    };
    output.write(prompt);
    input.setEncoding("utf8");
    input.setRawMode?.(true);
    input.resume();
    input.on("data", onData);
  });
}

function isWriteCommand(domain: string | undefined, action: string | undefined): boolean {
  return (
    (domain === DomainArgs.Message && ["send", "reply"].includes(action ?? "")) ||
    (domain === DomainArgs.Thread && ["send", "reply", "create", "create-from-message"].includes(action ?? ""))
  );
}

function validateWriteFlags(
  domain: string | undefined,
  action: string | undefined,
  flags: Record<string, string>,
): void {
  if (domain === DomainArgs.Message && action === "send") {
    validateIdFlag(flags, "channel-id");
    validateContentFlag(flags);
    return;
  }
  if (domain === DomainArgs.Message && action === "reply") {
    validateIdFlag(flags, "channel-id");
    validateIdFlag(flags, "message-id");
    validateContentFlag(flags);
    return;
  }
  if (domain === DomainArgs.Thread && action === "send") {
    validateIdFlag(flags, "thread-id");
    validateContentFlag(flags);
    return;
  }
  if (domain === DomainArgs.Thread && action === "reply") {
    validateIdFlag(flags, "thread-id");
    validateIdFlag(flags, "message-id");
    validateContentFlag(flags);
    return;
  }
  if (domain === DomainArgs.Thread && action === "create-from-message") {
    validateIdFlag(flags, "channel-id");
    validateIdFlag(flags, "message-id");
    validateThreadFlags(flags);
    return;
  }
  if (domain === DomainArgs.Thread && action === "create") {
    validateIdFlag(flags, "channel-id");
    validateThreadFlags(flags);
    return;
  }
  fail("usage_error", "Unsupported write command");
}

function validateIdFlag(flags: Record<string, string>, name: string): void {
  const value = required(flags, name);
  if (!isId(value)) fail("invalid_input", `--${name} must be a numeric Discord ID`);
}

function validateContentFlag(flags: Record<string, string>): void {
  const content = required(flags, "content");
  if (!contentIsValid(content)) {
    fail("invalid_input", "--content must be between 1 and 2000 characters");
  }
}

function validateThreadFlags(flags: Record<string, string>): void {
  const options = threadOptions(flags);
  if (!threadOptionsAreValid(options)) {
    fail("invalid_input", "Invalid thread options");
  }
}

function previewWrite(
  domain: string | undefined,
  action: string | undefined,
  flags: Record<string, string>,
): Record<string, unknown> {
  if (domain === DomainArgs.Message && action === "send") {
    const channelId = required(flags, "channel-id");
    return {
      dry_run: true,
      method: HttpMethod.Post,
      path: `/channels/${channelId}/messages`,
      body: messageBody(required(flags, "content")),
    };
  }

  if (domain === DomainArgs.Message && action === "reply") {
    const channelId = required(flags, "channel-id");
    return {
      dry_run: true,
      method: HttpMethod.Post,
      path: `/channels/${channelId}/messages`,
      body: messageBody(required(flags, "content"), channelId, required(flags, "message-id")),
    };
  }
  if (domain === DomainArgs.Thread && action === "send") {
    const threadId = required(flags, "thread-id");
    return {
      dry_run: true,
      method: HttpMethod.Post,
      path: `/channels/${threadId}/messages`,
      body: messageBody(required(flags, "content")),
    };
  }
  if (domain === DomainArgs.Thread && action === "reply") {
    const threadId = required(flags, "thread-id");
    return {
      dry_run: true,
      method: HttpMethod.Post,
      path: `/channels/${threadId}/messages`,
      body: messageBody(required(flags, "content"), threadId, required(flags, "message-id")),
    };
  }
  if (domain === DomainArgs.Thread && action === "create-from-message") {
    const channelId = required(flags, "channel-id");
    return {
      dry_run: true,
      method: HttpMethod.Post,
      path: `/channels/${channelId}/messages/${required(flags, "message-id")}/threads`,
      body: threadOptions(flags),
    };
  }
  if (domain === DomainArgs.Thread && action === "create") {
    const channelId = required(flags, "channel-id");
    return {
      dry_run: true,
      method: HttpMethod.Post,
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

async function readVersion(): Promise<string> {
  try {
    const pkgUrl = new URL("../package.json", import.meta.url);
    const pkg = JSON.parse(await readFile(pkgUrl, "utf8")) as { version?: unknown };
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}
