export type AddonManifest = {
  id: string;
  name: string;
  version: string;
};

export function defineAddon(manifest: AddonManifest) {
  return manifest;
}
