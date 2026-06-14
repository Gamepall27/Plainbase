import assert from "node:assert/strict";
import test from "node:test";
import type { Addon } from "@plainbase/shared";
import { AddonRegistry } from "../../apps/web/src/addons/addon-registry.ts";
import { ExtensionPointRegistry } from "../../apps/web/src/addons/extension-point-registry.ts";

test("extension point registry collects and sorts sidebar and markdown extensions", () => {
  const registry = new ExtensionPointRegistry();

  registry.registerAddon({
    manifest: {
      id: "addon-docs",
      name: "Docs",
      version: "1.0.0",
      entry: "docs"
    },
    extensions: [
      {
        type: "sidebar-panel",
        id: "right.panel",
        title: "Right Panel",
        location: "right",
        order: 20,
        render: () => "right"
      },
      {
        type: "sidebar-panel",
        id: "left.panel",
        title: "Left Panel",
        location: "left",
        order: 10,
        render: () => "left"
      },
      {
        type: "markdown-block-renderer",
        id: "docs.markdown",
        title: "Docs Markdown",
        language: "docs",
        order: 5,
        render: () => "docs"
      }
    ]
  });

  assert.equal(registry.getSidebarPanels("left")[0]?.id, "left.panel");
  assert.equal(registry.getSidebarPanels("right")[0]?.id, "right.panel");
  assert.equal(registry.getMarkdownBlockRenderers()[0]?.id, "docs.markdown");
});

test("addon registry loads enabled addons and reports invalid or unknown entries", () => {
  const addons: Addon[] = [
    {
      id: "addon-diagrams",
      name: "Diagrams",
      version: "1.0.0",
      description: "Diagrams",
      enabled: true,
      manifestJson: JSON.stringify({
        id: "addon-diagrams",
        name: "Diagrams",
        version: "1.0.0",
        entry: "diagrams",
        extensions: [
          {
            type: "markdown-block-renderer",
            id: "diagrams.renderer",
            title: "Renderer",
            language: "diagram"
          }
        ]
      })
    },
    {
      id: "addon-disabled",
      name: "Disabled",
      version: "1.0.0",
      description: "Disabled",
      enabled: false,
      manifestJson: JSON.stringify({
        id: "addon-disabled",
        name: "Disabled",
        version: "1.0.0",
        entry: "diagrams"
      })
    },
    {
      id: "addon-unknown",
      name: "Unknown",
      version: "1.0.0",
      description: "Unknown",
      enabled: true,
      manifestJson: JSON.stringify({
        id: "addon-unknown",
        name: "Unknown",
        version: "1.0.0",
        entry: "missing-entry"
      })
    },
    {
      id: "addon-invalid",
      name: "Invalid",
      version: "1.0.0",
      description: "Invalid",
      enabled: true,
      manifestJson: "{\"entry\":42}"
    }
  ];

  const registry = AddonRegistry.fromAddons(addons);

  assert.deepEqual(registry.getActiveAddonIds(), ["addon-diagrams"]);
  assert.equal(registry.getMarkdownBlockRenderers().length, 1);
  assert.equal(registry.getWarnings().length, 2);
  assert.match(registry.getWarnings()[0] ?? "", /Kein Frontend-Addon/);
  assert.match(registry.getWarnings()[1] ?? "", /ungueltiges Manifest/);
});
