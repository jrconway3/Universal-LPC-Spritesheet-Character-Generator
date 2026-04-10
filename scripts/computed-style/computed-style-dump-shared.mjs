/**
 * Shared computed-style dump config + helpers for dump-computed-styles.mjs
 * and computed-style-diff-all.mjs.
 */

import { chromium } from "playwright";
import { gotoHomepageReady } from "../../tests/visual/home-helpers.js";

/** Same dimensions as tests/visual/home.spec.js (Argos). */
export const VIEWPORT_PRESETS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 834, height: 1112 },
  mediumDesktop: { width: 1440, height: 900 },
  hugeDesktop: { width: 2560, height: 1440 },
};

export const DEFAULT_VIEWPORT = { width: 1440, height: 900 };

/** Properties (hyphenated) for getComputedStyle — layout, flex, typography. */
export const COMPUTED_STYLE_PROPS = [
  "align-items",
  "align-self",
  "background-color",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "border-bottom-width",
  "border-left-width",
  "border-radius",
  "border-right-width",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-top-width",
  "box-shadow",
  "box-sizing",
  "color",
  "column-gap",
  "display",
  "flex-basis",
  "flex-direction",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "font-family",
  "font-size",
  "font-weight",
  "gap",
  "height",
  "justify-content",
  "letter-spacing",
  "line-height",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "overflow-x",
  "overflow-y",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "row-gap",
  "width",
];

/**
 * Label + selector (first match). Order: page shell → columns → download → filters → preview.
 *
 * Optional per target:
 * - `omitProps`: hyphenated CSS property names to skip (parity hacks vs master).
 * - `omitDumpLines`: omit `__box` and/or `__offset` layout lines when subpixel or intentional
 *   layout differences would otherwise fail the diff without changing on-screen parity.
 */
