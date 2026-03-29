import {
  ANIMATION_CONFIGS,
  FRAME_SIZE,
  STANDARD_ANIMATION_FRAMES_PER_ROW,
} from "../state/constants.js";
import { drawFramesToCustomAnimation } from "../canvas/draw-frames.js";
import { customAnimationSize } from "../custom-animations.js";
import {
  canvasToBlob,
  get2DContext,
  hasContentInRegion,
} from "../canvas/canvas-utils.js";

/**
 * Maps direction names to row indices on a custom-animation grid (LPC order:
 * up, left, down, right).
 */
export const CUSTOM_ANIM_DIRECTION_TO_ROW = Object.freeze({
  up: 0,
  left: 1,
  down: 2,
  right: 3,
});

function createFrameCanvasPool(poolSize, frameWidth, frameHeight) {
  const canvasPool = [];
  for (let i = 0; i < poolSize; i++) {
    const frameCanvas = document.createElement("canvas");
    frameCanvas.width = frameWidth;
    frameCanvas.height = frameHeight;
    const frameCtx = get2DContext(frameCanvas, true);
    if (frameCtx) {
      canvasPool.push({ canvas: frameCanvas, ctx: frameCtx });
    }
  }
  return canvasPool;
}

function blitFrameFromSheet(destCtx, sourceCanvas, sourceX, sourceY, size) {
  destCtx.clearRect(0, 0, size, size);
  destCtx.drawImage(
    sourceCanvas,
    sourceX,
    sourceY,
    size,
    size,
    0,
    0,
    size,
    size
  );
}

export function newAnimationFromSheet(src, srcRect) {
  const { x, y, width, height } = srcRect || {
    x: 0,
    y: 0,
    width: src.width,
    height: src.height,
  };
  const fromSubregion =
    x !== 0 || y !== 0 || width !== src.width || height !== src.height;
  if (fromSubregion) {
    const srcCtx = get2DContext(src, true);
    if (!hasContentInRegion(srcCtx, x, y, width, height)) return null;
  }

  const animCanvas = document.createElement("canvas");
  animCanvas.width = width;
  animCanvas.height = height;
  const animCtx = get2DContext(animCanvas, true);

  if (!animCtx) {
    throw new Error("Failed to get canvas context");
  }

  animCtx.drawImage(src, x, y, width, height, 0, 0, width, height);

  return animCanvas;
}

export async function addAnimationToZipFolder(folder, fileName, srcCanvas, srcRect) {
  if (srcCanvas) {
    const animCanvas = newAnimationFromSheet(srcCanvas, srcRect);
    if (animCanvas) {
      const blob = await canvasToBlob(animCanvas);
      const zipEntryName = fileName.endsWith(".png")
        ? fileName
        : `${fileName}.png`;
      if (window.DEBUG) {
        console.log(
          `Adding to ZIP: `,
          `${folder.root}${zipEntryName}`,
          "size: ",
          blob.size
        );
      }
      folder.file(zipEntryName, blob);
      return animCanvas;
    }
  }
}

/**
 * Renders the full custom animation layout from drawable `src` (e.g. a layer
 * sprite) onto a new canvas sized to that animation via `customAnimationSize`.
 */
export function newStandardAnimationForCustomAnimation(src, custAnim) {
  const custCanvas = document.createElement("canvas");
  const { width: custWidth, height: custHeight } =
    customAnimationSize(custAnim);
  custCanvas.width = custWidth;
  custCanvas.height = custHeight;
  const custCtx = get2DContext(custCanvas, true);
  drawFramesToCustomAnimation(custCtx, custAnim, 0, src, null);
  return custCanvas;
}

/**
 * Encodes the standard-animation slice for a custom animation as PNG and adds
 * it to a JSZip subfolder under the given filename.
 */
export async function addStandardAnimationToZipCustomFolder(
  custAnimFolder,
  itemFileName,
  src,
  custAnim
) {
  const custCanvas = newStandardAnimationForCustomAnimation(src, custAnim);
  const custBlob = await canvasToBlob(custCanvas);
  custAnimFolder.file(itemFileName, custBlob);
  return custCanvas;
}

/**
 * Splits a built-in LPC animation canvas (rows = directions, 13 frames per row)
 * into per-frame canvases. Skips frames that are fully transparent in the sheet.
 */
