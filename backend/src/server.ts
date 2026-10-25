import { app } from "./app";
import { config } from "./config";

app.listen(config.port, "0.0.0.0", () => {
  console.info(`ClassVault API listening on port ${config.port}`);
});
