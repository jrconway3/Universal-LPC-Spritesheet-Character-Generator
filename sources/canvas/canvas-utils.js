// Canvas utility functions

import { debugWarn } from "../utils/debug.js";

/**
 * Encode a canvas as a PNG Blob (rejects if toBlob yields null or throws).
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Blob>}
 */
export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob from canvas"));
        }
      }, "image/png");
    } catch (err) {
      reject(new Error(`Canvas to Blob conversion failed: ${err.message}`));
    }
  });
}

/**
 * Get 2D context with image smoothing disabled for crisp pixel rendering
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {boolean} willReadFrequently - Whether the context will be used for frequent getImageData calls
 * @returns {CanvasRenderingContext2D | null} Context with smoothing disabled
 */
export function get2DContext(canvas, willReadFrequently = false) {
  const ctx = canvas.getContext("2d", { willReadFrequently });
  if (!ctx) {
    return null;
  }
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/**
 * Draw a loaded image onto a new canvas (same dimensions as the image).
 * @param {CanvasImageSource} img
 * @returns {HTMLCanvasElement}
 */
export function image2canvas(img) {
  const imgCanvas = document.createElement("canvas");
  imgCanvas.width = img.width;
  imgCanvas.height = img.height;
  const imgCtx = get2DContext(imgCanvas);
  if (!imgCtx) {
    throw new Error("Failed to get canvas context");
  }
  imgCtx.drawImage(img, 0, 0);
  return imgCanvas;
}

/**
 * Whether a rectangular region has any non-zero channel (including alpha) in its ImageData.
 * @param {CanvasRenderingContext2D} ctx
 */
export function hasContentInRegion(ctx, x, y, width, height) {
  try {
    const imageData = ctx.getImageData(x, y, width, height);
    return imageData.data.some((pixel) => pixel !== 0);
  } catch (e) {
    debugWarn("Error checking region content:", e);
    return false;
  }
}

/**
 * Get zPos for a layer
 */
export function getZPos(itemId, layerNum = 1) {
  const meta = window.itemMetadata[itemId];
  if (!meta) return 100;

  const layerKey = `layer_${layerNum}`;
  const layer = meta.layers?.[layerKey];

  return layer?.zPos ?? 100;
}

/**
 * Draw a checkered transparency background (like image editors)
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {number} squareSize - Size of each checker square (default 8px)
 */
export function drawTransparencyBackground(
  context,
  width,
  height,
  squareSize = 8,
) {
  const lightGray = "#CCCCCC";
  const darkGray = "#999999";

  for (let y = 0; y < height; y += squareSize) {
    for (let x = 0; x < width; x += squareSize) {
      // Alternate colors in a checkerboard pattern
      const isEvenRow = Math.floor(y / squareSize) % 2 === 0;
      const isEvenCol = Math.floor(x / squareSize) % 2 === 0;
      const isLight = isEvenRow === isEvenCol;

      context.fillStyle = isLight ? lightGray : darkGray;
      context.fillRect(x, y, squareSize, squareSize);
    }
  }
}
