import type { DatabaseSync } from "node:sqlite";
import type { Addon } from "@plainbase/shared";

type AddonRow = Omit<Addon, "enabled"> & {
  enabled: number;
};

export class AddonRepository {
  constructor(private readonly database: DatabaseSync) {}

  list() {
    const rows = this.database
      .prepare(
        `
          SELECT
            id,
            name,
            version,
            description,
            enabled,
            manifest_json AS manifestJson
          FROM addons
          ORDER BY name
        `
      )
      .all() as AddonRow[];

    return rows.map(mapAddonRow);
  }

  listEnabled() {
    const rows = this.database
      .prepare(
        `
          SELECT
            id,
            name,
            version,
            description,
            enabled,
            manifest_json AS manifestJson
          FROM addons
          WHERE enabled = 1
          ORDER BY name
        `
      )
      .all() as AddonRow[];

    return rows.map(mapAddonRow);
  }

  findById(id: string) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            name,
            version,
            description,
            enabled,
            manifest_json AS manifestJson
          FROM addons
          WHERE id = ?
        `
      )
      .get(id) as AddonRow | undefined;

    return row ? mapAddonRow(row) : null;
  }

  updateEnabled(id: string, enabled: boolean) {
    this.database
      .prepare(
        `
          UPDATE addons
          SET enabled = ?
          WHERE id = ?
        `
      )
      .run(enabled ? 1 : 0, id);

    return this.findById(id);
  }
}

function mapAddonRow(row: AddonRow): Addon {
  return {
    ...row,
    enabled: Boolean(row.enabled)
  };
}
