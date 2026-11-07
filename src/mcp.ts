import { createInterface } from "node:readline";
import { readBotToken } from "./config.js";
import { DiscordApiTransport, MessagingService } from "./service.js";

const token = await readBotToken();
const service = token ? new MessagingService(new DiscordApiTransport(token)) : undefined;

const tools = [
  "message.send",
  "message.reply",
  "thread.send",
  "thread.reply",
  "channel.messages",
  "thread.messages",
  "message.get",
  "search.messages",
  "thread.list-active",
  "thread.get",
  "thread.create-from-message",
  "thread.create",
];

const input = createInterface({ input: process.stdin });
for await (const line of input) {
  const request = JSON.parse(line) as { method: string; params?: Record<string, string> };
  const result = await handle(request.method, request.params ?? {});
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

async function handle(method: string, params: Record<string, string>): Promise<unknown> {
  if (method === "tools/list") return { tools };
  if (!service) return { ok: false, error: { code: "auth_error", message: "Bot token was not found in ~/mcp.json" } };
  const content = params.content;
  if (method === "message.send") return service.sendToChannel(params.channel_id ?? "", content ?? "");
  if (method === "message.reply") return service.replyToMessage(params.channel_id ?? "", params.message_id ?? "", content ?? "");
  if (method === "thread.send") return service.sendToThread(params.thread_id ?? "", content ?? "");
  if (method === "thread.reply") return service.replyInThread(params.thread_id ?? "", params.message_id ?? "", content ?? "");
  if (method === "channel.messages") return service.listMessages(params.channel_id ?? "", params);
  if (method === "thread.messages") return service.listMessages(params.thread_id ?? "", params);
  if (method === "message.get") return service.getMessage(params.channel_id ?? "", params.message_id ?? "");
  if (method === "search.messages") return service.searchMessages();
  if (method === "thread.list-active") return service.listActiveThreads(params.channel_id ?? "");
  if (method === "thread.get") return service.getThread(params.thread_id ?? "");
  if (method === "thread.create-from-message") return service.createThreadFromMessage(params.channel_id ?? "", params.message_id ?? "", {
    name: params.name ?? "",
    auto_archive_duration: params.auto_archive_duration,
    rate_limit_per_user: params.rate_limit_per_user,
    invitable: params.invitable,
  });
  if (method === "thread.create") return service.createThread(params.channel_id ?? "", {
    name: params.name ?? "",
    auto_archive_duration: params.auto_archive_duration,
    rate_limit_per_user: params.rate_limit_per_user,
    invitable: params.invitable,
  });
  return { ok: false, error: { code: "invalid_input", message: "Unsupported MCP method" } };
}
