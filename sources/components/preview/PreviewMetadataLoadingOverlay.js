// Semi-transparent layer over the preview canvas until layers + offscreen canvas + bootstrap draw.
import m from "mithril";
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
      m("div.preview-canvas-loading-inner", [
        m("span.loading", {
          "aria-hidden": true,
        }),
        m("span.is-size-7.has-text-grey.preview-canvas-loading-text", message),
      ]),
    );
  },
};
