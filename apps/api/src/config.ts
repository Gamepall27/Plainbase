import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(currentDirectory, "..");

export const apiConfig = {
  port: Number(process.env.PLAINBASE_API_PORT ?? process.env.PORT ?? 3001),
  host: process.env.HOST ?? "127.0.0.1",
  enableDemoSeed: process.env.PLAINBASE_ENABLE_DEMO_SEED === "true",
  appOrigin: process.env.PLAINBASE_APP_ORIGIN ?? "http://127.0.0.1:5173",
  secureCookies: process.env.PLAINBASE_SECURE_COOKIES === "true",
  sessionDurationHours: Number(process.env.PLAINBASE_SESSION_DURATION_HOURS ?? 336),
  passwordResetDurationMinutes: Number(
    process.env.PLAINBASE_PASSWORD_RESET_DURATION_MINUTES ?? 30
  ),
  invitationDurationHours: Number(
    process.env.PLAINBASE_INVITATION_DURATION_HOURS ?? 168
  ),
  contentRoot:
    process.env.PLAINBASE_CONTENT_ROOT ??
    resolve(packageRoot, "data", "content"),
  databasePath:
    process.env.PLAINBASE_DB_PATH ??
    resolve(packageRoot, "data", "plainbase.sqlite")
};
