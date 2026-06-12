import {
  parseAddonManifestJson,
  type AddonDefinition,
  type AddonManifest,
  type BackendRouteExtension
} from "@plainbase/addon-sdk";
import type { Addon } from "@plainbase/shared";
import type { Router } from "express";
import { diagramsBackendAddon } from "./builtin/diagrams-backend-addon.js";
import { ticketsBackendAddon } from "./builtin/tickets-backend-addon.js";

const backendAddonCatalog: Record<string, AddonDefinition<never, Router>> = {
  diagrams: diagramsBackendAddon,
  tickets: ticketsBackendAddon
};

type LoadedBackendAddon = {
  addon: Addon;
  manifest: AddonManifest;
};

export class BackendAddonRegistry {
  private readonly loadedAddons: LoadedBackendAddon[] = [];
  private readonly routeExtensions: Array<{
    manifest: AddonManifest;
    extension: BackendRouteExtension<Router>;
  }> = [];
  private readonly warnings: string[] = [];

  static fromAddons(addons: Addon[]) {
    const registry = new BackendAddonRegistry();

    for (const addon of addons) {
      registry.registerAddon(addon);
    }

    return registry;
  }

  getLoadedAddons() {
    return [...this.loadedAddons];
  }

  getRouteExtensions() {
    return [...this.routeExtensions];
  }

  getWarnings() {
    return [...this.warnings];
  }

  private registerAddon(addon: Addon) {
    let manifest: AddonManifest;

    try {
      manifest = parseManifestWithFallback(addon);
    } catch (error) {
      this.warnings.push(getErrorMessage(error));
      return;
    }

    const definition = backendAddonCatalog[manifest.entry];

    this.loadedAddons.push({ addon, manifest });

    if (!definition) {
      this.warnings.push(
        `Kein Backend-Addon fuer Entry "${manifest.entry}" registriert.`
      );
      return;
    }

    for (const extension of definition.extensions) {
      if (extension.type === "backend-route") {
        this.routeExtensions.push({
          manifest,
          extension: extension as BackendRouteExtension<Router>
        });
      }
    }
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unbekannter Fehler.";
}

function parseManifestWithFallback(addon: Addon) {
  try {
    return parseAddonManifestJson(addon.manifestJson);
  } catch (error) {
    const legacyManifest = parseLegacyManifest(addon);

    if (legacyManifest) {
      return legacyManifest;
    }

    throw new Error(
      `Addon "${addon.name}" hat ein ungueltiges Manifest: ${getErrorMessage(error)}`
    );
  }
}

function parseLegacyManifest(addon: Addon): AddonManifest | null {
  try {
    const parsed = JSON.parse(addon.manifestJson) as Record<string, unknown>;
    const entry = normalizeLegacyEntry(parsed.entry);

    if (!entry) {
      return null;
    }

    return {
      id: readOptionalString(parsed.id) ?? addon.id,
      name: readOptionalString(parsed.name) ?? addon.name,
      version: readOptionalString(parsed.version) ?? addon.version,
      description:
        readOptionalString(parsed.description) ?? addon.description ?? undefined,
      entry,
      capabilities: readOptionalStringArray(parsed.capabilities),
      extensions: undefined
    };
  } catch {
    return null;
  }
}

function normalizeLegacyEntry(value: unknown) {
  const entry = readOptionalString(value);

  if (!entry) {
    return null;
  }

  if (!entry.includes("/")) {
    return entry;
  }

  const segments = entry.split("/").filter(Boolean);
  const indexPosition = segments.lastIndexOf("index.js");

  if (indexPosition > 0) {
    return segments[indexPosition - 1] ?? null;
  }

  const lastSegment = segments.at(-1);

  if (!lastSegment) {
    return null;
  }

  return lastSegment.replace(/\.js$/i, "");
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function readOptionalStringArray(value: unknown) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    return undefined;
  }

  return value;
}
