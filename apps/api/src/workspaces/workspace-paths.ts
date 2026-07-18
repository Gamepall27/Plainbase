import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Workspace } from "@plainbase/shared";
import { ApiError } from "../errors/api-error.js";

export function normalizeWorkspaceRootPath(rootPath: string) {
  const trimmedRootPath = rootPath.trim();

  if (trimmedRootPath.toLowerCase().startsWith("smb://")) {
    return resolveMountedSmbPath(trimmedRootPath);
  }

  return resolve(trimmedRootPath);
}

export function resolveMountedSmbPath(smbUrl: string, volumesRoot = "/Volumes") {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(smbUrl);
  } catch {
    throw invalidSmbPath("The SMB address is invalid.");
  }

  let pathSegments: string[];

  try {
    pathSegments = parsedUrl.pathname
      .split("/")
      .filter(Boolean)
      .map((segment) => decodeURIComponent(segment));
  } catch {
    throw invalidSmbPath("The SMB address contains an invalid path.");
  }
  const shareName = pathSegments.shift();

  if (!shareName) {
    throw invalidSmbPath("The SMB address must include a shared folder.");
  }

  const mountedVolumePaths = getMountedVolumePaths(volumesRoot, shareName);

  for (const mountedVolumePath of mountedVolumePaths) {
    const targetPath = resolve(mountedVolumePath, ...pathSegments);

    if (existsSync(targetPath)) {
      return targetPath;
    }
  }

  throw invalidSmbPath(
    `The SMB share is not mounted locally. Mount ${smbUrl} first, then import it again.`
  );
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

function getMountedVolumePaths(volumesRoot: string, shareName: string) {
  try {
    return readdirSync(volumesRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .sort((left, right) => {
        const leftMatchesShare = left.name === shareName;
        const rightMatchesShare = right.name === shareName;

        if (leftMatchesShare !== rightMatchesShare) {
          return leftMatchesShare ? -1 : 1;
        }

        return left.name.localeCompare(right.name);
      })
      .map((entry) => join(volumesRoot, entry.name));
  } catch {
    return [];
  }
}

function invalidSmbPath(message: string) {
  return new ApiError(422, "VALIDATION_ERROR", "Validation failed.", {
    rootPath: message
  });
}
