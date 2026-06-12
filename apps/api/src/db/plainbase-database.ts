import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  Addon,
  DatabaseSummary,
  DemoDataResponse,
  Document,
  Role,
  Ticket,
  User,
  Workspace
} from "@plainbase/shared";
import { applySchema } from "./schema.js";
import { seedDatabase } from "./seed.js";

type CountRow = {
  count: number;
};

type AddonRow = Omit<Addon, "enabled"> & {
  enabled: number;
};

export class PlainbaseDatabase {
  private readonly database: DatabaseSync;
  private readonly databasePath: string;

  constructor(databasePath: string) {
    mkdirSync(dirname(databasePath), { recursive: true });

    this.databasePath = databasePath;
    this.database = new DatabaseSync(databasePath);
  }

  initialize() {
    applySchema(this.database);
    seedDatabase(this.database);
  }

  close() {
    if (this.database.isOpen) {
      this.database.close();
    }
  }

  getSummary(): DatabaseSummary {
    const workspaceCount = this.countRows("workspaces");
    const documentCount = this.countRows("documents");
    const userCount = this.countRows("users");
    const roleCount = this.countRows("roles");
    const addonCount = this.countRows("addons");
    const ticketCount = this.countRows("tickets");

    return {
      type: "sqlite",
      path: this.databasePath,
      seeded:
        workspaceCount > 0 &&
        documentCount > 0 &&
        userCount > 0 &&
        roleCount > 0 &&
        addonCount > 0 &&
        ticketCount > 0,
      workspaceCount,
      documentCount,
      userCount,
      roleCount,
      addonCount,
      ticketCount
    };
  }

  getDemoData(): DemoDataResponse {
    return {
      workspaces: this.listWorkspaces(),
      documents: this.listDocuments(),
      users: this.listUsers(),
      roles: this.listRoles(),
      addons: this.listAddons(),
      tickets: this.listTickets()
    };
  }

  private countRows(tableName: string) {
    const statement = this.database.prepare(
      `SELECT COUNT(*) AS count FROM ${tableName}`
    );
    const row = statement.get() as CountRow | undefined;

    return row?.count ?? 0;
  }

  private listWorkspaces() {
    const rows = this.database
      .prepare(`
        SELECT
          id,
          name,
          slug,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM workspaces
        ORDER BY name
      `)
      .all() as Workspace[];

    return rows;
  }

  private listDocuments() {
    const rows = this.database
      .prepare(`
        SELECT
          id,
          workspace_id AS workspaceId,
          parent_id AS parentId,
          title,
          slug,
          content,
          created_at AS createdAt,
          updated_at AS updatedAt,
          created_by_user_id AS createdByUserId,
          updated_by_user_id AS updatedByUserId
        FROM documents
        ORDER BY created_at, title
      `)
      .all() as Document[];

    return rows;
  }

  private listUsers() {
    const rows = this.database
      .prepare(`
        SELECT
          id,
          name,
          email,
          role_id AS roleId
        FROM users
        ORDER BY name
      `)
      .all() as User[];

    return rows;
  }

  private listRoles() {
    const rows = this.database
      .prepare(`
        SELECT
          id,
          name
        FROM roles
        ORDER BY CASE name
          WHEN 'Admin' THEN 1
          WHEN 'Editor' THEN 2
          ELSE 3
        END
      `)
      .all() as Role[];

    return rows;
  }

  private listAddons() {
    const rows = this.database
      .prepare(`
        SELECT
          id,
          name,
          version,
          description,
          enabled,
          manifest_json AS manifestJson
        FROM addons
        ORDER BY name
      `)
      .all() as AddonRow[];

    return rows.map((row) => ({
      ...row,
      enabled: Boolean(row.enabled)
    }));
  }

  private listTickets() {
    const rows = this.database
      .prepare(`
        SELECT
          id,
          workspace_id AS workspaceId,
          document_id AS documentId,
          title,
          description,
          status,
          creator_id AS creatorId,
          assignee_id AS assigneeId,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM tickets
        ORDER BY created_at, title
      `)
      .all() as Ticket[];

    return rows;
  }
}
