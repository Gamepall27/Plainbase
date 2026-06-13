import { resolve } from "node:path";
import type { Workspace } from "@plainbase/shared";

export function normalizeWorkspaceRootPath(rootPath: string) {
  return resolve(rootPath.trim());
}

export function resolveWorkspaceRootPath(
  defaultContentRoot: string,
  workspace: Pick<Workspace, "slug" | "rootPath">
) {
  if (workspace.rootPath.trim() !== "") {
    return normalizeWorkspaceRootPath(workspace.rootPath);
  }

  return resolve(defaultContentRoot, workspace.slug);
}
