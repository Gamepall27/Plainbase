import type { AddonResponse, AddonsResponse } from "@plainbase/shared";
import { Router } from "express";
import { canManageAddons } from "../auth/permissions.js";
import { requirePermission } from "../middleware/require-permission.js";
import { AddonService } from "../services/addon-service.js";
import { readRouteParam } from "../services/validation.js";

export function createAddonRoutes(addonService: AddonService) {
  const router = Router();

  router.get("/addons", (_request, response) => {
    const payload: AddonsResponse = {
      success: true,
      data: {
        addons: addonService.listAddons()
      }
    };

    response.json(payload);
  });

  router.put(
    "/addons/:addonId/toggle",
    requirePermission(
      canManageAddons,
      "The active demo user cannot manage addons."
    ),
    (request, response) => {
      const addonId = readRouteParam(request.params, "addonId");
      const payload: AddonResponse = {
        success: true,
        data: {
          addon: addonService.toggleAddon(addonId)
        }
      };

      response.json(payload);
    }
  );

  return router;
}
