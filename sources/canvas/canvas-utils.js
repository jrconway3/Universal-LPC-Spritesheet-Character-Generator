// Canvas utility functions for pixel-perfect rendering

/**
 * Get 2D context with image smoothing disabled for crisp pixel rendering
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @returns {CanvasRenderingContext2D} Context with smoothing disabled
 */
export function get2DContext(canvas) {
	const ctx = canvas.getContext('2d');
	ctx.imageSmoothingEnabled = false;
	return ctx;
}
