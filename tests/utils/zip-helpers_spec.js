import { expect } from "chai";
import sinon from "sinon";
import { customAnimations, customAnimationSize } from "../../sources/custom-animations.js";
import {
  addAnimationToZipFolder,
  addStandardAnimationToZipCustomFolder,
  checkFrameContentFromImageData,
  CUSTOM_ANIM_DIRECTION_TO_ROW,
  extractFramesFromAnimation,
  extractFramesFromCustomAnimation,
  newAnimationFromSheet,
  newStandardAnimationForCustomAnimation,
} from "../../sources/utils/zip-helpers.js";

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function createWheelchairTestSrc() {
  const canvas = createCanvas(192, 256);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#00aa33";
  ctx.fillRect(0, 0, 192, 256);
  return canvas;
}

describe("utils/zip-helpers.js", () => {
  describe("CUSTOM_ANIM_DIRECTION_TO_ROW", () => {
    it("maps LPC direction names to fixed row indices (up, left, down, right)", () => {
      expect(CUSTOM_ANIM_DIRECTION_TO_ROW).to.deep.equal({
        up: 0,
        left: 1,
        down: 2,
        right: 3,
      });
      expect(Object.isFrozen(CUSTOM_ANIM_DIRECTION_TO_ROW)).to.equal(true);
    });
  });

  describe("newAnimationFromSheet", () => {
    it("copies the full source when srcRect is omitted", () => {
      const src = createCanvas(24, 16);
      const sctx = src.getContext("2d");
      sctx.fillStyle = "#3366cc";
      sctx.fillRect(5, 3, 2, 2);

      const out = newAnimationFromSheet(src);

      expect(out.width).to.equal(24);
      expect(out.height).to.equal(16);
      const d = out.getContext("2d").getImageData(0, 0, 24, 16).data;
      const i = (3 * 24 + 5) * 4;
      expect([d[i], d[i + 1], d[i + 2], d[i + 3]]).to.deep.equal([
        51, 102, 204, 255,
      ]);
    });

    it("copies the full source when srcRect matches the entire canvas", () => {
      const src = createCanvas(12, 10);
      const sctx = src.getContext("2d");
      sctx.fillStyle = "#ff00aa";
      sctx.fillRect(0, 0, 1, 1);

      const out = newAnimationFromSheet(src, {
        x: 0,
        y: 0,
        width: 12,
        height: 10,
      });

      expect(out.width).to.equal(12);
      expect(out.height).to.equal(10);
      const d = out.getContext("2d").getImageData(0, 0, 1, 1).data;
      expect([d[0], d[1], d[2], d[3]]).to.deep.equal([255, 0, 170, 255]);
    });

    it("crops a subregion that contains pixels", () => {
      const src = createCanvas(32, 32);
      const sctx = src.getContext("2d");
      sctx.fillStyle = "#00ff00";
      sctx.fillRect(10, 11, 2, 2);

      const out = newAnimationFromSheet(src, {
        x: 10,
        y: 11,
        width: 2,
        height: 2,
      });

      expect(out.width).to.equal(2);
      expect(out.height).to.equal(2);
      const d = out.getContext("2d").getImageData(0, 0, 2, 2).data;
      for (let p = 0; p < 2 * 2; p++) {
        const i = p * 4;
        expect([d[i], d[i + 1], d[i + 2], d[i + 3]]).to.deep.equal([
          0, 255, 0, 255,
        ]);
      }
    });

    it("returns null when the subregion is fully transparent", () => {
      const src = createCanvas(40, 40);
      const out = newAnimationFromSheet(src, {
        x: 8,
        y: 8,
        width: 12,
        height: 12,
      });

      expect(out).to.equal(null);
    });

    it("accepts a DOMRect-like subregion for cropping", () => {
      const src = createCanvas(20, 20);
      src.getContext("2d").fillRect(4, 5, 3, 3);

      const out = newAnimationFromSheet(src, new DOMRect(4, 5, 3, 3));

      expect(out.width).to.equal(3);
      expect(out.height).to.equal(3);
      const d = out.getContext("2d").getImageData(1, 1, 1, 1).data;
      expect(d[3]).to.equal(255);
    });
  });

  describe("addAnimationToZipFolder", () => {
    afterEach(() => {
      sinon.restore();
    });

    function createFakeFolder() {
      const files = [];
      return {
        root: "custom/",
        file(name, blob) {
          files.push({ name, blob });
        },
        files,
      };
    }

    it("does nothing when srcCanvas is falsy", async () => {
      const folder = createFakeFolder();
      await addAnimationToZipFolder(folder, "out.png", null);
      expect(folder.files).to.have.length(0);
    });

    it("does nothing when newAnimationFromSheet returns null", async () => {
      const folder = createFakeFolder();
      const src = createCanvas(20, 20);
      await addAnimationToZipFolder(
        folder,
        "out.png",
        src,
        { x: 2, y: 2, width: 8, height: 8 }
      );
      expect(folder.files).to.have.length(0);
    });

    it("rejects when canvasToBlob fails (toBlob yields null)", async () => {
      sinon
        .stub(HTMLCanvasElement.prototype, "toBlob")
        .callsFake((callback) => callback(null));

      const folder = createFakeFolder();
      const src = createCanvas(8, 8);
      src.getContext("2d").fillRect(0, 0, 4, 4);

      try {
        await addAnimationToZipFolder(folder, "out.png", src);
        expect.fail("expected rejection");
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.equal("Failed to create blob from canvas");
      }
      expect(folder.files).to.have.length(0);
    });

    it("uses fileName as-is when it already ends with .png (no .png.png)", async () => {
      const folder = createFakeFolder();
      const src = createCanvas(4, 4);
      src.getContext("2d").fillRect(0, 0, 1, 1);

      await addAnimationToZipFolder(folder, "walk_south.png", src);

      expect(folder.files).to.have.length(1);
      expect(folder.files[0].name).to.equal("walk_south.png");
      expect(folder.files[0].name.endsWith(".png.png")).to.equal(false);
      expect(folder.files[0].blob).to.be.instanceOf(Blob);
    });

    it("appends .png once when fileName has no extension", async () => {
      const folder = createFakeFolder();
      const src = createCanvas(4, 4);
      src.getContext("2d").fillRect(0, 0, 1, 1);

      await addAnimationToZipFolder(folder, "050_body_male", src);

      expect(folder.files).to.have.length(1);
      expect(folder.files[0].name).to.equal("050_body_male.png");
    });

    it("resolves to the animation canvas on success", async () => {
      const folder = createFakeFolder();
      const src = createCanvas(6, 6);
      src.getContext("2d").fillRect(0, 0, 2, 2);

      const result = await addAnimationToZipFolder(folder, "a.png", src);

      expect(result).to.be.instanceOf(HTMLCanvasElement);
      expect(result.width).to.equal(6);
      expect(result.height).to.equal(6);
    });
  });

  describe("newStandardAnimationForCustomAnimation", () => {
    it("returns a canvas whose size matches customAnimationSize", () => {
      const custAnim = customAnimations.wheelchair;
      const src = createWheelchairTestSrc();

      const out = newStandardAnimationForCustomAnimation(src, custAnim);
      const expected = customAnimationSize(custAnim);

      expect(out.width).to.equal(expected.width);
      expect(out.height).to.equal(expected.height);
    });

    it("renders sampled pixels from the drawable src into the output", () => {
      const src = createWheelchairTestSrc();
      const out = newStandardAnimationForCustomAnimation(
        src,
        customAnimations.wheelchair
      );

      const d = out.getContext("2d").getImageData(0, 0, 1, 1).data;
      expect(d[3]).to.equal(255);
      expect(d[1]).to.be.greaterThan(100);
    });
  });

  describe("addStandardAnimationToZipCustomFolder", () => {
    function createFakeFolder() {
      const files = [];
      return {
        file(name, blob) {
          files.push({ name, blob });
        },
        files,
      };
    }

    afterEach(() => {
      sinon.restore();
    });

    it("writes a PNG blob under the given file name and returns the canvas", async () => {
      const folder = createFakeFolder();
      const src = createWheelchairTestSrc();
      const custAnim = customAnimations.wheelchair;

      const canvas = await addStandardAnimationToZipCustomFolder(
        folder,
        "050_body_male.png",
        src,
        custAnim
      );

      expect(folder.files).to.have.length(1);
      expect(folder.files[0].name).to.equal("050_body_male.png");
      expect(folder.files[0].blob).to.be.instanceOf(Blob);
      expect(folder.files[0].blob.type).to.equal("image/png");
      expect(canvas.width).to.equal(customAnimationSize(custAnim).width);
      expect(canvas.height).to.equal(customAnimationSize(custAnim).height);
    });

    it("rejects when canvasToBlob fails", async () => {
      sinon
        .stub(HTMLCanvasElement.prototype, "toBlob")
        .callsFake((callback) => callback(null));

      const folder = createFakeFolder();
      const src = createWheelchairTestSrc();

      try {
        await addStandardAnimationToZipCustomFolder(
          folder,
          "x.png",
          src,
          customAnimations.wheelchair
        );
        expect.fail("expected rejection");
      } catch (err) {
        expect(err.message).to.equal("Failed to create blob from canvas");
      }
      expect(folder.files).to.have.length(0);
    });
  });

  describe("extractFramesFromAnimation", () => {
    afterEach(() => {
      sinon.restore();
    });

    it("returns {} when ANIMATION_CONFIGS has no entry for the name", () => {
      const canvas = createCanvas(832, 64);
      canvas.getContext("2d").fillRect(0, 0, 64, 64);

      const out = extractFramesFromAnimation(canvas, "__not_an_animation__");

      expect(out).to.deep.equal({});
    });

    it("returns {} when the animation canvas has no 2d context", () => {
      const canvas = createCanvas(832, 64);
      sinon.stub(canvas, "getContext").returns(null);

      const out = extractFramesFromAnimation(canvas, "hurt");

      expect(out).to.deep.equal({});
    });

    it("yields empty arrays when every frame cell is transparent", () => {
      const canvas = createCanvas(832, 64);

      const out = extractFramesFromAnimation(canvas, "hurt");

      expect(out).to.have.keys(["up"]);
      expect(out.up).to.deep.equal([]);
    });

    it("extracts only frame slots that have non-transparent pixels", () => {
      const canvas = createCanvas(832, 64);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#112233";
      ctx.fillRect(128, 0, 64, 64);

      const out = extractFramesFromAnimation(canvas, "hurt");

      expect(out.up).to.have.length(1);
      expect(out.up[0].frameNumber).to.equal(3);
      expect(out.up[0].canvas.width).to.equal(64);
      expect(out.up[0].canvas.height).to.equal(64);
      const d = out.up[0].canvas
        .getContext("2d")
        .getImageData(0, 0, 1, 1).data;
      expect(d[0]).to.equal(17);
      expect(d[1]).to.equal(34);
      expect(d[2]).to.equal(51);
    });

    it("processes only the first N direction rows per ANIMATION_CONFIGS.num", () => {
      const canvas = createCanvas(832, 256);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(0, 64, 64, 64);

      const out = extractFramesFromAnimation(canvas, "walk");

      expect(out.down).to.have.length(1);
      expect(out.down[0].frameNumber).to.equal(1);
      expect(out.up).to.deep.equal([]);
    });

    it("honors a shorter directions array (only those rows are scanned)", () => {
      const canvas = createCanvas(832, 256);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#00ff00";
      ctx.fillRect(0, 0, 64, 64);

      const out = extractFramesFromAnimation(canvas, "walk", ["up", "down"]);

      expect(out).to.have.keys(["up", "down"]);
      expect(out.down).to.deep.equal([]);
      expect(out.up).to.have.length(1);
      expect(out.up[0].frameNumber).to.equal(1);
    });
  });

  describe("checkFrameContentFromImageData", () => {
    it("returns false when every pixel in the region has alpha 0", () => {
      const canvas = createCanvas(64, 64);
      const imageData = canvas.getContext("2d").getImageData(0, 0, 64, 64);

      expect(checkFrameContentFromImageData(imageData, 0, 64, 64)).to.equal(
        false
      );
    });

    it("returns true when any pixel in the region has alpha > 0", () => {
      const canvas = createCanvas(128, 64);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "rgba(0,0,0,1)";
      ctx.fillRect(70, 10, 1, 1);
      const imageData = ctx.getImageData(0, 0, 128, 64);

      expect(checkFrameContentFromImageData(imageData, 64, 64, 64)).to.equal(
        true
      );
    });

    it("treats non-zero RGB with alpha 0 as transparent", () => {
      const imageData = new ImageData(4, 4);
      imageData.data[0] = 255;
      imageData.data[3] = 0;

      expect(checkFrameContentFromImageData(imageData, 0, 4, 4)).to.equal(false);
    });

    it("only inspects x in [startX, startX + frameWidth) and within image width", () => {
      const imageData = new ImageData(10, 2);
      const idx = (0 * 10 + 5) * 4;
      imageData.data[idx + 3] = 255;

      expect(checkFrameContentFromImageData(imageData, 6, 4, 2)).to.equal(false);
      expect(checkFrameContentFromImageData(imageData, 0, 64, 2)).to.equal(true);
    });
  });

  describe("extractFramesFromCustomAnimation", () => {
    afterEach(() => {
      sinon.restore();
    });

    function minimalFourRowDef() {
      return {
        frameSize: 16,
        frames: [
          ["a", "b"],
          ["c", "d"],
          ["e", "f"],
          ["g", "h"],
        ],
      };
    }

    function createFourRowCustomCanvas(def) {
      const w = 2 * def.frameSize;
      const h = 4 * def.frameSize;
      const canvas = createCanvas(w, h);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#123456";
      ctx.fillRect(0, 0, def.frameSize, def.frameSize);
      return canvas;
    }

    it("returns {} when the canvas has no 2d context", () => {
      const def = minimalFourRowDef();
      const canvas = createFourRowCustomCanvas(def);
      sinon.stub(canvas, "getContext").returns(null);

      const out = extractFramesFromCustomAnimation(canvas, def);

      expect(out).to.deep.equal({});
    });

    it("extracts every frame for each direction (including fully transparent slots)", () => {
      const def = minimalFourRowDef();
      const canvas = createFourRowCustomCanvas(def);

      const out = extractFramesFromCustomAnimation(canvas, def);

      expect(Object.keys(out).sort()).to.deep.equal([
        "down",
        "left",
        "right",
        "up",
      ]);
      for (const dir of ["up", "down", "left", "right"]) {
        expect(out[dir]).to.have.length(2);
        expect(out[dir][0].frameNumber).to.equal(1);
        expect(out[dir][1].frameNumber).to.equal(2);
        expect(out[dir][0].canvas.width).to.equal(16);
        expect(out[dir][0].canvas.height).to.equal(16);
      }

      const up0 = out.up[0].canvas
        .getContext("2d")
        .getImageData(0, 0, 1, 1).data;
      expect(up0[0]).to.equal(0x12);
      expect(up0[1]).to.equal(0x34);
      expect(up0[2]).to.equal(0x56);
    });

    it("only includes directions that have a row in customAnimationDef.frames", () => {
      const def = {
        frameSize: 16,
        frames: [
          ["a", "b"],
          ["c", "d"],
        ],
      };
      const canvas = createCanvas(2 * def.frameSize, 2 * def.frameSize);
      canvas.getContext("2d").fillRect(0, 0, 4, 4);

      const out = extractFramesFromCustomAnimation(canvas, def);

      expect(Object.keys(out).sort()).to.deep.equal(["left", "up"]);
      expect(out.up).to.have.length(2);
      expect(out.left).to.have.length(2);
    });

    it("honors a subset of directions", () => {
      const def = minimalFourRowDef();
      const canvas = createFourRowCustomCanvas(def);

      const out = extractFramesFromCustomAnimation(canvas, def, ["up", "right"]);

      expect(Object.keys(out).sort()).to.deep.equal(["right", "up"]);
      expect(out.up).to.have.length(2);
      expect(out.right).to.have.length(2);
    });

    it("uses unequal row lengths; pool is sized by the longest row", () => {
      const def = {
        frameSize: 8,
        frames: [["a"], ["b", "c", "d"], ["e"], ["f"]],
      };
      const w = 3 * def.frameSize;
      const h = 4 * def.frameSize;
      const canvas = createCanvas(w, h);
      canvas.getContext("2d").fillRect(0, 0, 1, 1);

      const out = extractFramesFromCustomAnimation(canvas, def);

      expect(out.up).to.have.length(1);
      expect(out.left).to.have.length(3);
      expect(out.down).to.have.length(1);
      expect(out.right).to.have.length(1);
      expect(out.left[2].frameNumber).to.equal(3);
    });

    it("leaves direction empty when getImageData fails for that row", () => {
      const def = minimalFourRowDef();
      const fs = def.frameSize;
      const canvas = createCanvas(2 * fs, 2 * fs);
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const origGetImageData = ctx.getImageData.bind(ctx);
      sinon.stub(ctx, "getImageData").callsFake((sx, sy, sw, sh) => {
        if (sy >= 2 * fs) {
          throw new DOMException(
            "The source width is outside the canvas",
            "IndexSizeError"
          );
        }
        return origGetImageData(sx, sy, sw, sh);
      });
      sinon.stub(console, "warn");

      const out = extractFramesFromCustomAnimation(canvas, def);

      expect(out.up.length).to.be.greaterThan(0);
      expect(out.left.length).to.be.greaterThan(0);
      expect(out.down).to.deep.equal([]);
      expect(out.right).to.deep.equal([]);
    });
  });
});
