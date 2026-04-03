#!/usr/bin/env node
/**
 * Dump selected computed CSS properties for stable text diffing between branches
 * (e.g. master vs update_bulma) served from two worktrees on different ports.
 *
 * Usage:
 *   node scripts/dump-computed-styles.mjs http://127.0.0.1:4173 > /tmp/master.txt
 *   node scripts/dump-computed-styles.mjs http://127.0.0.1:4174 > /tmp/branch.txt
 *   diff -u /tmp/master.txt /tmp/branch.txt
 *
 * Or with labels and an output directory:
 *   node scripts/dump-computed-styles.mjs --out-dir /tmp/cmp --label master http://127.0.0.1:4173
 *   node scripts/dump-computed-styles.mjs --out-dir /tmp/cmp --label branch http://127.0.0.1:4174
 *
 * Options:
 *   --viewport WxH        Explicit size (default 1440x900 = Argos medium desktop)
 *   --preset NAME         Shorthand: mobile | tablet | mediumDesktop | hugeDesktop (same as tests/visual/home.spec.js)
 *   --out <file>          Write to file instead of stdout
 *   --out-dir <dir>       Implies --label required; writes <dir>/<label>.txt
 *
 * Mobile / responsive debugging (e.g. full-width Download buttons):
 *   node scripts/dump-computed-styles.mjs --preset mobile http://127.0.0.1:4173 > /tmp/master-mobile.txt
 *   node scripts/dump-computed-styles.mjs --preset mobile http://127.0.0.1:4174 > /tmp/branch-mobile.txt
 *   diff -u /tmp/master-mobile.txt /tmp/branch-mobile.txt
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { gotoHomepageReady } from "../tests/visual/home-helpers.js";

/** Properties that tend to matter for Bulma / layout parity (hyphenated). */
const PROPS = [
  "align-items",
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
  "flex-direction",
  "flex-basis",
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
  "min-height",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "row-gap",
  "width",
];

/**
 * Label (for section header) + selector (first match).
 * Extend this list as you discover hotspots during migration.
 */
const TARGETS = [
  { label: "body", selector: "body" },
  { label: "h1.title", selector: "h1.title" },
  { label: "header subtitle", selector: "#header-left span.subtitle" },
  { label: "download buttons container", selector: "#download-buttons" },
  { label: "download primary button", selector: "#download-buttons .button.is-primary" },
  {
    label: "download first is-info button",
    selector: "#download-buttons .button.is-info",
  },
  { label: "filters search input", selector: "#mithril-filters input.input" },
  { label: "filters select control", selector: "#mithril-filters .select select" },
  { label: "filters tag example", selector: "#mithril-filters .tag" },
  { label: "filters label", selector: "#mithril-filters .label" },
  { label: "body type button group", selector: "#mithril-filters .buttons .button" },
  { label: "tree label (first)", selector: ".tree-label" },
  { label: "variant display name (first)", selector: ".variant-display-name" },
  { label: "preview box", selector: "#mithril-preview .box" },
];

const DEFAULT_VIEWPORT = { width: 1440, height: 900 };

/** Same dimensions as tests/visual/home.spec.js (Argos viewports). */
const VIEWPORT_PRESETS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 834, height: 1112 },
  mediumDesktop: { width: 1440, height: 900 },
  hugeDesktop: { width: 2560, height: 1440 },
};

function parseArgs(argv) {
  const out = {
    url: null,
    outFile: null,
    outDir: null,
    label: null,
    viewport: { ...DEFAULT_VIEWPORT },
    help: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      out.help = true;
    } else if (a === "--out" && argv[i + 1]) {
      out.outFile = argv[++i];
    } else if (a === "--out-dir" && argv[i + 1]) {
      out.outDir = argv[++i];
    } else if (a === "--label" && argv[i + 1]) {
      out.label = argv[++i];
    } else if (a === "--preset" && argv[i + 1]) {
      const name = argv[++i];
      const preset = VIEWPORT_PRESETS[name];
      if (!preset) {
        throw new Error(
          `--preset must be one of: ${Object.keys(VIEWPORT_PRESETS).join(", ")}`,
        );
      }
      out.viewport = { ...preset };
    } else if (a === "--viewport" && argv[i + 1]) {
      const m = /^(\d+)x(\d+)$/.exec(argv[++i]);
      if (!m) {
        throw new Error("--viewport expects WxH e.g. 1440x900");
      }
      out.viewport = { width: Number(m[1]), height: Number(m[2]) };
    } else if (!a.startsWith("-")) {
      out.url = a;
    }
  }
  return out;
}

function printHelp() {
  console.error(`Usage:
  node scripts/dump-computed-styles.mjs [options] <url>

Options:
  --out <file>           Write dump to file (default: stdout)
  --out-dir <dir>        Write <dir>/<label>.txt (requires --label)
  --label <name>         Filename stem when using --out-dir
  --viewport WxH         Default ${DEFAULT_VIEWPORT.width}x${DEFAULT_VIEWPORT.height}
  --preset NAME          mobile | tablet | mediumDesktop | hugeDesktop (Argos / home.spec.js)
  --help, -h

Examples:
  node scripts/dump-computed-styles.mjs http://127.0.0.1:4173 > /tmp/master.txt
  node scripts/dump-computed-styles.mjs --preset mobile http://127.0.0.1:4173 > /tmp/master-mobile.txt
  node scripts/dump-computed-styles.mjs --out /tmp/branch.txt http://127.0.0.1:4174
  diff -u /tmp/master.txt /tmp/branch.txt
`);
}

function dumpHeader(viewport, url) {
  return `# computed-style-dump viewport=${viewport.width}x${viewport.height} url=${url}\n\n`;
}

async function collectDump(page) {
  return await page.evaluate(
    ({ props, targets }) => {
      /* eslint-disable no-undef -- runs in the page (browser) context */
      const lines = [];
      for (const { label, selector } of targets) {
        lines.push(`=== ${label} <${selector}> ===`);
        const el = document.querySelector(selector);
        if (!el) {
          lines.push("  <no match>");
          lines.push("");
          continue;
        }
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        lines.push(`  __box: ${rect.width.toFixed(2)}x${rect.height.toFixed(2)}`);
        lines.push(`  __offset: ${el.offsetWidth}x${el.offsetHeight}`);
        for (const p of props) {
          const v = cs.getPropertyValue(p);
          if (v !== "") {
            lines.push(`  ${p}: ${v.trim()}`);
          }
        }
        lines.push("");
      }
      /* eslint-enable no-undef */
      return lines.join("\n");
    },
    { props: PROPS, targets: TARGETS },
  );
}

async function run(url, viewport) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewportSize(viewport);
    await gotoHomepageReady(page, url);
    return await collectDump(page);
  } finally {
      await browser.close();
    }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.url) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }
  if (args.outDir && !args.label) {
    console.error("--out-dir requires --label <name> for the output filename");
    process.exit(1);
  }

  const body = await run(args.url, args.viewport);
  const text = dumpHeader(args.viewport, args.url) + body;

  if (args.outDir) {
    fs.mkdirSync(args.outDir, { recursive: true });
    const safe = args.label.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const outPath = path.join(args.outDir, `${safe}.txt`);
    fs.writeFileSync(outPath, text, "utf8");
    console.error(`Wrote ${outPath}`);
  } else if (args.outFile) {
    fs.writeFileSync(args.outFile, text, "utf8");
    console.error(`Wrote ${args.outFile}`);
  } else {
    process.stdout.write(text);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
