import { createInterface } from "node:readline";
import { DiscordApiTransport, MessagingService } from "./service.js";

const token = process.env.DISCORD_BOT_TOKEN;
const service = token ? new MessagingService(new DiscordApiTransport(token)) : undefined;

const tools = [
  "message.send",
  "message.reply",
  "thread.send",
  "thread.reply",
];

const input = createInterface({ input: process.stdin });
for await (const line of input) {
  const request = JSON.parse(line) as { method: string; params?: Record<string, string> };
  const result = await handle(request.method, request.params ?? {});
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

async function handle(method: string, params: Record<string, string>): Promise<unknown> {
  if (method === "tools/list") return { tools };
  if (!service) return { ok: false, error: { code: "auth_error", message: "DISCORD_BOT_TOKEN is required" } };
  const content = params.content;
  if (!content) return { ok: false, error: { code: "invalid_input", message: "content is required" } };
  if (method === "message.send") return service.sendToChannel(params.channel_id ?? "", content);
  if (method === "message.reply") return service.replyToMessage(params.channel_id ?? "", params.message_id ?? "", content);
  if (method === "thread.send") return service.sendToThread(params.thread_id ?? "", content);
  if (method === "thread.reply") return service.replyInThread(params.thread_id ?? "", params.message_id ?? "", content);
  return { ok: false, error: { code: "invalid_input", message: "Unsupported MCP method" } };
}
