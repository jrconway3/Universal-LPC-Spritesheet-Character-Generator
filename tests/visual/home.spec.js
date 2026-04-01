import { test } from "@playwright/test";

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
 * Full-page Argos screenshot. In Argos docs this is `argosScreenshot` from
 * `@argos-ci/playwright`; we use the name `argosDesktop` here for full-page captures.
 *
 * Stub: uncomment the import and body when you are ready to upload to Argos.
 */
async function argosDesktop(_page, _name) {
  // import { argosScreenshot } from "@argos-ci/playwright";
  // await argosScreenshot(_page, _name);
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
