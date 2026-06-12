import { AddonRepository } from "../db/repositories/addon-repository.js";
import { ApiError } from "../errors/api-error.js";

export class AddonService {
  constructor(private readonly addonRepository: AddonRepository) {}

  listAddons() {
    return this.addonRepository.list();
  }

  toggleAddon(addonId: string) {
    const addon = this.addonRepository.findById(addonId);

    if (!addon) {
      throw new ApiError(404, "NOT_FOUND", "Addon not found.");
    }

    const updatedAddon = this.addonRepository.updateEnabled(
      addonId,
      !addon.enabled
    );

    if (!updatedAddon) {
      throw new ApiError(500, "INTERNAL_SERVER_ERROR", "Addon update failed.");
    }

    return updatedAddon;
  }
}
