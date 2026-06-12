import type { DatabaseSync } from "node:sqlite";
import type { User } from "@plainbase/shared";

export class UserRepository {
  constructor(private readonly database: DatabaseSync) {}

  list() {
    return this.database
      .prepare(
        `
          SELECT
            id,
            name,
            email,
            role_id AS roleId
          FROM users
          ORDER BY name
        `
      )
      .all() as User[];
  }

  findById(id: string) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            name,
            email,
            role_id AS roleId
          FROM users
          WHERE id = ?
        `
      )
      .get(id) as User | undefined;

    return row ?? null;
  }

  findByRoleId(roleId: string) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            name,
            email,
            role_id AS roleId
          FROM users
          WHERE role_id = ?
          ORDER BY name
          LIMIT 1
        `
      )
      .get(roleId) as User | undefined;

    return row ?? null;
  }
}
