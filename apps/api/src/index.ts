import cors from "cors";
import express from "express";
import { apiConfig } from "./config.js";
import { ContentStore } from "./content/content-store.js";
import { PlainbaseDatabase } from "./db/plainbase-database.js";
import { registerRoutes } from "./routes/register-routes.js";

const app = express();
const contentStore = new ContentStore(apiConfig.contentRoot);
const database = new PlainbaseDatabase(apiConfig.databasePath);

database.initialize();

app.use(cors());
app.use(express.json());

registerRoutes(app, { contentStore, database });

const server = app.listen(apiConfig.port, apiConfig.host, () => {
  console.log(
    `Plainbase API listening on http://${apiConfig.host}:${apiConfig.port}`
  );
});

function shutdown() {
  server.close(() => {
    database.close();
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
