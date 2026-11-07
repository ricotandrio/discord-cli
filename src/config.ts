import { chmod, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export const CONFIG_PATH = join(homedir(), "discord-cli.json");

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

export async function saveBotToken(token: string): Promise<void> {
  await writeFile(CONFIG_PATH, `${JSON.stringify({ DISCORD_BOT_TOKEN: token })}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await chmod(CONFIG_PATH, 0o600);
}

export async function removeBotToken(): Promise<boolean> {
  try {
    await unlink(CONFIG_PATH);
    return true;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return false;
    throw error;
  }
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

function isNodeError(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && "code" in value;
}
