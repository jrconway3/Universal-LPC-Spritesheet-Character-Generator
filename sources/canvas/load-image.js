import { debugWarn } from "../utils/debug.js";

let loadedImages = {};
/** @type {Map<string, Promise<HTMLImageElement>>} In-flight loads: same `src` shares one `Image` and one profiler span. */
const inFlight = new Map();

/**
 * Clears the in-memory image cache. Browser tests call this so a stubbed
 * `Image` constructor cannot poison later specs that share the same module.
 */
export function resetImageLoadCache() {
  loadedImages = {};
  inFlight.clear();
}

/**
 * Load an image
 */
export function loadImage(src) {
  if (loadedImages[src]) {
    return Promise.resolve(loadedImages[src]);
  }
  const existing = inFlight.get(src);
  if (existing) {
    return existing;
  }

  // Register in-flight *before* creating the Image. The Promise constructor runs
  // the executor synchronously; if we only `set` after `new Promise(...)`, a
  // second concurrent `loadImage(src)` can miss `inFlight` and create a second
  // `Image` for the same `src` (fails "share one in-flight request" in tests).
  let resolve;
  let reject;
  const p = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  inFlight.set(src, p);

  // Mark start of image load (span is actual fetch/decode)
  const profiler = window.profiler;
  if (profiler) {
    profiler.mark(`image-load:${src}:start`);
  }

  const img = new Image();
  img.onload = () => {
    loadedImages[src] = img;
    inFlight.delete(src);

    if (profiler) {
      profiler.mark(`image-load:${src}:end`);
      profiler.measure(
        `image-load:${src}`,
        `image-load:${src}:start`,
        `image-load:${src}:end`,
      );
    }

    resolve(img);
  };
  img.onerror = () => {
    inFlight.delete(src);
    console.error(`Failed to load image: ${src}`);
    reject(new Error(`Failed to load ${src}`));
  };
  img.src = src;

  return p;
}

/**
 * Load multiple images in parallel
 * @param {Array} items - Array of items with a spritePath property
 * @param {Function} getPath - Optional function to extract path from item (defaults to item.spritePath)
 * @returns {Promise<Array>} Array of {item, img, success} objects
 */
export async function loadImagesInParallel(
  items,
  getPath = (item) => item.spritePath,
) {
  const promises = items.map((item) =>
    loadImage(getPath(item))
      .then((img) => ({ item, img, success: true }))
      .catch(() => {
        debugWarn(`Failed to load sprite: ${getPath(item)}`);
        return { item, img: null, success: false };
      }),
  );

  return Promise.all(promises);
}
