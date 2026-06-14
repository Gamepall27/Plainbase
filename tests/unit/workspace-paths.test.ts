import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import {
  normalizeWorkspaceRootPath,
  resolveWorkspaceRootPath
} from "../../apps/api/src/workspaces/workspace-paths.ts";

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