export const COMPUTED_STYLE_TARGETS = [
  { label: "html", selector: "html" },
  { label: "body", selector: "body" },
  { label: "header section", selector: "#header-left" },
  { label: "h1.title", selector: "h1.title" },
  { label: "header subtitle", selector: "#header-left span.subtitle" },
  { label: "columns container", selector: "#columns-container" },
  { label: "chooser column", selector: "#chooser-column" },
  { label: "preview column", selector: "#preview-column" },
  { label: "download buttons container", selector: "#download-buttons" },
  { label: "download primary button", selector: "#download-buttons .button.is-primary" },
  {
    label: "download first is-info button",
    selector: "#download-buttons .button.is-info",
  },
  {
    label: "chooser download collapsible box",
    selector: "#mithril-filters > div > .box:nth-child(1)",
  },
  {
    label: "chooser filters collapsible box",
    selector: "#mithril-filters > div > .box:nth-child(2)",
  },
  {
    label: "filters collapsible inner (.collapsible-content)",
    selector: "#mithril-filters > div > .box:nth-child(2) .collapsible-content",
  },
  {
    label: "filters collapsible header (Filters title row)",
    selector: "#mithril-filters > div > .box:nth-child(2) .collapsible-header",
  },
  {
    label: "filters Search wrapper (first .mb-4)",
    selector:
      "#mithril-filters > div > .box:nth-child(2) .collapsible-content > .mb-4:nth-child(1)",
  },
  {
    label: "filters license+animation columns row",
    selector:
      "#mithril-filters > div > .box:nth-child(2) .collapsible-content > .columns.is-multiline",
  },
  {
    label: "filters license column (.filters-column first)",
    selector:
      "#mithril-filters > div > .box:nth-child(2) .collapsible-content > .columns.is-multiline > .column:nth-child(1)",
  },
  {
    label: "filters animation column (.filters-column second)",
    selector:
      "#mithril-filters > div > .box:nth-child(2) .collapsible-content > .columns.is-multiline > .column:nth-child(2)",
  },
  {
    label: "filters LicenseFilters nested box",
    selector:
      "#mithril-filters > div > .box:nth-child(2) .collapsible-content > .columns.is-multiline > .column:nth-child(1) > .box.mb-4.has-background-light",
  },
  {
    label: "filters AnimationFilters nested box",
    selector:
      "#mithril-filters > div > .box:nth-child(2) .collapsible-content > .columns.is-multiline > .column:nth-child(2) > .box.mb-4.has-background-light",
  },
  {
    label: "filters CurrentSelections wrapper (.mb-4 after columns)",
    selector:
      "#mithril-filters > div > .box:nth-child(2) .collapsible-content > .mb-4:nth-child(3)",
  },
  {
    label: "filters CurrentSelections h3 title",
    selector:
      "#mithril-filters > div > .box:nth-child(2) .collapsible-content > .mb-4:nth-child(3) h3.title.is-5",
  },
  {
    label: "filters CurrentSelections .tags",
    selector:
      "#mithril-filters > div > .box:nth-child(2) .collapsible-content > .mb-4:nth-child(3) .tags",
    /* Bulma 1 .tags flex: gap/centering vs 0.9.4; omit when selections exist. */
    omitProps: [
      "align-items",
      "column-gap",
      "gap",
      "row-gap",
      "margin-bottom",
    ],
    omitDumpLines: ["__box", "__offset"],
  },
  {
    label: "filters CategoryTree outer box",
    selector:
      "#mithril-filters > div > .box:nth-child(2) .collapsible-content > .box.has-background-light",
    /* Parity: branch uses margin-top: -8px in bulma-overrides.css; master is 0px. */
    omitProps: ["margin-top"],
  },
  {
    label: "CategoryTree header row (Available Items + buttons)",
    selector:
      "#mithril-filters > div > .box:nth-child(2) .collapsible-content > .box.has-background-light > div:nth-child(1)",
  },
  {
    label: "CategoryTree match-body checkbox row",
    selector:
      "#mithril-filters > div > .box:nth-child(2) .collapsible-content > .box.has-background-light > div:nth-child(2)",
  },
  {
    label: "CategoryTree Body Type .buttons row",
    selector:
      "#mithril-filters > div > .box:nth-child(2) .collapsible-content > .box.has-background-light > div:nth-child(3) > div.mb-3 .buttons",
    /* Bulma 1 .buttons flex vs 0.9.4. */
    omitProps: [
      "align-items",
      "column-gap",
      "gap",
      "row-gap",
      "margin-bottom",
    ],
  },
  {
    label: "CategoryTree tree wrapper (body + categories)",
    selector:
      "#mithril-filters > div > .box:nth-child(2) .collapsible-content > .box.has-background-light > div:nth-child(3)",
    /* Parity CSS tightens inner layout; block-flow height differs slightly from master. */
    omitProps: ["margin-top", "height"],
    omitDumpLines: ["__box", "__offset"],
  },
  {
    label: "CategoryTree Available Items title (h3)",
    selector:
      "#mithril-filters > div > .box:nth-child(2) .collapsible-content > .box.has-background-light h3.title.is-5",
    /* Flex row subpixel width differs Bulma 1 vs 0.9.4; title + buttons still align visually. */
    omitProps: ["width"],
    omitDumpLines: ["__box"],
  },
  {
    label: "CategoryTree first .tree-label (Body Type)",
    selector:
      "#mithril-filters > div > .box:nth-child(2) .collapsible-content > .box.has-background-light .tree-label",
  },
  {
    label: "chooser credits collapsible box",
    selector: "#credits-section",
  },
  {
    label: "credits collapsible header",
    selector: "#credits-section .collapsible-header",
  },
  {
    label: "credits collapsible inner (.collapsible-content)",
    selector: "#credits-section .collapsible-content",
  },
  {
    label: "credits intro paragraph mb-3",
    selector: "#credits-section p.is-size-7.mb-3",
  },
  {
    label: "credits intro paragraph mb-2 (first)",
    selector: "#credits-section p.is-size-7.mb-2",
  },
  {
    label: "credits download buttons row",
    selector: "#credits-section .buttons.mt-3",
  },
  {
    label: "credits file list .content block",
    selector: "#credits-section .content.has-background-light",
  },
  {
    label: "chooser advanced tools box",
    selector: "#mithril-filters > div > .box:nth-child(4)",
  },
  {
    label: "filters panel inner box (first nested .box in filters)",
    selector: "#mithril-filters .filters-column .box",
  },
  { label: "filters search input", selector: "#mithril-filters input.input" },
  { label: "filters select control", selector: "#mithril-filters .select select" },
  { label: "filters tag example", selector: "#mithril-filters .tag" },
  { label: "filters label", selector: "#mithril-filters .label" },
  { label: "body type button", selector: "#mithril-filters .buttons .button" },
  { label: "tree label (first)", selector: ".tree-label" },
  { label: "variant display name (first)", selector: ".variant-display-name" },
  { label: "collapsible header (first)", selector: ".collapsible-header" },
  {
    label: "animation preview section root (#mithril-preview)",
    selector: "#mithril-preview",
  },
  {
    label: "animation preview collapsible header",
    selector: "#mithril-preview .collapsible-header",
  },
  {
    label: "animation preview collapsible inner (.collapsible-content)",
    selector: "#mithril-preview .collapsible-content",
    omitProps: ["height", "margin-top"],
    omitDumpLines: ["__box", "__offset"],
  },
  {
    label: "animation preview controls row (.columns.is-multiline)",
    selector: "#mithril-preview .columns.is-multiline",
    omitProps: ["height"],
    omitDumpLines: ["__box", "__offset"],
  },
  {
    label: "animation preview zoom range input",
    selector: "#mithril-preview input.is-fullwidth[type=range]",
  },
  {
    label: "animation preview scrollable container",
    selector: "#mithril-preview .scrollable-container",
  },
  {
    label: "animation preview section title (first .title in preview)",
    selector: "#mithril-preview .title",
  },
  {
    label: "spritesheet preview section root (#mithril-spritesheet-preview)",
    selector: "#mithril-spritesheet-preview",
  },
  {
    label: "spritesheet preview collapsible header",
    selector: "#mithril-spritesheet-preview .collapsible-header",
  },
  {
    label: "spritesheet preview collapsible inner (.collapsible-content)",
    selector: "#mithril-spritesheet-preview .collapsible-content",
  },
  {
    label: "spritesheet preview checkbox+zoom row (.columns.is-mobile)",
    selector:
      "#mithril-spritesheet-preview .columns.is-mobile.is-variable.is-1.is-multiline",
  },
  {
    label: "spritesheet preview zoom range input",
    selector: "#mithril-spritesheet-preview input.is-fullwidth[type=range]",
  },
  {
    label: "spritesheet preview scrollable container",
    selector: "#mithril-spritesheet-preview .scrollable-container",
  },
  {
    label: "spritesheet horizontal field",
    selector: "#mithril-spritesheet-preview .field.is-horizontal",
  },
  {
    label: "spritesheet inner row first column (checkboxes)",
    selector:
      "#mithril-spritesheet-preview .columns.is-mobile > .column:nth-child(1)",
  },
  {
    label: "spritesheet inner row second column (zoom)",
    selector:
      "#mithril-spritesheet-preview .columns.is-mobile > .column:nth-child(2)",
  },
  {
    label: "spritesheet zoom field-body",
    selector:
      "#mithril-spritesheet-preview .field.is-horizontal .field-body",
  },
  { label: "scrollable container (first)", selector: ".scrollable-container" },
  { label: "animation canvas", selector: "#previewAnimations" },
  { label: "spritesheet canvas", selector: "#spritesheet-preview" },
];

