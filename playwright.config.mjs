import { defineConfig } from "@playwright/test";
import { createArgosReporterOptions } from "@argos-ci/playwright/reporter";

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    process.env.CI ? ["dot"] : ["list"],
    [
      "@argos-ci/playwright/reporter",
      createArgosReporterOptions({
        uploadToArgos:
          !!process.env.CI && !!process.env.ARGOS_TOKEN,
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
