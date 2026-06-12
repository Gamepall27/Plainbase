import { spawn } from "node:child_process";
import { Socket } from "node:net";
import { resolve } from "node:path";

const workspaceRoot = process.cwd();
const preferredWebPort = readPort(process.env.PLAINBASE_WEB_PORT, 5173);
const preferredApiPort = readPort(process.env.PLAINBASE_API_PORT, 3001);

const [webPort, apiPort] = await Promise.all([
  findAvailablePort(preferredWebPort),
  findAvailablePort(preferredApiPort)
]);

if (webPort !== preferredWebPort) {
  console.log(
    `Web port ${preferredWebPort} ist belegt, verwende stattdessen ${webPort}.`
  );
}

if (apiPort !== preferredApiPort) {
  console.log(
    `API port ${preferredApiPort} ist belegt, verwende stattdessen ${apiPort}.`
  );
}

console.log(`Frontend: http://localhost:${webPort}`);
console.log(`API: http://127.0.0.1:${apiPort}`);

const concurrentlyBin = resolve(
  workspaceRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "concurrently.cmd" : "concurrently"
);

const child = spawn(
  concurrentlyBin,
  [
    "-k",
    "-n",
    "web,api",
    "-c",
    "blue,green",
    "npm run dev -w @plainbase/web",
    "npm run dev -w @plainbase/api"
  ],
  {
    cwd: workspaceRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      PLAINBASE_WEB_PORT: String(webPort),
      PLAINBASE_API_PORT: String(apiPort)
    }
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

function readPort(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  return fallback;
}

async function findAvailablePort(startPort) {
  let port = startPort;

  while (!(await isPortAvailable(port))) {
    port += 1;
  }

  return port;
}

async function isPortAvailable(port) {
  const occupiedHosts = await Promise.all([
    isPortOccupiedOnHost(port, "127.0.0.1"),
    isPortOccupiedOnHost(port, "::1")
  ]);

  return occupiedHosts.every((occupied) => !occupied);
}

function isPortOccupiedOnHost(port, host) {
  return new Promise((resolvePromise) => {
    const socket = new Socket();

    socket.setTimeout(200);

    socket.once("connect", () => {
      socket.destroy();
      resolvePromise(true);
    });

    socket.once("timeout", () => {
      socket.destroy();
      resolvePromise(false);
    });

    socket.once("error", (error) => {
      if (
        error.code === "ECONNREFUSED" ||
        error.code === "EHOSTUNREACH" ||
        error.code === "ENETUNREACH" ||
        error.code === "EADDRNOTAVAIL"
      ) {
        resolvePromise(false);
        return;
      }

      resolvePromise(true);
    });

    socket.connect(port, host);
  });
}
