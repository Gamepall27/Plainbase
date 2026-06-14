import assert from "node:assert/strict";
import test from "node:test";
import {
  defineAddon,
  parseAddonManifest,
  parseAddonManifestFromAddon,
  parseAddonManifestJson
} from "../../packages/addon-sdk/src/index.ts";

test("defineAddon returns the original addon definition", () => {
  const addon = defineAddon({
    manifest: {
      id: "addon-docs",
      name: "Docs",
      version: "1.0.0",
      entry: "docs"
    },
    extensions: []
  });

  assert.equal(addon.manifest.entry, "docs");
});

test("addon manifest parsers accept valid manifests and legacy entry formats", () => {
  const manifest = parseAddonManifest({
    id: "addon-docs",
    name: "Docs",
    version: "1.0.0",
    entry: "docs",
    capabilities: ["sidebar"],
    extensions: [
      {
        type: "sidebar-panel",
        id: "docs.sidebar",
        title: "Docs Sidebar",
        location: "left"
      },
      {
        type: "backend-route",
        id: "docs.route",
        title: "Docs Route",
        path: "/docs",
        method: "GET"
      }
    ]
  });

  assert.equal(manifest.extensions?.length, 2);
  assert.equal(parseAddonManifestJson(JSON.stringify(manifest)).entry, "docs");

  const legacyManifest = parseAddonManifestFromAddon({
    id: "legacy-addon",
    name: "Legacy Addon",
    version: "0.1.0",
    description: "Legacy",
    manifestJson: JSON.stringify({
      entry: "/addons/legacy/index.js",
      capabilities: ["legacy-capability"]
    })
  });

  assert.equal(legacyManifest.entry, "legacy");
  assert.deepEqual(legacyManifest.capabilities, ["legacy-capability"]);
});

test("addon manifest parsers reject invalid shapes with clear errors", () => {
  assert.throws(
    () => parseAddonManifest(null),
    /Addon manifest must be an object/
  );
  assert.throws(
    () =>
      parseAddonManifest({
        id: "addon-docs",
        name: "Docs",
        version: "1.0.0",
        entry: "docs",
        extensions: [
          {
            type: "backend-route",
            id: "docs.route",
            title: "Docs Route",
            path: "/docs",
            method: "PATCH"
          }
        ]
      }),
    /must be GET, POST, PUT, or DELETE/
  );
  assert.throws(
    () =>
      parseAddonManifestFromAddon({
        id: "broken-addon",
        name: "Broken Addon",
        version: "0.1.0",
        description: "Broken",
        manifestJson: "{\"entry\":42}"
      }),
    /ungueltiges Manifest/
  );
});
