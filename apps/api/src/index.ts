import { apiConfig } from "./config.js";
import { createPlainbaseApiApp } from "./app.js";

const { app, database } = createPlainbaseApiApp();

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
