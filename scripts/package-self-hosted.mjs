import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDirectory, "..");
const rootPackageJsonPath = resolve(projectRoot, "package.json");
const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, "utf8"));
const version = rootPackageJson.version;

const artifactsRoot = resolve(projectRoot, "artifacts", "plainbase-self-hosted");
const releaseDirectory = resolve(artifactsRoot, `plainbase-${version}`);
const archivePath = resolve(
  artifactsRoot,
  `plainbase-self-hosted-${version}.tgz`
);

rmSync(releaseDirectory, { recursive: true, force: true });
mkdirSync(releaseDirectory, { recursive: true });

copyRequiredDirectory("apps/api/dist");
copyRequiredDirectory("apps/web/dist");
copyRequiredDirectory("packages/shared/dist");
copyRequiredDirectory("packages/addon-sdk/dist");
copyOptionalDirectory("ops/self-hosted");
copyOptionalFile("README.md");
copyOptionalFile("docs/self-hosted.md");

writeJson("package.json", {
  name: "plainbase-self-hosted",
  private: true,
  version,
  type: "module",
  workspaces: ["apps/api", "packages/shared", "packages/addon-sdk"],
  scripts: {
    start: "node apps/api/dist/index.js"
  },
  engines: rootPackageJson.engines
});

writeJson("apps/api/package.json", {
  name: "@plainbase/api",
  private: true,
  version,
  type: "module",
  dependencies: JSON.parse(
    readFileSync(resolve(projectRoot, "apps/api/package.json"), "utf8")
  ).dependencies
});

writeJson("packages/shared/package.json", {
  name: "@plainbase/shared",
  private: true,
  version,
  type: "module",
  exports: {
    ".": {
      types: "./dist/index.d.ts",
      default: "./dist/index.js"
    }
  }
});

writeJson("packages/addon-sdk/package.json", {
  name: "@plainbase/addon-sdk",
  private: true,
  version,
  type: "module",
  dependencies: {
    "@plainbase/shared": version
  },
  exports: {
    ".": {
      types: "./dist/index.d.ts",
      default: "./dist/index.js"
    }
  }
});

const packageLockResult = spawnSync(
  "npm",
  ["install", "--package-lock-only", "--omit=dev"],
  {
    cwd: releaseDirectory,
    stdio: "inherit"
  }
);

if (packageLockResult.status !== 0) {
  process.exit(packageLockResult.status ?? 1);
}

rmSync(archivePath, { force: true });

const tarResult = spawnSync(
  "tar",
  ["-czf", archivePath, "-C", artifactsRoot, `plainbase-${version}`],
  {
    cwd: projectRoot,
    stdio: "inherit"
  }
);

if (tarResult.status !== 0) {
  process.exit(tarResult.status ?? 1);
}

console.log(`Self-hosted bundle bereit: ${releaseDirectory}`);
console.log(`Self-hosted Archiv bereit: ${archivePath}`);

function copyRequiredDirectory(relativePath) {
  const sourcePath = resolve(projectRoot, relativePath);

  if (!existsSync(sourcePath)) {
    throw new Error(`Fehlendes Build-Artefakt: ${relativePath}`);
  }

  const targetPath = resolve(releaseDirectory, relativePath);
  mkdirSync(dirname(targetPath), { recursive: true });
  cpSync(sourcePath, targetPath, { recursive: true });
}

function copyOptionalDirectory(relativePath) {
  const sourcePath = resolve(projectRoot, relativePath);

  if (!existsSync(sourcePath)) {
    return;
  }

  const targetPath = resolve(releaseDirectory, relativePath);
  mkdirSync(dirname(targetPath), { recursive: true });
  cpSync(sourcePath, targetPath, { recursive: true });
}

function copyOptionalFile(relativePath) {
  const sourcePath = resolve(projectRoot, relativePath);

  if (!existsSync(sourcePath)) {
    return;
  }

  const targetPath = resolve(releaseDirectory, relativePath);
  mkdirSync(dirname(targetPath), { recursive: true });
  cpSync(sourcePath, targetPath);
}

function writeJson(relativePath, value) {
  const targetPath = resolve(releaseDirectory, relativePath);
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, `${JSON.stringify(value, null, 2)}\n`);
}
