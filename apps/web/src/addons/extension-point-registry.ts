import type {
  AddonDefinition,
  MarkdownBlockRendererExtension,
  SidebarPanelExtension
} from "@plainbase/addon-sdk";
import type { ReactNode } from "react";

export class ExtensionPointRegistry {
  private readonly markdownBlockRenderers: MarkdownBlockRendererExtension<string>[] =
    [];
  private readonly sidebarPanels: SidebarPanelExtension<ReactNode>[] = [];

  registerAddon(addon: AddonDefinition<ReactNode | string>) {
    for (const extension of addon.extensions) {
      switch (extension.type) {
        case "sidebar-panel":
          this.sidebarPanels.push(extension as SidebarPanelExtension<ReactNode>);
          break;
        case "markdown-block-renderer":
          this.markdownBlockRenderers.push(
            extension as MarkdownBlockRendererExtension<string>
          );
          break;
      }
    }
  }

  getMarkdownBlockRenderers() {
    return [...this.markdownBlockRenderers].sort(byOrder);
  }

  getSidebarPanels(location: "left" | "right") {
    return [...this.sidebarPanels]
      .filter((panel) => panel.location === location)
      .sort(byOrder);
  }
}

function byOrder(left: { order?: number }, right: { order?: number }) {
  return (left.order ?? 100) - (right.order ?? 100);
}
