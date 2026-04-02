import { test } from "@playwright/test";
import { argosScreenshot } from "@argos-ci/playwright";

/** Base URL for the static site (see `webServer` in playwright.config.js). */
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

/** Argos stabilization tuned for a JS-heavy page with images and canvas. */
const ARGOS_SCREENSHOT_OPTIONS = {
  stabilize: {
    waitForFonts: true,
    waitForImages: true,
    waitForAriaBusy: true,
  },
};

/**
 * Load the homepage and wait until async work has settled: network, character
 * render (preview `.loading` overlays), then one paint frame.
 */
async function gotoHomepageReady(page) {
  const url = `${BASE_URL.replace(/\/$/, "")}/`;
  await page.goto(url, { waitUntil: "load" });
  try {
    await page.waitForLoadState("networkidle", { timeout: 45_000 });
  } catch {
    // Some environments never reach idle (long-polling, etc.); continue.
  }
  await page.waitForSelector("#mithril-preview canvas", {
    state: "visible",
    timeout: 120_000,
  });
  await page.waitForFunction(
    () => {
      const preview = document.getElementById("mithril-preview");
      const sheet = document.getElementById("mithril-spritesheet-preview");
      if (!preview || !sheet) {
        return false;
      }
      return (
        !preview.querySelector(".loading") && !sheet.querySelector(".loading")
      );
    },
    { timeout: 120_000 },
  );
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve(undefined);
          });
        });
      }),
  );
  /* Deterministic scroll: Bulma/layout changes can alter intrinsic heights; reset so
   * canvas/scroll regions (e.g. spritesheet preview) align with baseline captures. */
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.querySelectorAll(".scrollable-container").forEach((el) => {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    });
  });
}

/**
 * Full-page Argos screenshot. Wraps `argosScreenshot` from `@argos-ci/playwright`.
 * When `ARGOS_TOKEN` is unset, skips capture so `npm run test:visual` can verify
 * navigation and layout without talking to Argos (see CONTRIBUTING.md).
 */
async function argosDesktop(page, name) {
  if (!process.env.ARGOS_TOKEN?.trim()) {
    return;
  }
  await argosScreenshot(page, name, ARGOS_SCREENSHOT_OPTIONS);
}

test.describe("Homepage — full page", () => {
  test("mobile viewport", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await gotoHomepageReady(page);
    await argosDesktop(page, "index-mobile");
  });

  test("tablet viewport", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await gotoHomepageReady(page);
    await argosDesktop(page, "index-tablet");
  });

  test("medium desktop viewport", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mediumDesktop);
    await gotoHomepageReady(page);
    await argosDesktop(page, "index-medium-desktop");
  });

  test("huge desktop viewport", async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.hugeDesktop);
    await gotoHomepageReady(page);
    await argosDesktop(page, "index-huge-desktop");
  });
});
