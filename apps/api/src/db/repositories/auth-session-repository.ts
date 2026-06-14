import type { DatabaseSync } from "node:sqlite";

export type AuthSessionRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
};

export class AuthSessionRepository {
  constructor(private readonly database: DatabaseSync) {}

  create(input: AuthSessionRecord) {
    this.database
      .prepare(
        `
          INSERT INTO auth_sessions (id, user_id, token_hash, created_at, expires_at)
          VALUES (?, ?, ?, ?, ?)
        `
      )
      .run(
        input.id,
        input.userId,
        input.tokenHash,
        input.createdAt,
        input.expiresAt
      );
  }

  findByTokenHash(tokenHash: string) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            user_id AS userId,
            token_hash AS tokenHash,
            created_at AS createdAt,
            expires_at AS expiresAt
          FROM auth_sessions
          WHERE token_hash = ?
        `
      )
      .get(tokenHash) as AuthSessionRecord | undefined;

    return row ?? null;
  }

  deleteByTokenHash(tokenHash: string) {
    this.database
      .prepare(
        `
          DELETE FROM auth_sessions
          WHERE token_hash = ?
        `
      )
      .run(tokenHash);
  }

  deleteByUserId(userId: string) {
    this.database
      .prepare(
        `
          DELETE FROM auth_sessions
          WHERE user_id = ?
        `
      )
      .run(userId);
  }

  deleteExpired(now: string) {
    this.database
      .prepare(
        `
          DELETE FROM auth_sessions
          WHERE expires_at <= ?
        `
      )
      .run(now);
  }
}
