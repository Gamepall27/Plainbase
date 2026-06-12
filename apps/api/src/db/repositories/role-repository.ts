import type { DatabaseSync } from "node:sqlite";
import type { Role, RoleName } from "@plainbase/shared";

export class RoleRepository {
  constructor(private readonly database: DatabaseSync) {}

  list() {
    return this.database
      .prepare(
        `
          SELECT
            id,
            name
          FROM roles
          ORDER BY CASE name
            WHEN 'Admin' THEN 1
            WHEN 'Editor' THEN 2
            ELSE 3
          END
        `
      )
      .all() as Role[];
  }

  findById(id: string) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            name
          FROM roles
          WHERE id = ?
        `
      )
      .get(id) as Role | undefined;

    return row ?? null;
  }

  findByName(name: RoleName) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            name
          FROM roles
          WHERE name = ?
        `
      )
      .get(name) as Role | undefined;

    return row ?? null;
  }
}
