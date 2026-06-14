import type { DatabaseSync } from "node:sqlite";
import type { Workspace } from "@plainbase/shared";

export class WorkspaceRepository {
  constructor(private readonly database: DatabaseSync) {}

  list() {
    return this.listByTenantId(null);
  }

  listByTenantId(tenantId: string | null) {
    return this.database
      .prepare(
        `
          SELECT
            id,
            tenant_id AS tenantId,
            name,
            slug,
            root_path AS rootPath,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM workspaces
          ${tenantId ? "WHERE tenant_id = ?" : ""}
          ORDER BY name
        `
      )
      .all(...(tenantId ? [tenantId] : [])) as Workspace[];
  }

  findById(id: string) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            tenant_id AS tenantId,
            name,
            slug,
            root_path AS rootPath,
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
            tenant_id AS tenantId,
            name,
            slug,
            root_path AS rootPath,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM workspaces
          WHERE slug = ?
        `
      )
      .get(slug) as Workspace | undefined;

    return row ?? null;
  }

  findByRootPath(rootPath: string) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            tenant_id AS tenantId,
            name,
            slug,
            root_path AS rootPath,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM workspaces
          WHERE root_path = ?
        `
      )
      .get(rootPath) as Workspace | undefined;

    return row ?? null;
  }

  create(workspace: Workspace) {
    this.database
      .prepare(
        `
          INSERT INTO workspaces (id, tenant_id, name, slug, root_path, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        workspace.id,
        workspace.tenantId,
        workspace.name,
        workspace.slug,
        workspace.rootPath,
        workspace.createdAt,
        workspace.updatedAt
      );

    return workspace;
  }

  update(workspace: Workspace) {
    this.database
      .prepare(
        `
          UPDATE workspaces
          SET
            name = ?,
            slug = ?,
            root_path = ?,
            updated_at = ?
          WHERE id = ?
        `
      )
      .run(
        workspace.name,
        workspace.slug,
        workspace.rootPath,
        workspace.updatedAt,
        workspace.id
      );

    return workspace;
  }

  delete(id: string) {
    this.database
      .prepare(
        `
          DELETE FROM workspaces
          WHERE id = ?
        `
      )
      .run(id);
  }
}
