export default class PinchToZoom {
  initialZoom = 1;
  currentZoom = 1;
  element = null;
  gesture = null;
  onZoom = null;

  /**
   * Loads `tinygesture` on demand (separate chunk) for pinch-to-zoom after the UI is up.
   */
  static async create(element, onZoom, initialZoom = 1) {
    const pinch = new PinchToZoom();
    pinch.element = element;
    pinch.onZoom = onZoom;
    pinch.initialZoom = initialZoom || 1;
    pinch.currentZoom = pinch.initialZoom;

    const { default: TinyGesture } = await import("tinygesture");
    pinch.gesture = new TinyGesture(element, { mouseSupport: false });

    pinch.gesture.on("pinch", () => {
      const scale = pinch.gesture.scale;
      pinch.currentZoom = pinch.initialZoom * scale;
      pinch.onZoom(pinch.currentZoom);
    });

    pinch.gesture.on("pinchend", () => {
      pinch.initialZoom = pinch.currentZoom;
    });

    return pinch;
  }

  destroy() {
    this.gesture?.destroy();
    this.gesture = null;
  }
}