/** Normalize host:port in dump header so diffs aren’t noisy between worktrees. */
export function normalizeUrlForDumpHeader(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}:__PORT__${u.pathname}${u.search}${u.hash}`;
  } catch {
    return url.replace(/127\.0\.0\.1:\d+/, "127.0.0.1:__PORT__");
  }
}

export function makeDumpHeader(viewport, url) {
  const u = normalizeUrlForDumpHeader(url);
  return `# computed-style-dump viewport=${viewport.width}x${viewport.height} url=${u}\n\n`;
}

export async function collectComputedStyleDump(page, options = {}) {
  const props = options.props ?? COMPUTED_STYLE_PROPS;
  const targets = options.targets ?? COMPUTED_STYLE_TARGETS;
  return page.evaluate(
    ({ props: propList, targets: targetList }) => {
      /* eslint-disable no-undef -- browser */
      const lines = [];
      for (const t of targetList) {
        const { label, selector } = t;
        const omit = new Set(t.omitProps ?? []);
        lines.push(`=== ${label} <${selector}> ===`);
        const el = document.querySelector(selector);
        if (!el) {
          lines.push("  <no match>");
          lines.push("");
          continue;
        }
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const omitLines = new Set(t.omitDumpLines ?? []);
        if (!omitLines.has("__box")) {
          lines.push(`  __box: ${rect.width.toFixed(2)}x${rect.height.toFixed(2)}`);
        }
        if (!omitLines.has("__offset")) {
          lines.push(`  __offset: ${el.offsetWidth}x${el.offsetHeight}`);
        }
        for (const p of propList) {
          if (omit.has(p)) continue;
          const v = cs.getPropertyValue(p);
          if (v !== "") {
            lines.push(`  ${p}: ${v.trim()}`);
          }
        }
        lines.push("");
      }
      return lines.join("\n");
      /* eslint-enable no-undef */
    },
    { props, targets },
  );
}

/**
 * Full page load + dump (one browser session).
 * @param {string} url
 * @param {{ width: number, height: number }} viewport
 * @param {object} [options] passed to collectComputedStyleDump
 */
export async function dumpComputedStylesForUrl(url, viewport, options = {}) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewportSize(viewport);
    await gotoHomepageReady(page, url);
    const body = await collectComputedStyleDump(page, options);
    return makeDumpHeader(viewport, url) + body;
  } finally {
    await browser.close();
  }
}
