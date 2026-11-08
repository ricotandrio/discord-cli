import { homedir } from "node:os";
import { join } from "node:path";


export const API_BASE = "https://discord.com/api/v10";

export const CONFIG_FILENAME = "discord-cli.json";
export const CONFIG_PATH = join(homedir(), CONFIG_FILENAME);
