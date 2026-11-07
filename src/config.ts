import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_PATH = join(homedir(), "mcp.json");

export async function readBotToken(): Promise<string | undefined> {
  let contents: string;
  try {
    contents = await readFile(CONFIG_PATH, "utf8");
  } catch {
    return undefined;
  }

  let config: unknown;
  try {
    config = JSON.parse(contents);
  } catch {
    return undefined;
  }
  return findToken(config);
}

function findToken(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  const direct = value.DISCORD_BOT_TOKEN;
  if (typeof direct === "string" && direct.length > 0) return direct;

  const env = value.env;
  if (isRecord(env) && typeof env.DISCORD_BOT_TOKEN === "string" && env.DISCORD_BOT_TOKEN.length > 0) {
    return env.DISCORD_BOT_TOKEN;
  }

  for (const child of Object.values(value)) {
    const token = findToken(child);
    if (token) return token;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
