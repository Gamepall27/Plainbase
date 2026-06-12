import { existsSync, readdirSync, statSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { relative, resolve, sep } from "node:path";
import type { LibraryEntry, LibrarySummaryResponse } from "@plainbase/shared";

export class ContentStore {
  private readonly rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  getSummary(): LibrarySummaryResponse {
    this.assertAvailable();

    let markdownFileCount = 0;
    let directoryCount = 0;
    let scanCompleted = true;
    const deadline = performance.now() + 1500;
    const pendingDirectories = [this.rootPath];

    while (pendingDirectories.length > 0) {
      if (performance.now() >= deadline) {
        scanCompleted = false;
        break;
      }

      const currentPath = pendingDirectories.pop();

      if (!currentPath) {
        continue;
      }

      const entries = readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const absolutePath = resolve(currentPath, entry.name);

        if (entry.isDirectory()) {
          directoryCount += 1;
          pendingDirectories.push(absolutePath);
          continue;
        }

        if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
          markdownFileCount += 1;
        }
      }
    }

    return {
      rootPath: this.rootPath,
      markdownFileCount,
      directoryCount,
      scanCompleted,
      topLevelEntries: this.getTopLevelEntries()
    };
  }

  private assertAvailable() {
    if (!existsSync(this.rootPath)) {
      throw new Error(`Content root not found: ${this.rootPath}`);
    }

    const stats = statSync(this.rootPath);

    if (!stats.isDirectory()) {
      throw new Error(`Content root is not a directory: ${this.rootPath}`);
    }
  }

  private getTopLevelEntries(): LibraryEntry[] {
    return readdirSync(this.rootPath, { withFileTypes: true })
      .map(
        (entry): LibraryEntry => ({
          name: entry.name,
          path: this.normalizeRelativePath(resolve(this.rootPath, entry.name)),
          kind: entry.isDirectory() ? "directory" : "file"
        })
      )
      .sort((left, right) => {
        if (left.kind !== right.kind) {
          return left.kind === "directory" ? -1 : 1;
        }

        return left.name.localeCompare(right.name, "de");
      });
  }

  private normalizeRelativePath(targetPath: string) {
    return relative(this.rootPath, targetPath).split(sep).join("/");
  }
}
