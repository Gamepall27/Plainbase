import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(currentDirectory, "..");

export const apiConfig = {
  port: Number(process.env.PLAINBASE_API_PORT ?? process.env.PORT ?? 3001),
  host: process.env.HOST ?? "127.0.0.1",
  contentRoot:
    process.env.PLAINBASE_CONTENT_ROOT ?? "/Volumes/files/Obsidian",
  databasePath:
    process.env.PLAINBASE_DB_PATH ??
    resolve(packageRoot, "data", "plainbase.sqlite")
};
