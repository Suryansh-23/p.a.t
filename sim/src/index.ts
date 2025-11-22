/**
 * Main TUI application entry point
 */

import { App } from "./app.js";

async function main() {
  const app = new App();

  try {
    await app.start();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

main();
