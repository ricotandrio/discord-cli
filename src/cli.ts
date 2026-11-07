import { readBotToken } from "./config.js";
import { DiscordApiTransport, MessagingService } from "./service.js";
import type { Result } from "./types.js";

const EXIT_CODES: Record<string, number> = {
  invalid_input: 2,
  auth_error: 3,
  permission_error: 4,
  not_found: 5,
  rate_limited: 6,
};

const args = process.argv.slice(2);
const [domain, action] = args;

if (domain !== "message" && domain !== "thread") {
  fail("usage_error", "Expected message or thread command");
}

const flags = parseFlags(args.slice(2));
const token = await readBotToken();
if (!token) fail("auth_error", "Bot token was not found in ~/mcp.json");

const service = new MessagingService(new DiscordApiTransport(token));
const content = flags.content;
if (typeof content !== "string") fail("invalid_input", "--content is required");

let result: Result<unknown>;
if (domain === "message" && action === "send") {
  result = await service.sendToChannel(required(flags, "channel-id"), content);
} else if (domain === "message" && action === "reply") {
  result = await service.replyToMessage(required(flags, "channel-id"), required(flags, "message-id"), content);
} else if (domain === "thread" && action === "send") {
  result = await service.sendToThread(required(flags, "thread-id"), content);
} else if (domain === "thread" && action === "reply") {
  result = await service.replyInThread(required(flags, "thread-id"), required(flags, "message-id"), content);
} else {
  fail("usage_error", "Unsupported messaging command");
}

if (result.ok) {
  process.stdout.write(`${JSON.stringify(result)}\n`);
} else {
  fail(result.error.code, result.error.message, result.error.details);
}

function parseFlags(values: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) fail("usage_error", `Invalid flag: ${value}`);
    const name = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) fail("usage_error", `Missing value for --${name}`);
    parsed[name] = next;
    index += 1;
  }
  return parsed;
}

function required(flags: Record<string, string>, name: string): string {
  const value = flags[name];
  if (!value) fail("invalid_input", `--${name} is required`);
  return value;
}

function fail(code: string, message: string, details?: Record<string, unknown>): never {
  process.stdout.write(`${JSON.stringify({ ok: false, error: { code, message, ...(details ? { details } : {}) } })}\n`);
  process.exit(EXIT_CODES[code] ?? 1);
}
