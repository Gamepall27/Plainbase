import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const workspaceRoot = process.cwd();
const e2eRoot = resolve(workspaceRoot, ".tmp", "e2e");
const e2eDatabasePath = resolve(e2eRoot, "plainbase.sqlite");
const e2eContentRoot = resolve(e2eRoot, "content");
const concurrentlyBin = resolve(
  workspaceRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "concurrently.cmd" : "concurrently"
);

rmSync(e2eRoot, { recursive: true, force: true });
mkdirSync(e2eRoot, { recursive: true });

const child = spawn(
  concurrentlyBin,
  [
    "-k",
    "-n",
    "api,web",
    "-c",
    "green,blue",
    "npm run dev -w @plainbase/api",
    "npm run dev -w @plainbase/web"
  ],
  {
    cwd: workspaceRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PLAINBASE_API_PORT: "3101",
      PLAINBASE_WEB_PORT: "4173",
      PLAINBASE_DB_PATH: e2eDatabasePath,
      PLAINBASE_CONTENT_ROOT: e2eContentRoot
    }
  }
);

function shutdown(signal) {
  if (!child.killed) {
    child.kill(signal);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
