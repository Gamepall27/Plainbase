import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  normalizeWorkspaceRootPath,
  resolveMountedSmbPath,
  resolveWorkspaceRootPath
} from "../../apps/api/src/workspaces/workspace-paths.ts";
import { ApiError } from "../../apps/api/src/errors/api-error.ts";

test("workspace path helpers normalize explicit roots and derive slug paths", () => {
  assert.equal(
    normalizeWorkspaceRootPath(" ./content/plainbase "),
    resolve("./content/plainbase")
  );

  assert.equal(
    resolveWorkspaceRootPath("/srv/plainbase", {
      slug: "engineering",
      rootPath: ""
    }),
    resolve("/srv/plainbase", "engineering")
  );

  assert.equal(
    resolveWorkspaceRootPath("/srv/plainbase", {
      slug: "ignored",
      rootPath: " ./custom/root "
    }),
    resolve("./custom/root")
  );
});

test("SMB workspace paths resolve to an already mounted macOS volume", (t) => {
  const volumesRoot = mkdtempSync(resolve(tmpdir(), "plainbase-volumes-"));
  const mountedVault = resolve(volumesRoot, "files-1", "Obsidian");
  mkdirSync(mountedVault, { recursive: true });
  t.after(() => rmSync(volumesRoot, { recursive: true, force: true }));

  assert.equal(
    resolveMountedSmbPath("smb://100.117.112.24/files/Obsidian", volumesRoot),
    mountedVault
  );
});

test("SMB workspace paths report an actionable error when the share is not mounted", () => {
  assert.throws(
    () => resolveMountedSmbPath("smb://100.117.112.24/files/Obsidian", "/missing"),
    (error: unknown) =>
      error instanceof ApiError &&
      error.details?.rootPath?.includes("not mounted locally") === true
  );
});
