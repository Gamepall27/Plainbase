import type { DatabaseSync } from "node:sqlite";
import type { User } from "@plainbase/shared";

type UserRow = User & {
  passwordHash: string;
};

type CreateUserRecordInput = {
  id: string;
  tenantId: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  roleId: string;
  avatarUrl: string | null;
};

type UpdateUserRecordInput = {
  tenantId?: string;
  name?: string;
  username?: string;
  email?: string;
  passwordHash?: string;
  roleId?: string;
  avatarUrl?: string | null;
};

export class UserRepository {
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
            username,
            email,
            role_id AS roleId,
            avatar_url AS avatarUrl
          FROM users
          ${tenantId ? "WHERE tenant_id = ?" : ""}
          ORDER BY name
        `
      )
      .all(...(tenantId ? [tenantId] : [])) as User[];
  }

  findById(id: string) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            tenant_id AS tenantId,
            name,
            username,
            email,
            role_id AS roleId,
            avatar_url AS avatarUrl
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
            tenant_id AS tenantId,
            name,
            username,
            email,
            role_id AS roleId,
            avatar_url AS avatarUrl
          FROM users
          WHERE role_id = ?
          ORDER BY name
          LIMIT 1
        `
      )
      .get(roleId) as User | undefined;

    return row ?? null;
  }

  findByEmail(email: string) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            tenant_id AS tenantId,
            name,
            username,
            email,
            role_id AS roleId,
            avatar_url AS avatarUrl
          FROM users
          WHERE email = ?
        `
      )
      .get(email) as User | undefined;

    return row ?? null;
  }

  findByUsername(username: string) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            tenant_id AS tenantId,
            name,
            username,
            email,
            role_id AS roleId,
            avatar_url AS avatarUrl
          FROM users
          WHERE username = ?
        `
      )
      .get(username) as User | undefined;

    return row ?? null;
  }

  findAuthByIdentifier(identifier: string) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            tenant_id AS tenantId,
            name,
            username,
            email,
            password_hash AS passwordHash,
            role_id AS roleId,
            avatar_url AS avatarUrl
          FROM users
          WHERE email = ? OR username = ?
          LIMIT 1
        `
      )
      .get(identifier, identifier) as UserRow | undefined;

    return row ?? null;
  }

  create(input: CreateUserRecordInput) {
    this.database
      .prepare(
        `
          INSERT INTO users (id, tenant_id, name, username, email, password_hash, role_id, avatar_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        input.id,
        input.tenantId,
        input.name,
        input.username,
        input.email,
        input.passwordHash,
        input.roleId,
        input.avatarUrl ?? null
      );

    return this.findById(input.id);
  }

  update(id: string, input: UpdateUserRecordInput) {
    const existingUser = this.findAuthById(id);

    if (!existingUser) {
      return null;
    }

    this.database
      .prepare(
        `
          UPDATE users
          SET
            tenant_id = ?,
            name = ?,
            username = ?,
            email = ?,
            password_hash = ?,
            role_id = ?,
            avatar_url = ?
          WHERE id = ?
        `
      )
      .run(
        input.tenantId ?? existingUser.tenantId,
        input.name ?? existingUser.name,
        input.username ?? existingUser.username,
        input.email ?? existingUser.email,
        input.passwordHash ?? existingUser.passwordHash,
        input.roleId ?? existingUser.roleId,
        input.avatarUrl === undefined ? existingUser.avatarUrl : input.avatarUrl,
        id
      );

    return this.findById(id);
  }

  delete(id: string) {
    this.database
      .prepare(
        `
          DELETE FROM users
          WHERE id = ?
        `
      )
      .run(id);
  }

  private findAuthById(id: string) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            tenant_id AS tenantId,
            name,
            username,
            email,
            password_hash AS passwordHash,
            role_id AS roleId,
            avatar_url AS avatarUrl
          FROM users
          WHERE id = ?
        `
      )
      .get(id) as UserRow | undefined;

    return row ?? null;
  }
}
