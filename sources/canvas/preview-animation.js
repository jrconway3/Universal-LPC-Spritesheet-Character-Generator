import { previewCanvas, previewCtx } from "./preview-canvas.js";
import { state } from "../state/state.js";
import { FRAME_SIZE, ANIMATION_CONFIGS } from "../state/constants.js";
import { drawTransparencyBackground } from "./canvas-utils.js";
import { canvas } from "./renderer.js";

// Animation preview state
let animationFrames = [1, 2, 3, 4, 5, 6, 7, 8]; // default for walk
let animRowStart = 8; // default for walk (row number)
let animRowNum = 4; // default for walk (number of rows to stack)
let currentFrameIndex = 0;
let lastFrameTime = Date.now();
let animationFrameId = null;

/**
 * Set which animation to preview
 */
export function setPreviewAnimation(animationName) {
	const config = ANIMATION_CONFIGS[animationName];
	if (!config) {
		console.error("Unknown animation:", animationName);
		return;
	}

	animationFrames = config.cycle;
	animRowStart = config.row;
	animRowNum = config.num;
	currentFrameIndex = 0;

	return animationFrames; // Return for display
}

/**
 * Start the preview animation loop
 */
export function startPreviewAnimation() {
	if (animationFrameId !== null) {
		return; // Already running
	}

	function nextFrame() {
		const fpsInterval = 1000 / 8; // 8 FPS
		const now = Date.now();
		const elapsed = now - lastFrameTime;

		if (elapsed > fpsInterval) {
			lastFrameTime = now - (elapsed % fpsInterval);

			if (previewCtx && canvas) {
				previewCtx.clearRect(
					0,
					0,
					previewCanvas.width,
					previewCanvas.height
				);

				// Draw transparency grid if enabled
				if (state.showTransparencyGrid) {
					drawTransparencyBackground(
						previewCtx,
						previewCanvas.width,
						previewCanvas.height
					);
				}

				currentFrameIndex =
					(currentFrameIndex + 1) % animationFrames.length;
				const currentFrame = animationFrames[currentFrameIndex];

				// Draw stacked rows from main canvas to preview
				for (let i = 0; i < animRowNum; i++) {
					previewCtx.drawImage(
						canvas,
						currentFrame * FRAME_SIZE, // source x
						(animRowStart + i) * FRAME_SIZE, // source y
						FRAME_SIZE, // source width
						FRAME_SIZE, // source height
						i * FRAME_SIZE, // dest x (spread horizontally)
						0, // dest y
						FRAME_SIZE, // dest width
						FRAME_SIZE // dest height
					);
				}
			}
		}

		animationFrameId = requestAnimationFrame(nextFrame);
	}

	nextFrame();
}

/**
 * Stop the preview animation loop
 */
export function stopPreviewAnimation() {
	if (animationFrameId !== null) {
		cancelAnimationFrame(animationFrameId);
		animationFrameId = null;
	}
}
