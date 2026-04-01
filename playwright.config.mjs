import { defineConfig } from "@playwright/test";
import { createArgosReporterOptions } from "@argos-ci/playwright/reporter";

export default defineConfig({
  testDir: "./tests/visual",
  webServer: {
    command: "npx serve -l 4173 .",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    process.env.CI ? ["dot"] : ["list"],
    [
      "@argos-ci/playwright/reporter",
      createArgosReporterOptions({
        uploadToArgos: !!process.env.ARGOS_TOKEN?.trim(),
      }),
    ],
  ],
  use: {
    browserName: "chromium",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    bypassCSP: true,
  },
});
