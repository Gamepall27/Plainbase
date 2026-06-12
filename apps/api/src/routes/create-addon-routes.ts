import type { AddonResponse, AddonsResponse } from "@plainbase/shared";
import { Router } from "express";
import { AddonService } from "../services/addon-service.js";

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

  router.put("/addons/:addonId/toggle", (request, response) => {
    const payload: AddonResponse = {
      success: true,
      data: {
        addon: addonService.toggleAddon(request.params.addonId)
      }
    };

    response.json(payload);
  });

  return router;
}
