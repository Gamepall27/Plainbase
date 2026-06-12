import { Router, type Express } from "express";
import { BackendAddonRegistry } from "./backend-addon-registry.js";
import { AddonService } from "../services/addon-service.js";

export function registerAddonBackendRoutes(
  app: Express,
  addonService: AddonService
) {
  const registry = BackendAddonRegistry.fromAddons(addonService.listEnabledAddons());
  const addonRouter = Router();

  for (const entry of registry.getRouteExtensions()) {
    try {
      entry.extension.register({
        manifest: entry.manifest,
        router: addonRouter
      });
    } catch (error) {
      console.warn(
        `[addons] Route registration failed for "${entry.manifest.name}": ${getErrorMessage(error)}`
      );
    }
  }

  app.use("/api", addonRouter);

  for (const warning of registry.getWarnings()) {
    console.warn(`[addons] ${warning}`);
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error.";
}
