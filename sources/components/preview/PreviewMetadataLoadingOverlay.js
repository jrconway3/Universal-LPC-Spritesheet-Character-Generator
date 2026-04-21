// Semi-transparent layer over the preview canvas until layers + offscreen canvas + bootstrap draw.
import { getPreviewCanvasLoadingMessage } from "../../state/preview-canvas-loading.js";

export const PreviewMetadataLoadingOverlay = {
  view: function () {
    const message = getPreviewCanvasLoadingMessage();
    if (!message) {
      return null;
    }
    return m(
      "div.preview-canvas-loading-overlay",
      { role: "status", "aria-live": "polite" },
      m("div.preview-canvas-loading-inner.has-text-centered", [
        m("span.loading", { "aria-label": "Loading metadata" }),
        m("p.is-size-7.mt-2.mb-0.has-text-grey", message),
      ]),
    );
  },
};
