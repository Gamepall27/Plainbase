import { defineAddon } from "@plainbase/addon-sdk";
import type { Router } from "express";

export const diagramsBackendAddon = defineAddon<never, Router>({
  manifest: {
    id: "addon-diagrams",
    name: "Diagrams",
    version: "1.3.0",
    description: "Beispiel-Addon fuer custom diagram-Markdown-Bloecke.",
    entry: "diagrams",
    capabilities: ["markdown", "diagram", "diagrams"],
    extensions: [
      {
        type: "backend-route",
        id: "diagrams.backend.routes",
        title: "Diagrams Backend Routes",
        path: "/addons/diagrams",
        method: "GET"
      }
    ]
  },
  extensions: [
    {
      type: "backend-route",
      id: "diagrams.backend.routes",
      title: "Diagrams Backend Routes",
      path: "/addons/diagrams",
      method: "GET",
      register: ({ manifest, router }) => {
        router.get("/addons/diagrams", (_request, response) => {
          response.json({
            success: true,
            data: {
              addon: {
                id: manifest.id,
                name: manifest.name,
                version: manifest.version
              },
              capabilities: manifest.capabilities ?? [],
              message: "Diagram backend extension point is ready."
            }
          });
        });
      }
    }
  ]
});
