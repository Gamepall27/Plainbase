import type { DatabaseSync } from "node:sqlite";

export type UserInvitationRecord = {
  id: string;
  tenantId: string;
  name: string;
  username: string;
  email: string;
  roleId: string;
  avatarUrl: string | null;
  invitedByUserId: string;
  acceptedUserId: string | null;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
};

export class UserInvitationRepository {
  constructor(private readonly database: DatabaseSync) {}

  create(input: UserInvitationRecord) {
    this.database
      .prepare(
        `
          INSERT INTO user_invitations (
            id,
            tenant_id,
            name,
            username,
            email,
            role_id,
            avatar_url,
            invited_by_user_id,
            accepted_user_id,
            token_hash,
            created_at,
            expires_at,
            accepted_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        input.id,
        input.tenantId,
        input.name,
        input.username,
        input.email,
        input.roleId,
        input.avatarUrl,
        input.invitedByUserId,
        input.acceptedUserId,
        input.tokenHash,
        input.createdAt,
        input.expiresAt,
        input.acceptedAt
      );
  }

  findByTokenHash(tokenHash: string) {
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
            avatar_url AS avatarUrl,
            invited_by_user_id AS invitedByUserId,
            accepted_user_id AS acceptedUserId,
            token_hash AS tokenHash,
            created_at AS createdAt,
            expires_at AS expiresAt,
            accepted_at AS acceptedAt
          FROM user_invitations
          WHERE token_hash = ?
        `
      )
      .get(tokenHash) as UserInvitationRecord | undefined;

    return row ?? null;
  }

  findPendingByIdentity(email: string, username: string) {
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
            avatar_url AS avatarUrl,
            invited_by_user_id AS invitedByUserId,
            accepted_user_id AS acceptedUserId,
            token_hash AS tokenHash,
            created_at AS createdAt,
            expires_at AS expiresAt,
            accepted_at AS acceptedAt
          FROM user_invitations
          WHERE (email = ? OR username = ?)
            AND accepted_at IS NULL
          ORDER BY created_at DESC
          LIMIT 1
        `
      )
      .get(email, username) as UserInvitationRecord | undefined;

    return row ?? null;
  }

  markAccepted(id: string, acceptedUserId: string, acceptedAt: string) {
    this.database
      .prepare(
        `
          UPDATE user_invitations
          SET accepted_user_id = ?, accepted_at = ?
          WHERE id = ?
        `
      )
      .run(acceptedUserId, acceptedAt, id);
  }

  deleteExpired(now: string) {
    this.database
      .prepare(
        `
          DELETE FROM user_invitations
          WHERE expires_at <= ? AND accepted_at IS NULL
        `
      )
      .run(now);
  }

  countPendingByTenantId(tenantId: string) {
    const row = this.database
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM user_invitations
          WHERE tenant_id = ?
            AND accepted_at IS NULL
        `
      )
      .get(tenantId) as { total: number } | undefined;

    return row?.total ?? 0;
  }
}
