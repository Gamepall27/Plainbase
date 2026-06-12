import {
  parseAddonManifestJson,
  type AddonDefinition,
  type AddonManifest
} from "@plainbase/addon-sdk";
import type { Addon } from "@plainbase/shared";
import type { ReactNode } from "react";
import { diagramsAddon } from "./builtin/diagrams-addon";
import { ticketsAddon } from "./builtin/tickets-addon";
import { ExtensionPointRegistry } from "./extension-point-registry";

const frontendAddonCatalog: Record<string, AddonDefinition<ReactNode | string>> = {
  diagrams: diagramsAddon,
  tickets: ticketsAddon
};

export type LoadedAddon = {
  addon: Addon;
  manifest: AddonManifest;
};

export class AddonRegistry {
  private readonly extensionRegistry = new ExtensionPointRegistry();
  private readonly loadedAddons: LoadedAddon[] = [];
  private readonly warnings: string[] = [];

  static fromAddons(addons: Addon[]) {
    const registry = new AddonRegistry();

    for (const addon of addons) {
      if (!addon.enabled) {
        continue;
      }

      registry.registerAddon(addon);
    }

    return registry;
  }

  getActiveAddonIds() {
    return this.loadedAddons.map((addon) => addon.manifest.id);
  }

  getMarkdownBlockRenderers() {
    return this.extensionRegistry.getMarkdownBlockRenderers();
  }

  getSidebarPanels(location: "left" | "right") {
    return this.extensionRegistry.getSidebarPanels(location);
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

    const definition = frontendAddonCatalog[manifest.entry];

    if (!definition) {
      this.warnings.push(
        `Kein Frontend-Addon fuer Entry "${manifest.entry}" registriert.`
      );
      return;
    }

    this.loadedAddons.push({ addon, manifest });
    this.extensionRegistry.registerAddon(definition);
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
