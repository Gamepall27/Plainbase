import type { DatabaseSync } from "node:sqlite";
import type { Workspace } from "@plainbase/shared";

export class WorkspaceRepository {
  constructor(private readonly database: DatabaseSync) {}

  list() {
    return this.database
      .prepare(
        `
          SELECT
            id,
            name,
            slug,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM workspaces
          ORDER BY name
        `
      )
      .all() as Workspace[];
  }

  findById(id: string) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            name,
            slug,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM workspaces
          WHERE id = ?
        `
      )
      .get(id) as Workspace | undefined;

    return row ?? null;
  }

  findBySlug(slug: string) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            name,
            slug,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM workspaces
          WHERE slug = ?
        `
      )
      .get(slug) as Workspace | undefined;

    return row ?? null;
  }

  create(workspace: Workspace) {
    this.database
      .prepare(
        `
          INSERT INTO workspaces (id, name, slug, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `
      )
      .run(
        workspace.id,
        workspace.name,
        workspace.slug,
        workspace.createdAt,
        workspace.updatedAt
      );

    return workspace;
  }
}
