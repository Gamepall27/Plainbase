import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { DatabaseSummary } from "@plainbase/shared";
import { applySchema } from "./schema.js";
import { seedDatabase } from "./seed.js";

type CountRow = {
  count: number;
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

  getConnection() {
    return this.database;
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

  private countRows(tableName: string) {
    const statement = this.database.prepare(
      `SELECT COUNT(*) AS count FROM ${tableName}`
    );
    const row = statement.get() as CountRow | undefined;

    return row?.count ?? 0;
  }
}
