const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  webServer: {
    command: "python -m http.server 8765 --bind 127.0.0.1",
    url: "http://127.0.0.1:8765",
    reuseExistingServer: true,
  },
  testDir: "./tests",
  timeout: 120000,
  workers: 1,
  use: {
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    baseURL: "http://127.0.0.1:8765",
    acceptDownloads: true,
  },
  reporter: "list",
});
