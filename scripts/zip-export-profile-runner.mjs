/* eslint-disable no-undef -- browser harness (window, document, m) */

/**
 * Browser harness for `scripts/zip-export-profile.mjs`.
 * Loads issue #382 fixture (longsword + full outfit) and runs ZIP export(s)
 * with real canvas + optional real JSZip.
 *
 * Query: `only=splitAnimations` | `splitItemSheets` | `splitItemAnimations` | `individualFrames`
 * — omit to run all four. `quick=1` uses fake JSZip.
 *
 * @see scripts/zip-export-profile.mjs
 */

import {
  initCanvas,
  canvas as rendererCanvas,
  layers,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  renderCharacter,
} from "../sources/canvas/renderer.js";
import {
  exportIndividualFrames,
  exportSplitAnimations,
  exportSplitItemAnimations,
  exportSplitItemSheets,
} from "../sources/state/zip.js";
import { resetState } from "../sources/state/hash.js";
import { state } from "../sources/state/state.js";
import { importStateFromJSON } from "../sources/state/json.js";
import issue382ItemMetadata from "../tests/fixtures/issue-382-itemdata.js";
import issue382Selections from "../tests/fixtures/issue-382-selections.js";

/** @type {readonly string[]} */
export const ZIP_PROFILE_EXPORT_KINDS = [
  "splitAnimations",
  "splitItemSheets",
  "splitItemAnimations",
  "individualFrames",
];

/**
 * @param {{ useRealJsZip?: boolean }} opts
 * @param {string | null} [opts.only] — one of {@link ZIP_PROFILE_EXPORT_KINDS}, or null for all
 */
async function runProfiles(opts = {}) {
  const useRealJsZip = opts.useRealJsZip !== false;
  const only = opts.only ?? null;

  if (only !== null && !ZIP_PROFILE_EXPORT_KINDS.includes(only)) {
    throw new Error(
      `Invalid only=${JSON.stringify(only)}; expected one of: ${ZIP_PROFILE_EXPORT_KINDS.join(", ")}`,
    );
  }

  const run = (kind) => only === null || only === kind;

  resetState();
  layers.length = 0;

  window.itemMetadata = {
    ...(window.itemMetadata || {}),
    ...issue382ItemMetadata,
  };

  Object.assign(state, importStateFromJSON(JSON.stringify(issue382Selections)));

  window.alert = () => {};
  if (typeof m !== "undefined" && m.redraw) {
    m.redraw = () => {};
  }

  const origCreateEl = document.createElement;
  document.createElement = function (tag) {
    if (tag === "a") {
      const el = origCreateEl.call(document, "a");
      el.click = () => {};
      return el;
    }
    return origCreateEl.call(document, tag);
  };
  const origCreateURL = URL.createObjectURL;
  const origRevokeURL = URL.revokeObjectURL;
  URL.createObjectURL = () => "blob:url";
  URL.revokeObjectURL = () => {};

  window.__zipExportProfiles = {};
  window.__lastZipExportProfile = undefined;

  window.canvasRenderer = {};

  const RealJSZip = window.JSZip;
  if (!useRealJsZip) {
    const { createFakeJSZip } = await import("../tests/helpers/fake-jszip.js");
    window.JSZip = function FakeJSZip() {
      return createFakeJSZip();
    };
  }

  initCanvas();
  const ctx = rendererCanvas.getContext("2d");
  ctx.fillStyle = "#445566";
  ctx.fillRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT);

  await renderCharacter(state.selections, state.bodyType);

  if (run("splitAnimations")) {
    await exportSplitAnimations();
    state.zipByAnimation.isRunning = false;
  }

  if (run("splitItemSheets")) {
    await exportSplitItemSheets();
    state.zipByItem.isRunning = false;
  }

  if (run("splitItemAnimations")) {
    await exportSplitItemAnimations();
    state.zipByAnimimationAndItem.isRunning = false;
  }

  if (run("individualFrames")) {
    await exportIndividualFrames();
    if (state.zipIndividualFrames) {
      state.zipIndividualFrames.isRunning = false;
    }
  }

  delete window.canvasRenderer;
  if (!useRealJsZip) {
    window.JSZip = RealJSZip;
  }
  document.createElement = origCreateEl;
  URL.createObjectURL = origCreateURL;
  URL.revokeObjectURL = origRevokeURL;

  const profiles = window.__zipExportProfiles || {};
  return {
    profiles,
    selectionLabel: "issue-382 (tests/fixtures/issue-382-selections.js)",
    useRealJsZip,
    only: only === null ? "all" : only,
  };
}

window.__ZIP_PROFILE_DATA__ = null;
window.__ZIP_PROFILE_READY__ = false;
window.__ZIP_PROFILE_ERROR__ = null;

const params = new URLSearchParams(window.location.search);
const quick =
  params.get("quick") === "1" || params.get("quick") === "true";
const onlyParam = params.get("only");
const only =
  onlyParam && onlyParam.trim() !== ""
    ? onlyParam.trim()
    : null;

runProfiles({ useRealJsZip: !quick, only })
  .then((data) => {
    window.__ZIP_PROFILE_DATA__ = data;
    window.__ZIP_PROFILE_READY__ = true;
    const el = document.getElementById("status");
    if (el) el.textContent = "Done (ZIP export profiling).";
  })
  .catch((err) => {
    window.__ZIP_PROFILE_ERROR__ = String(err?.stack || err);
    window.__ZIP_PROFILE_READY__ = true;
    const el = document.getElementById("status");
    if (el) el.textContent = `Error: ${window.__ZIP_PROFILE_ERROR__}`;
    console.error(err);
  });
