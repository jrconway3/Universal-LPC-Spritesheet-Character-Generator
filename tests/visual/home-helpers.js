/**
 * Shared homepage navigation + readiness wait for visual tests and tooling scripts.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} [baseUrl] Defaults to PLAYWRIGHT_TEST_BASE_URL or http://127.0.0.1:4173
 */
export async function gotoHomepageReady(
  page,
  baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL ?? "http://127.0.0.1:4173",
) {
  const normalized = `${baseUrl.replace(/\/$/, "")}/`;
  await page.goto(normalized, { waitUntil: "load" });
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
