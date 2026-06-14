import type { DatabaseSync } from "node:sqlite";
import type { Tenant } from "@plainbase/shared";

export class TenantRepository {
  constructor(private readonly database: DatabaseSync) {}

  list() {
    return this.database
      .prepare(
        `
          SELECT
            id,
            name,
            slug,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM tenants
          ORDER BY name
        `
      )
      .all() as Tenant[];
  }

  findById(id: string) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            name,
            slug,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM tenants
          WHERE id = ?
        `
      )
      .get(id) as Tenant | undefined;

    return row ?? null;
  }

  findBySlug(slug: string) {
    const row = this.database
      .prepare(
        `
          SELECT
            id,
            name,
            slug,
            created_at AS createdAt,
            updated_at AS updatedAt
          FROM tenants
          WHERE slug = ?
        `
      )
      .get(slug) as Tenant | undefined;

    return row ?? null;
  }

  create(tenant: Tenant) {
    this.database
      .prepare(
        `
          INSERT INTO tenants (id, name, slug, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `
      )
      .run(
        tenant.id,
        tenant.name,
        tenant.slug,
        tenant.createdAt,
        tenant.updatedAt
      );

    return tenant;
  }
}
