import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import type { DocumentKind, Workspace } from "@plainbase/shared";
import { resolveWorkspaceRootPath } from "../workspaces/workspace-paths.js";

export type FilesystemDocumentEntry = {
  content: string;
  filePath: string;
  kind: DocumentKind;
  parentFilePath: string | null;
  slug: string;
  sortOrder: number;
  title: string;
};

export class DocumentFilesystemStore {
  constructor(private readonly rootPath: string) {}

  ensureRoot() {
    mkdirSync(this.rootPath, { recursive: true });
  }

  ensureWorkspaceRoot(workspace: Workspace) {
    const workspaceRoot = this.getWorkspaceRoot(workspace);
    mkdirSync(workspaceRoot, { recursive: true });
    return workspaceRoot;
  }

  getWorkspaceRoot(workspace: Workspace) {
    return resolveWorkspaceRootPath(this.rootPath, workspace);
  }

  createEntry(
    workspace: Workspace,
    filePath: string,
    kind: DocumentKind,
    content: string
  ) {
    const absolutePath = this.resolvePath(workspace, filePath);

    if (kind === "folder") {
      mkdirSync(absolutePath, { recursive: true });
      return;
    }

    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content, "utf8");
  }

  updateDocumentContent(workspace: Workspace, filePath: string, content: string) {
    const absolutePath = this.resolvePath(workspace, filePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, content, "utf8");
  }

  moveEntry(workspace: Workspace, currentFilePath: string, nextFilePath: string) {
    const currentAbsolutePath = this.resolvePath(workspace, currentFilePath);
    const nextAbsolutePath = this.resolvePath(workspace, nextFilePath);

    if (currentAbsolutePath === nextAbsolutePath || !existsSync(currentAbsolutePath)) {
      return;
    }

    mkdirSync(dirname(nextAbsolutePath), { recursive: true });
    renameSync(currentAbsolutePath, nextAbsolutePath);
  }

  deleteEntry(workspace: Workspace, filePath: string, kind: DocumentKind) {
    const absolutePath = this.resolvePath(workspace, filePath);

    if (!existsSync(absolutePath)) {
      return;
    }

    if (kind === "folder") {
      rmSync(absolutePath, { recursive: true, force: true });
      return;
    }

    unlinkSync(absolutePath);
  }

  exists(workspace: Workspace, filePath: string) {
    return existsSync(this.resolvePath(workspace, filePath));
  }

  scanWorkspace(workspace: Workspace): FilesystemDocumentEntry[] {
    const workspaceRoot = this.ensureWorkspaceRoot(workspace);
    const entries: FilesystemDocumentEntry[] = [];

    this.scanDirectory(workspaceRoot, workspaceRoot, null, entries);

    return entries;
  }

  buildFilePath(
    parentFilePath: string | null,
    slug: string,
    kind: DocumentKind
  ) {
    const segment =
      kind === "folder"
        ? slug
        : kind === "kanban"
          ? `${slug}.kanban.md`
          : `${slug}.md`;

    return parentFilePath ? `${parentFilePath}/${segment}` : segment;
  }

  normalizeRelativePath(targetPath: string) {
    return targetPath.split(sep).join("/");
  }

  private resolvePath(workspace: Workspace, filePath: string) {
    return resolve(this.getWorkspaceRoot(workspace), filePath);
  }

  private scanDirectory(
    workspaceRoot: string,
    currentPath: string,
    parentFilePath: string | null,
    entries: FilesystemDocumentEntry[]
  ) {
    const directoryEntries = readdirSync(currentPath, { withFileTypes: true })
      .filter((entry) => !entry.name.startsWith("."))
      .sort((left, right) => {
        if (left.isDirectory() !== right.isDirectory()) {
          return left.isDirectory() ? -1 : 1;
        }

        return left.name.localeCompare(right.name, "de");
      });

    directoryEntries.forEach((entry, index) => {
      const absolutePath = resolve(currentPath, entry.name);

      if (entry.isDirectory()) {
        const filePath = this.relativeToRoot(workspaceRoot, absolutePath);
        entries.push({
          filePath,
          parentFilePath,
          kind: "folder",
          slug: slugifyPathSegment(entry.name),
          title: humanizeName(entry.name),
          content: "",
          sortOrder: index
        });
        this.scanDirectory(workspaceRoot, absolutePath, filePath, entries);
        return;
      }

      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) {
        return;
      }

      const isKanban = entry.name.toLowerCase().endsWith(".kanban.md");
      const baseName = isKanban
        ? entry.name.replace(/\.kanban\.md$/i, "")
        : entry.name.replace(/\.md$/i, "");
      entries.push({
        filePath: this.relativeToRoot(workspaceRoot, absolutePath),
        parentFilePath,
        kind: isKanban ? "kanban" : "document",
        slug: slugifyPathSegment(baseName),
        title: humanizeName(baseName),
        content: readFileSync(absolutePath, "utf8"),
        sortOrder: index
      });
    });
  }

  private relativeToRoot(workspaceRoot: string, targetPath: string) {
    return relative(workspaceRoot, targetPath).split(sep).join("/");
  }
}

function slugifyPathSegment(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/\.md$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "untitled-document";
}

function humanizeName(value: string) {
  return value
    .replace(/\.md$/i, "")
    .replace(/[-_]+/g, " ")
    .trim() || "Untitled document";
}
