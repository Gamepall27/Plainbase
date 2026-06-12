import {
  type AddonDefinition,
  type AddonManifest,
  type BackendRouteExtension,
  parseAddonManifestFromAddon
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
      manifest = parseAddonManifestFromAddon(addon);
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
