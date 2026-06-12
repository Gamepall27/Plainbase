import {
  type AddonDefinition,
  type AddonManifest,
  parseAddonManifestFromAddon
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
      manifest = parseAddonManifestFromAddon(addon);
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
