import type { DatabaseSync } from "node:sqlite";

type AppStateRow = {
  value: string;
};

export class AppStateRepository {
  constructor(private readonly database: DatabaseSync) {}

  getValue(key: string) {
    const row = this.database
      .prepare(
        `
          SELECT value
          FROM app_state
          WHERE key = ?
        `
      )
      .get(key) as AppStateRow | undefined;

    return row?.value ?? null;
  }

  setValue(key: string, value: string) {
    this.database
      .prepare(
        `
          INSERT INTO app_state (key, value)
          VALUES (?, ?)
          ON CONFLICT(key) DO UPDATE SET
            value = excluded.value
        `
      )
      .run(key, value);
  }
}
