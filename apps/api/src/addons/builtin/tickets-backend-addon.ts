import { defineAddon } from "@plainbase/addon-sdk";
import type { Router } from "express";

export const ticketsBackendAddon = defineAddon<never, Router>({
  manifest: {
    id: "addon-tickets",
    name: "Tickets",
    version: "1.0.0",
    description: "Vorbereitung fuer spaetere Ticket-Backend-Routen.",
    entry: "tickets",
    capabilities: ["tickets", "sidebar"],
    extensions: [
      {
        type: "backend-route",
        id: "tickets.backend.routes",
        title: "Tickets Backend Routes",
        path: "/addons/tickets",
        method: "GET"
      }
    ]
  },
  extensions: [
    {
      type: "backend-route",
      id: "tickets.backend.routes",
      title: "Tickets Backend Routes",
      path: "/addons/tickets",
      method: "GET",
      register: ({ manifest, router }) => {
        router.get("/addons/tickets", (_request, response) => {
          response.json({
            success: true,
            data: {
              addon: {
                id: manifest.id,
                name: manifest.name,
                version: manifest.version
              },
              capabilities: manifest.capabilities ?? [],
              message: "Tickets backend extension point is ready."
            }
          });
        });
      }
    }
  ]
});