export function extractFramesFromAnimation(
  animationCanvas,
  animationName,
  directions = ["up", "down", "left", "right"]
) {
  const frames = {};
  const config = ANIMATION_CONFIGS[animationName];
  if (!config) return frames;

  const frameWidth = FRAME_SIZE;
  const frameHeight = FRAME_SIZE;
  const framesPerRow = STANDARD_ANIMATION_FRAMES_PER_ROW;

  const sourceCtx = animationCanvas.getContext("2d", {
    willReadFrequently: true,
  });
  if (!sourceCtx) {
    console.error("Failed to get animation canvas context");
    return frames;
  }

  const canvasPool = createFrameCanvasPool(
    directions.length * framesPerRow,
    frameWidth,
    frameHeight
  );

  let poolIndex = 0;

  for (
    let dirIndex = 0;
    dirIndex < directions.length && dirIndex < config.num;
    dirIndex++
  ) {
    const direction = directions[dirIndex];
    frames[direction] = [];

    const sourceY = dirIndex * frameHeight;

    const rowImageData = sourceCtx.getImageData(
      0,
      sourceY,
      animationCanvas.width,
      frameHeight
    );

    for (let frameIndex = 0; frameIndex < framesPerRow; frameIndex++) {
      const sourceX = frameIndex * frameWidth;

      const hasContent = checkFrameContentFromImageData(
        rowImageData,
        sourceX,
        frameWidth,
        frameHeight
      );

      if (hasContent && poolIndex < canvasPool.length) {
        const { canvas: frameCanvas, ctx: frameCtx } = canvasPool[poolIndex++];

        blitFrameFromSheet(
          frameCtx,
          animationCanvas,
          sourceX,
          sourceY,
          frameWidth
        );

        frames[direction].push({
          canvas: frameCanvas,
          frameNumber: frameIndex + 1,
        });
      }
    }
  }

  return frames;
}

/**
 * Returns whether a horizontal slice of pre-fetched row `ImageData` has any
 * non-transparent pixel in the frame column starting at `startX`.
 */
export function checkFrameContentFromImageData(
  imageData,
  startX,
  frameWidth,
  frameHeight
) {
  const data = imageData.data;
  const imageWidth = imageData.width;

  for (let y = 0; y < frameHeight; y++) {
    for (let x = startX; x < startX + frameWidth && x < imageWidth; x++) {
      const pixelIndex = (y * imageWidth + x) * 4;
      const alpha = data[pixelIndex + 3];
      if (alpha > 0) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Splits a custom-animation canvas using that animation's `frameSize` and
 * `frames` layout; emits one small canvas per frame per direction (all frames
 * included, including fully transparent ones).
 */
export function extractFramesFromCustomAnimation(
  animationCanvas,
  customAnimationDef,
  directions = ["up", "down", "left", "right"]
) {
  const frames = {};
  const frameSize = customAnimationDef.frameSize;
  const animationFrames = customAnimationDef.frames;

  if (window.DEBUG) {
    console.log(`Extracting frames from custom animation:`, {
      frameSize,
      animationFrames,
      canvasSize: {
        width: animationCanvas.width,
        height: animationCanvas.height,
      },
    });
  }

  const sourceCtx = animationCanvas.getContext("2d", {
    willReadFrequently: true,
  });
  if (!sourceCtx) {
    console.error("Failed to get custom animation canvas context");
    return frames;
  }

  const maxFrames = Math.max(...animationFrames.map((row) => row.length));
  const canvasPool = createFrameCanvasPool(
    directions.length * maxFrames,
    frameSize,
    frameSize
  );

  let poolIndex = 0;

  for (const direction of directions) {
    const dirIndex = CUSTOM_ANIM_DIRECTION_TO_ROW[direction];
    if (dirIndex >= animationFrames.length) {
      if (window.DEBUG) {
        console.log(
          `Skipping direction ${direction} (index ${dirIndex}) - not enough rows in animation frames`
        );
      }
      continue;
    }

    frames[direction] = [];
    const frameRow = animationFrames[dirIndex];
    const sourceY = dirIndex * frameSize;

    if (window.DEBUG) {
      console.log(`Processing direction ${direction} (row ${dirIndex}):`, frameRow);
    }

    try {
      sourceCtx.getImageData(0, sourceY, animationCanvas.width, frameSize);
    } catch (e) {
      console.warn(`Failed to get image data for row ${dirIndex}:`, e);
      continue;
    }

    for (let frameIndex = 0; frameIndex < frameRow.length; frameIndex++) {
      const sourceX = frameIndex * frameSize;

      if (poolIndex >= canvasPool.length) break;

      const { canvas: frameCanvas, ctx: frameCtx } = canvasPool[poolIndex++];

      blitFrameFromSheet(
        frameCtx,
        animationCanvas,
        sourceX,
        sourceY,
        frameSize
      );

      frames[direction].push({
        canvas: frameCanvas,
        frameNumber: frameIndex + 1,
      });

      if (window.DEBUG) {
        console.log(`Added frame ${frameIndex + 1} for direction ${direction}`);
      }
    }
  }

  return frames;
}
