import { expect } from "chai";
import sinon from "sinon";
import {
  canvasToBlob,
  drawTransparencyBackground,
  hasContentInRegion,
  image2canvas,
} from "../../../sources/canvas/canvas-utils.js";

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

describe("canvasToBlob", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("resolves with a PNG Blob for a canvas with content", async () => {
    const canvas = createCanvas(4, 4);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 2, 2);

    const blob = await canvasToBlob(canvas);

    expect(blob).to.be.instanceOf(Blob);
    expect(blob.type).to.equal("image/png");
    expect(blob.size).to.be.greaterThan(0);
  });

  it("rejects when toBlob invokes the callback with null", async () => {
    const canvas = createCanvas(4, 4);
    sinon.stub(canvas, "toBlob").callsFake((callback) => {
      callback(null);
    });

    try {
      await canvasToBlob(canvas);
      expect.fail("expected rejection");
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal("Failed to create blob from canvas");
    }
  });

  it("rejects when toBlob throws synchronously", async () => {
    const canvas = createCanvas(4, 4);
    sinon.stub(canvas, "toBlob").throws(new Error("toBlob failed"));

    try {
      await canvasToBlob(canvas);
      expect.fail("expected rejection");
    } catch (err) {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal(
        "Canvas to Blob conversion failed: toBlob failed"
      );
    }
  });
});

describe("image2canvas", () => {
  it("creates a canvas matching source dimensions and copies pixels", () => {
    const src = createCanvas(16, 8);
    const sctx = src.getContext("2d");
    sctx.fillStyle = "#00ff00";
    sctx.fillRect(3, 2, 4, 4);

    const out = image2canvas(src);

    expect(out).not.to.equal(src);
    expect(out.width).to.equal(16);
    expect(out.height).to.equal(8);

    const outCtx = out.getContext("2d");
    const d = outCtx.getImageData(0, 0, 16, 8).data;
    const i = (2 * 16 + 3) * 4;
    expect([d[i], d[i + 1], d[i + 2], d[i + 3]]).to.deep.equal([
      0, 255, 0, 255,
    ]);
  });
});

describe("hasContentInRegion", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("returns false when the region is fully transparent", () => {
    const canvas = createCanvas(8, 8);
    const ctx = canvas.getContext("2d");
    expect(hasContentInRegion(ctx, 0, 0, 8, 8)).to.equal(false);
  });

  it("returns true when any channel in the region is non-zero", () => {
    const canvas = createCanvas(8, 8);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 1, 1);
    expect(hasContentInRegion(ctx, 0, 0, 4, 4)).to.equal(true);
  });

  it("returns false when the region does not overlap drawn pixels", () => {
    const canvas = createCanvas(8, 8);
    const ctx = canvas.getContext("2d");
    ctx.fillRect(0, 0, 1, 1);
    expect(hasContentInRegion(ctx, 4, 4, 2, 2)).to.equal(false);
  });

  it("returns false and warns when getImageData throws", () => {
    const canvas = createCanvas(8, 8);
    const ctx = canvas.getContext("2d");
    sinon.stub(ctx, "getImageData").throws(new Error("not readable"));
    const warnSpy = sinon.stub(console, "warn");

    expect(hasContentInRegion(ctx, 0, 0, 8, 8)).to.equal(false);
    expect(warnSpy.calledOnce).to.be.true;
    expect(warnSpy.firstCall.args[0]).to.equal("Error checking region content:");
  });
});

describe("drawTransparencyBackground", () => {
  it("should draw a checkered pattern on the canvas", () => {
    const width = 16;
    const height = 16;
    const squareSize = 8;

    // Create a mock canvas and context
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");

    // Call the function
    drawTransparencyBackground(context, width, height, squareSize);

    // Get pixel data
    const imageData = context.getImageData(0, 0, width, height).data;

    // Check the colors of the squares
    const lightGray = [204, 204, 204, 255]; // #CCCCCC
    const darkGray = [153, 153, 153, 255]; // #999999

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const pixel = [
          imageData[index],
          imageData[index + 1],
          imageData[index + 2],
          imageData[index + 3],
        ];

        const isEvenRow = Math.floor(y / squareSize) % 2 === 0;
        const isEvenCol = Math.floor(x / squareSize) % 2 === 0;
        const isLight = isEvenRow === isEvenCol;

        if (isLight) {
          expect(pixel).to.deep.equal(lightGray);
        } else {
          expect(pixel).to.deep.equal(darkGray);
        }
      }
    }
  });

  it("should handle non-default square sizes", () => {
    const width = 24;
    const height = 24;
    const squareSize = 12;

    // Create a mock canvas and context
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");

    // Call the function
    drawTransparencyBackground(context, width, height, squareSize);

    // Get pixel data
    const imageData = context.getImageData(0, 0, width, height).data;

    // Check the colors of the squares
    const lightGray = [204, 204, 204, 255]; // #CCCCCC
    const darkGray = [153, 153, 153, 255]; // #999999

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const pixel = [
          imageData[index],
          imageData[index + 1],
          imageData[index + 2],
          imageData[index + 3],
        ];

        const isEvenRow = Math.floor(y / squareSize) % 2 === 0;
        const isEvenCol = Math.floor(x / squareSize) % 2 === 0;
        const isLight = isEvenRow === isEvenCol;

        if (isLight) {
          expect(pixel).to.deep.equal(lightGray);
        } else {
          expect(pixel).to.deep.equal(darkGray);
        }
      }
    }
  });
});
