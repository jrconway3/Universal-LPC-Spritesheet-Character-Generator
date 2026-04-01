import { test } from "@playwright/test";
import { argosScreenshot } from "@argos-ci/playwright";

/** Base URL for the static site (see `webServer` in playwright.config.mjs). */
const BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://127.0.0.1:4173";

/**
 * Viewports: mobile, tablet, medium desktop, huge desktop.
 * Heights are chosen so typical layouts have room to scroll if needed.
 */
const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 834, height: 1112 },
  mediumDesktop: { width: 1440, height: 900 },
  hugeDesktop: { width: 2560, height: 1440 },
};

/**
 * Full-page Argos screenshot. Wraps `argosScreenshot` from `@argos-ci/playwright`.
 * When `ARGOS_TOKEN` is unset, skips capture so `npm run test:visual` can verify
 * navigation and layout without talking to Argos (see CONTRIBUTING.md).
 */
async function argosDesktop(page, name) {
  if (!process.env.ARGOS_TOKEN?.trim()) {
    return;
  }
  await argosScreenshot(page, name);
}

test.describe("Homepage — full page", () => {
  test("mobile viewport", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto(`${BASE_URL}/`);
    await argosDesktop(page, "index-mobile");
  });

  test("tablet viewport", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto(`${BASE_URL}/`);
    await argosDesktop(page, "index-tablet");
  });

  test("medium desktop viewport", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mediumDesktop);
    await page.goto(`${BASE_URL}/`);
    await argosDesktop(page, "index-medium-desktop");
  });

  test("huge desktop viewport", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.hugeDesktop);
    await page.goto(`${BASE_URL}/`);
    await argosDesktop(page, "index-huge-desktop");
  });
});
