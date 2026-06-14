import type { DatabaseSync } from "node:sqlite";

export type PasswordResetRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
};

export class PasswordResetRepository {
  constructor(private readonly database: DatabaseSync) {}

  create(input: PasswordResetRecord) {
    this.database
      .prepare(
        `
          INSERT INTO password_reset_tokens (
            id,
            user_id,
            token_hash,
            created_at,
            expires_at,
            consumed_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        input.id,
        input.userId,
        input.tokenHash,
        input.createdAt,
        input.expiresAt,
        input.consumedAt
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
            expires_at AS expiresAt,
            consumed_at AS consumedAt
          FROM password_reset_tokens
          WHERE token_hash = ?
        `
      )
      .get(tokenHash) as PasswordResetRecord | undefined;

    return row ?? null;
  }

  consume(id: string, consumedAt: string) {
    this.database
      .prepare(
        `
          UPDATE password_reset_tokens
          SET consumed_at = ?
          WHERE id = ?
        `
      )
      .run(consumedAt, id);
  }

  deleteByUserId(userId: string) {
    this.database
      .prepare(
        `
          DELETE FROM password_reset_tokens
          WHERE user_id = ?
        `
      )
      .run(userId);
  }

  deleteExpired(now: string) {
    this.database
      .prepare(
        `
          DELETE FROM password_reset_tokens
          WHERE expires_at <= ? OR consumed_at IS NOT NULL
        `
      )
      .run(now);
  }
}
