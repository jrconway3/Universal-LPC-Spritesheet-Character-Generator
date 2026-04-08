import {
  startPreviewAnimation,
  stopPreviewAnimation,
} from "../canvas/preview-animation.js";

/**
 * While ZIP export runs, Mithril `m.redraw()` and the preview canvas rAF loop
 * compete for the main thread. Suspend them after the first redraw (spinner)
 * and restore in `endZipExportUiSuspend()` (before the final redraw).
 *
 * Nesting depth allows future overlapping guards; each export uses one pair.
 */
let suspendDepth = 0;
/** @type {(() => void) | null} */
let savedRedraw = null;
let resumePreviewAnimation = false;

export function beginZipExportUiSuspend() {
  suspendDepth++;
  if (suspendDepth > 1) {
    return;
  }
  resumePreviewAnimation = stopPreviewAnimation();
  const mithril = typeof globalThis !== "undefined" ? globalThis.m : undefined;
  if (mithril && typeof mithril.redraw === "function") {
    savedRedraw = mithril.redraw.bind(mithril);
    mithril.redraw = () => {};
  }
}

export function endZipExportUiSuspend() {
  if (suspendDepth === 0) {
    return;
  }
  suspendDepth--;
  if (suspendDepth > 0) {
    return;
  }
  const mithril = typeof globalThis !== "undefined" ? globalThis.m : undefined;
  if (mithril && savedRedraw) {
    mithril.redraw = savedRedraw;
    savedRedraw = null;
  }
  if (resumePreviewAnimation) {
    startPreviewAnimation();
    resumePreviewAnimation = false;
  }
}
