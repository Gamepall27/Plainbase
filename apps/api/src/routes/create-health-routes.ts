import type { HealthResponse } from "@plainbase/shared";
import { Router } from "express";
import { ContentStore } from "../content/content-store.js";
import { PlainbaseDatabase } from "../db/plainbase-database.js";
import type { ApiServices } from "../services/create-services.js";

type HealthRouteDependencies = {
  contentStore: ContentStore;
  database: PlainbaseDatabase;
  services: ApiServices;
};

export function createHealthRoutes(dependencies: HealthRouteDependencies) {
  const router = Router();
  const { contentStore, database, services } = dependencies;

  router.get("/health", (_request, response) => {
    const summary = contentStore.getSummary();
    const payload: HealthResponse = {
      status: "ok",
      service: "plainbase-api",
      timestamp: new Date().toISOString(),
      storage: {
        type: "filesystem",
        rootPath: summary.rootPath,
        markdownFileCount: summary.markdownFileCount,
        directoryCount: summary.directoryCount,
        scanCompleted: summary.scanCompleted
      },
      database: database.getSummary()
    };

    response.json(payload);
  });

  router.get("/library/summary", (_request, response) => {
    response.json(contentStore.getSummary());
  });

  router.get("/demo-data", (_request, response) => {
    response.json(services.demoDataService.getDemoData());
  });

  return router;
}
