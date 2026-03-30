import { expect } from "chai";
import sinon from "sinon";
import { describe, it, beforeEach, afterEach } from "mocha-globals";
import {
  initCanvas,
  canvas as rendererCanvas,
  layers,
  SHEET_WIDTH,
  SHEET_HEIGHT,
} from "../../sources/canvas/renderer.js";
import { addAnimationToZipFolder } from "../../sources/utils/zip-helpers.js";
import { getItemFileName } from "../../sources/utils/fileName.js";
import { getSortedLayers } from "../../sources/state/meta.js";
import {
  exportIndividualFrames,
  exportSplitAnimations,
  exportSplitItemAnimations,
  exportSplitItemSheets,
} from "../../sources/state/zip.js";
import { resetState } from "../../sources/state/hash.js";
import { state } from "../../sources/state/state.js";
import { ANIMATIONS } from "../../sources/state/constants.js";

/**
 * @param {{
 *   failStandardFileAfter?: number;
 *   failStandardTreeAfter?: number;
 *   failItemsFileAfter?: number;
 * }} opts
 * If failStandardFileAfter is set, the Nth successful write under standard/ throws (simulates ZIP errors).
 * If failStandardTreeAfter is set, the Nth successful write under standard/ or standard/<anim>/ throws.
 * If failItemsFileAfter is set, the Nth successful write under items/ throws.
 */
function createFakeJSZip(opts = {}) {
  const files = new Map();
  let standardFileCount = 0;
  let standardTreeWrites = 0;
  let itemsFileCount = 0;

  function makeFolder(name, parentPath = "") {
    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    return {
      root: `${fullPath}/`,
      file(filename, data) {
        if (
          fullPath === "standard" &&
          typeof opts.failStandardFileAfter === "number"
        ) {
          standardFileCount += 1;
          if (standardFileCount > opts.failStandardFileAfter) {
            throw new Error("simulated zip write failure");
          }
        }
        if (
          fullPath.startsWith("standard") &&
          typeof opts.failStandardTreeAfter === "number"
        ) {
          standardTreeWrites += 1;
          if (standardTreeWrites > opts.failStandardTreeAfter) {
            throw new Error("simulated zip write failure");
          }
        }
        if (
          fullPath === "items" &&
          typeof opts.failItemsFileAfter === "number"
        ) {
          itemsFileCount += 1;
          if (itemsFileCount > opts.failItemsFileAfter) {
            throw new Error("simulated zip write failure");
          }
        }
        files.set(`${fullPath}/${filename}`, data);
      },
      folder(sub) {
        return makeFolder(sub, fullPath);
      },
    };
  }

  return {
    files,
    file(name, data) {
      files.set(name, data);
    },
    folder(name) {
      return makeFolder(name);
    },
    generateAsync: async () => new Blob([]),
  };
}

/** Minimal metadata so getSortedLayers / getItemFileName work when global itemMetadata was cleared by other specs. */
const ZIP_SPEC_ITEM_METADATA = {
  body: {
    name: "Body Color",
    type_name: "body",
    required: ["male", "female", "teen", "child", "muscular", "pregnant"],
    animations: ["walk"],
    layers: {
      layer_1: {
        zPos: 10,
        male: "body/bodies/male/",
      },
    },
  },
  heads_human_male: {
    name: "Human Male",
    type_name: "head",
    required: ["male", "female", "teen", "muscular", "pregnant"],
    animations: ["walk"],
    layers: {
      layer_1: {
        zPos: 100,
        male: "head/heads/human/male/",
      },
    },
  },
  longsword: {
    name: "Longsword",
    type_name: "weapon",
    required: ["male", "female", "teen", "muscular", "pregnant"],
    animations: ["walk"],
    layers: {
      layer_1: {
        custom_animation: "walk_128",
        zPos: 140,
        male: "weapon/sword/longsword_alt/walk/"
      }
    },
  },
};

describe("state/zip.js", () => {
  describe("exportSplitAnimations", () => {
    let sandbox;
    let fakeZip;
    let alertStub;

    beforeEach(() => {
      resetState();
      layers.length = 0;

      sandbox = sinon.createSandbox();
      window.canvasRenderer = {};
      window.JSZip = function FakeJSZip() {
        fakeZip = createFakeJSZip();
        return fakeZip;
      };

      sandbox.stub(URL, "createObjectURL").returns("blob:url");
      sandbox.stub(URL, "revokeObjectURL");
      const origCreate = document.createElement.bind(document);
      sandbox.stub(document, "createElement").callsFake((tag) => {
        if (tag === "a") {
          const el = origCreate("a");
          el.click = sandbox.stub();
          return el;
        }
        return origCreate(tag);
      });
      alertStub = sandbox.stub(window, "alert");
      if (typeof m !== "undefined" && m.redraw) {
        sandbox.stub(m, "redraw");
      }

      initCanvas();
      const ctx = rendererCanvas.getContext("2d");
      ctx.fillStyle = "#445566";
      ctx.fillRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT);
    });

    afterEach(() => {
      sandbox.restore();
      delete window.canvasRenderer;
      delete window.JSZip;
      state.zipByAnimation.isRunning = false;
    });

    it("calls addAnimationToZipFolder for each standard animation with folder, file name, extracted canvas, and a DOMRect covering the full canvas", async () => {
      const addSpy = sinon.spy(addAnimationToZipFolder);

      await exportSplitAnimations({ addAnimationToZipFolder: addSpy });

      const standardCalls = addSpy
        .getCalls()
        .filter((c) => c.args[0]?.root === "standard/");
      expect(standardCalls).to.have.lengthOf(ANIMATIONS.length);

      const firstFolder = standardCalls[0].args[0];
      for (let i = 0; i < ANIMATIONS.length; i++) {
        const call = standardCalls[i];
        const [folder, fileName, animCanvas, srcRect] = call.args;
        expect(folder, `call ${i} folder`).to.equal(firstFolder);
        expect(fileName).to.equal(`${ANIMATIONS[i].value}.png`);
        expect(animCanvas).to.be.instanceOf(HTMLCanvasElement);
        expect(srcRect).to.be.instanceOf(DOMRect);
        expect(srcRect.x).to.equal(0);
        expect(srcRect.y).to.equal(0);
        expect(srcRect.width).to.equal(animCanvas.width);
        expect(srcRect.height).to.equal(animCanvas.height);
      }
    });

    it("writes metadata.json with standardAnimations.exported listing each successfully written standard animation id", async () => {
      await exportSplitAnimations();

      const metadataEntry = fakeZip.files.get("credits/metadata.json");
      expect(metadataEntry, "metadata.json should exist").to.exist;
      const metadata = JSON.parse(metadataEntry);
      const expectedIds = ANIMATIONS.map((a) => a.value);
      expect(metadata.standardAnimations.exported).to.deep.equal(expectedIds);
      expect(metadata.standardAnimations.failed).to.deep.equal([]);
    });

    it("records failed standard animations in metadata when a standard PNG write fails after prior successes", async () => {
      window.JSZip = function FakeJSZip() {
        fakeZip = createFakeJSZip({ failStandardFileAfter: 1 });
        return fakeZip;
      };

      await exportSplitAnimations();

      const metadataEntry = fakeZip.files.get("credits/metadata.json");
      const metadata = JSON.parse(metadataEntry);
      expect(metadata.standardAnimations.exported).to.deep.equal([
        ANIMATIONS[0].value,
      ]);
      expect(metadata.standardAnimations.failed).to.deep.equal(
        ANIMATIONS.slice(1).map((a) => a.value),
      );
      expect(alertStub.called).to.be.true;
    });
  });

  describe("exportSplitItemSheets", () => {
    let sandbox;
    let fakeZip;
    let alertStub;

    function nonEmptyItemCanvas() {
      const c = document.createElement("canvas");
      c.width = 32;
      c.height = 32;
      c.getContext("2d").fillRect(0, 0, 32, 32);
      return c;
    }

    beforeEach(() => {
      resetState();
      layers.length = 0;

      window.itemMetadata = {
        ...(window.itemMetadata || {}),
        ...ZIP_SPEC_ITEM_METADATA,
      };

      state.selections = {
        body: {
          itemId: "body",
          variant: "light",
          name: "Body color (light)",
        },
      };

      sandbox = sinon.createSandbox();
      window.canvasRenderer = {};
      window.JSZip = function FakeJSZip() {
        fakeZip = createFakeJSZip();
        return fakeZip;
      };

      sandbox.stub(URL, "createObjectURL").returns("blob:url");
      sandbox.stub(URL, "revokeObjectURL");
      const origCreate = document.createElement.bind(document);
      sandbox.stub(document, "createElement").callsFake((tag) => {
        if (tag === "a") {
          const el = origCreate("a");
          el.click = sandbox.stub();
          return el;
        }
        return origCreate(tag);
      });
      alertStub = sandbox.stub(window, "alert");
      if (typeof m !== "undefined" && m.redraw) {
        sandbox.stub(m, "redraw");
      }

      initCanvas();
      const ctx = rendererCanvas.getContext("2d");
      ctx.fillStyle = "#445566";
      ctx.fillRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT);
    });

    afterEach(() => {
      sandbox.restore();
      delete window.canvasRenderer;
      delete window.JSZip;
      state.zipByItem.isRunning = false;
    });

    it("calls addAnimationToZipFolder for each item layer with items folder, file name, and canvas (no crop rect)", async () => {
      const renderStub = sandbox.stub().resolves(nonEmptyItemCanvas());
      const addSpy = sinon.spy(addAnimationToZipFolder);

      await exportSplitItemSheets({
        renderSingleItem: renderStub,
        addAnimationToZipFolder: addSpy,
      });

      const bodyLayers = getSortedLayers("body", true);
      expect(bodyLayers, "body item should have layers in itemMetadata").to.be
        .ok;
      expect(bodyLayers.length).to.be.at.least(1);

      const expectedFileName = getItemFileName(
        "body",
        "light",
        "Body color (light)",
        bodyLayers[0].layerNum,
      );

      expect(addSpy.callCount).to.equal(bodyLayers.length);
      const itemsCalls = addSpy
        .getCalls()
        .filter((c) => c.args[0]?.root === "items/");
      expect(itemsCalls).to.have.lengthOf(bodyLayers.length);

      const [folder, zipName, canvas] = itemsCalls[0].args;
      expect(folder.root).to.equal("items/");
      expect(zipName).to.equal(`${expectedFileName}.png`);
      expect(canvas).to.be.instanceOf(HTMLCanvasElement);
      expect(itemsCalls[0].args[3]).to.equal(undefined);

      expect(renderStub.callCount).to.equal(bodyLayers.length);
      const renderCall = renderStub.firstCall;
      expect(renderCall.args[0]).to.equal("body");
      expect(renderCall.args[1]).to.equal("light");
      expect(renderCall.args[2]).to.equal(null);
      expect(renderCall.args[3]).to.equal(state.bodyType);
      expect(renderCall.args[4]).to.equal(state.selections);
      expect(renderCall.args[5]).to.equal(bodyLayers[0].layerNum);
    });

    it("writes PNG blobs under items/ when render succeeds", async () => {
      const renderStub = sandbox.stub().resolves(nonEmptyItemCanvas());

      await exportSplitItemSheets({
        renderSingleItem: renderStub,
      });

      const bodyLayers = getSortedLayers("body", true);
      const expectedFileName = getItemFileName(
        "body",
        "light",
        "Body color (light)",
        bodyLayers[0].layerNum,
      );

      expect(fakeZip.files.get(`items/${expectedFileName}.png`)).to.exist;
      expect(alertStub.calledWith("Export complete!")).to.be.true;
    });

    it("records later item layers as failed when items/ write fails after prior successes", async () => {
      state.selections = {
        body: {
          itemId: "body",
          variant: "light",
          name: "Body color (light)",
        },
        head: {
          itemId: "heads_human_male",
          variant: "light",
          name: "Human male (light)",
        },
      };

      window.JSZip = function FakeJSZip() {
        fakeZip = createFakeJSZip({ failItemsFileAfter: 1 });
        return fakeZip;
      };

      const renderStub = sandbox.stub().resolves(nonEmptyItemCanvas());

      await exportSplitItemSheets({ renderSingleItem: renderStub });

      const bodyLayers = getSortedLayers("body", true);
      const headLayers = getSortedLayers("heads_human_male", true);
      const firstFileName = getItemFileName(
        "body",
        "light",
        "Body color (light)",
        bodyLayers[0].layerNum,
      );
      const secondFileName = getItemFileName(
        "heads_human_male",
        "light",
        "Human male (light)",
        headLayers[0].layerNum,
      );

      expect(fakeZip.files.get(`items/${firstFileName}.png`)).to.exist;
      expect(fakeZip.files.get(`items/${secondFileName}.png`)).to.equal(
        undefined,
      );
      expect(alertStub.called).to.be.true;
      const issueAlert = alertStub
        .getCalls()
        .find((c) =>
          String(c.args[0]).includes("Export completed with some issues"),
        );
      expect(issueAlert, "partial failure alert").to.exist;
      expect(String(issueAlert.args[0])).to.include(secondFileName);
    });

    it("verify custom only animations also export correctly", async () => {
      state.selections = {
        body: {
          itemId: "body",
          variant: "light",
          name: "Body color (light)",
        },
        head: {
          itemId: "heads_human_male",
          variant: "light",
          name: "Human male (light)",
        },
        weapon: {
          itemId: "longsword",
          variant: "longsword",
          name: "Longsword (longsword)",
        },
      };

      window.JSZip = function FakeJSZip() {
        fakeZip = createFakeJSZip();
        return fakeZip;
      };

      const renderStub = sandbox.stub().resolves(nonEmptyItemCanvas());

      await exportSplitItemSheets({ renderSingleItem: renderStub });

      const bodyLayers = getSortedLayers("body", true);
      const headLayers = getSortedLayers("heads_human_male", true);
      const weaponLayers = getSortedLayers("longsword", true);
      const realWeaponLayers = getSortedLayers("longsword");
      const firstFileName = getItemFileName(
        "body",
        "light",
        "Body color (light)",
        bodyLayers[0].layerNum,
      );
      const secondFileName = getItemFileName(
        "heads_human_male",
        "light",
        "Human male (light)",
        headLayers[0].layerNum,
      );
      const thirdFileName = getItemFileName(
        "longsword",
        "longsword",
        "Longsword (longsword)",
        realWeaponLayers[0].layerNum,
      );

      expect(fakeZip.files.get(`items/${firstFileName}.png`)).to.exist;
      expect(fakeZip.files.get(`items/${secondFileName}.png`)).to.exist;
      expect(weaponLayers.length).to.equal(0);
      expect(fakeZip.files.get(`items/${thirdFileName}.png`)).to.exist;
    });
  });

  describe("exportSplitItemAnimations", () => {
    let sandbox;
    let fakeZip;
    let alertStub;

    function nonEmptyAnimCanvas() {
      const c = document.createElement("canvas");
      c.width = 48;
      c.height = 48;
      c.getContext("2d").fillRect(0, 0, 48, 48);
      return c;
    }

    beforeEach(() => {
      resetState();
      layers.length = 0;

      window.itemMetadata = {
        ...(window.itemMetadata || {}),
        ...ZIP_SPEC_ITEM_METADATA,
      };

      state.selections = {
        body: {
          itemId: "body",
          variant: "light",
          name: "Body color (light)",
        },
      };

      sandbox = sinon.createSandbox();
      window.canvasRenderer = {};
      window.JSZip = function FakeJSZip() {
        fakeZip = createFakeJSZip();
        return fakeZip;
      };

      sandbox.stub(URL, "createObjectURL").returns("blob:url");
      sandbox.stub(URL, "revokeObjectURL");
      const origCreate = document.createElement.bind(document);
      sandbox.stub(document, "createElement").callsFake((tag) => {
        if (tag === "a") {
          const el = origCreate("a");
          el.click = sandbox.stub();
          return el;
        }
        return origCreate(tag);
      });
      alertStub = sandbox.stub(window, "alert");
      if (typeof m !== "undefined" && m.redraw) {
        sandbox.stub(m, "redraw");
      }

      initCanvas();
      const ctx = rendererCanvas.getContext("2d");
      ctx.fillStyle = "#445566";
      ctx.fillRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT);
    });

    afterEach(() => {
      sandbox.restore();
      delete window.canvasRenderer;
      delete window.JSZip;
      state.zipByAnimimationAndItem.isRunning = false;
    });

    it("calls addAnimationToZipFolder for each matching item layer under standard/<anim>/ with file name and canvas (no crop rect)", async () => {
      const renderStub = sandbox.stub().resolves(nonEmptyAnimCanvas());
      const addSpy = sinon.spy(addAnimationToZipFolder);

      await exportSplitItemAnimations({
        renderSingleItemAnimation: renderStub,
        addAnimationToZipFolder: addSpy,
      });

      const bodyLayers = getSortedLayers("body", true);
      expect(bodyLayers, "body item should have layers in itemMetadata").to.be
        .ok;
      expect(bodyLayers.length).to.be.at.least(1);

      const walkCalls = addSpy
        .getCalls()
        .filter((c) => c.args[0]?.root === "standard/walk/");
      expect(walkCalls.length).to.equal(bodyLayers.length);

      const expectedFileName = getItemFileName(
        "body",
        "light",
        "Body color (light)",
        bodyLayers[0].layerNum,
      );

      const [folder, zipName, canvas] = walkCalls[0].args;
      expect(folder.root).to.equal("standard/walk/");
      expect(zipName).to.equal(`${expectedFileName}.png`);
      expect(canvas).to.be.instanceOf(HTMLCanvasElement);
      expect(walkCalls[0].args[3]).to.equal(undefined);

      expect(renderStub.callCount).to.equal(bodyLayers.length);
      const rc = renderStub.firstCall;
      expect(rc.args[0]).to.equal("body");
      expect(rc.args[1]).to.equal("light");
      expect(rc.args[2]).to.equal(null);
      expect(rc.args[3]).to.equal(state.bodyType);
      expect(rc.args[4]).to.equal("walk");
      expect(rc.args[5]).to.equal(state.selections);
      expect(rc.args[6]).to.equal(bodyLayers[0].layerNum);
    });

    it("writes metadata.json with standardAnimations.exported / failed maps per animation (walk only in fixture)", async () => {
      const renderStub = sandbox.stub().resolves(nonEmptyAnimCanvas());

      await exportSplitItemAnimations({
        renderSingleItemAnimation: renderStub,
      });

      const metadataEntry = fakeZip.files.get("credits/metadata.json");
      expect(metadataEntry, "metadata.json should exist").to.exist;
      const metadata = JSON.parse(metadataEntry);

      const bodyLayers = getSortedLayers("body", true);
      const expectedFileName = getItemFileName(
        "body",
        "light",
        "Body color (light)",
        bodyLayers[0].layerNum,
      );

      expect(metadata.standardAnimations.exported.walk).to.deep.equal([
        expectedFileName,
      ]);
      expect(metadata.standardAnimations.failed.walk).to.deep.equal([]);
      expect(alertStub.calledWith("Export complete!")).to.be.true;
    });

    it("records failed item layers in metadata when a write under standard/<anim>/ fails after prior successes", async () => {
      state.selections = {
        body: {
          itemId: "body",
          variant: "light",
          name: "Body color (light)",
        },
        head: {
          itemId: "heads_human_male",
          variant: "light",
          name: "Human male (light)",
        },
      };

      window.JSZip = function FakeJSZip() {
        fakeZip = createFakeJSZip({ failStandardTreeAfter: 1 });
        return fakeZip;
      };

      const renderStub = sandbox.stub().resolves(nonEmptyAnimCanvas());

      await exportSplitItemAnimations({
        renderSingleItemAnimation: renderStub,
      });

      const bodyLayers = getSortedLayers("body", true);
      const headLayers = getSortedLayers("heads_human_male", true);
      const bodyFileName = getItemFileName(
        "body",
        "light",
        "Body color (light)",
        bodyLayers[0].layerNum,
      );
      const headFileName = getItemFileName(
        "heads_human_male",
        "light",
        "Human male (light)",
        headLayers[0].layerNum,
      );

      expect(fakeZip.files.get(`standard/walk/${bodyFileName}.png`)).to.exist;
      expect(fakeZip.files.get(`standard/walk/${headFileName}.png`)).to.equal(
        undefined,
      );

      const metadataEntry = fakeZip.files.get("credits/metadata.json");
      const metadata = JSON.parse(metadataEntry);
      expect(metadata.standardAnimations.exported.walk).to.deep.equal([
        bodyFileName,
      ]);
      expect(metadata.standardAnimations.failed.walk).to.deep.equal([
        headFileName,
      ]);

      expect(alertStub.called).to.be.true;
      const issueAlert = alertStub
        .getCalls()
        .find((c) =>
          String(c.args[0]).includes("Export completed with some issues"),
        );
      expect(issueAlert, "partial failure alert").to.exist;
      expect(String(issueAlert.args[0])).to.include(headFileName);
    });
  });

  describe("exportIndividualFrames", () => {
    let sandbox;
    let fakeZip;
    let alertStub;

    const directions = ["up", "down", "left", "right"];

    function smallAnimCanvas() {
      const c = document.createElement("canvas");
      c.width = 64;
      c.height = 64;
      c.getContext("2d").fillRect(0, 0, 64, 64);
      return c;
    }

    function frameCanvas() {
      const c = document.createElement("canvas");
      c.width = 16;
      c.height = 16;
      c.getContext("2d").fillRect(0, 0, 16, 16);
      return c;
    }

    beforeEach(() => {
      resetState();
      layers.length = 0;

      sandbox = sinon.createSandbox();
      window.canvasRenderer = {};
      window.JSZip = function FakeJSZip() {
        fakeZip = createFakeJSZip();
        return fakeZip;
      };

      sandbox.stub(URL, "createObjectURL").returns("blob:url");
      sandbox.stub(URL, "revokeObjectURL");
      const origCreate = document.createElement.bind(document);
      sandbox.stub(document, "createElement").callsFake((tag) => {
        if (tag === "a") {
          const el = origCreate("a");
          el.click = sandbox.stub();
          return el;
        }
        return origCreate(tag);
      });
      alertStub = sandbox.stub(window, "alert");
      if (typeof m !== "undefined" && m.redraw) {
        sandbox.stub(m, "redraw");
      }

      initCanvas();
      const ctx = rendererCanvas.getContext("2d");
      ctx.fillStyle = "#445566";
      ctx.fillRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT);
    });

    afterEach(() => {
      sandbox.restore();
      delete window.canvasRenderer;
      delete window.JSZip;
      if (state.zipIndividualFrames) {
        state.zipIndividualFrames.isRunning = false;
      }
    });

    it("calls extractFramesFromAnimation for each extracted animation with canvas, name, and directions", async () => {
      const extractStub = sandbox.stub().callsFake(() => smallAnimCanvas());
      const framesSpy = sinon.spy(() => {
        const fc = frameCanvas();
        return { up: [{ canvas: fc, frameNumber: 0 }] };
      });

      await exportIndividualFrames({
        extractAnimationFromCanvas: extractStub,
        extractFramesFromAnimation: framesSpy,
      });

      expect(extractStub.callCount).to.equal(ANIMATIONS.length);
      expect(framesSpy.callCount).to.equal(ANIMATIONS.length);
      const first = framesSpy.firstCall;
      expect(first.args[1]).to.equal(ANIMATIONS[0].value);
      expect(first.args[2]).to.deep.equal(directions);
      expect(first.args[0]).to.be.instanceOf(HTMLCanvasElement);
      expect(fakeZip.files.get(`standard/${ANIMATIONS[0].value}/up/0.png`)).to
        .exist;
    });

    it("writes metadata.json with structure.standard exported / failed and completes when extract succeeds", async () => {
      const extractStub = sandbox.stub().callsFake(() => smallAnimCanvas());
      const framesFake = sinon.spy(() => ({}));

      await exportIndividualFrames({
        extractAnimationFromCanvas: extractStub,
        extractFramesFromAnimation: framesFake,
      });

      const metadataEntry = fakeZip.files.get("credits/metadata.json");
      const metadata = JSON.parse(metadataEntry);
      expect(metadata.structure.standard.failed).to.deep.equal([]);
      expect(metadata.structure.standard.exported).to.deep.equal(
        ANIMATIONS.map((a) => a.value),
      );
      expect(alertStub.calledWith("Individual frames export complete!")).to.be
        .true;
    });

    it("records failed standard animations when extractAnimationFromCanvas throws for an animation", async () => {
      const extractStub = sandbox.stub().callsFake((name) => {
        if (name === "thrust") {
          throw new Error("simulated extract failure");
        }
        return smallAnimCanvas();
      });
      const framesFake = sinon.spy(() => ({}));

      await exportIndividualFrames({
        extractAnimationFromCanvas: extractStub,
        extractFramesFromAnimation: framesFake,
      });

      const metadataEntry = fakeZip.files.get("credits/metadata.json");
      const metadata = JSON.parse(metadataEntry);
      expect(metadata.structure.standard.failed).to.deep.equal(["thrust"]);
      expect(metadata.structure.standard.exported).to.not.include("thrust");
      expect(metadata.structure.standard.exported).to.include("spellcast");
      expect(metadata.structure.standard.exported).to.deep.equal(
        ANIMATIONS.filter((a) => a.value !== "thrust").map((a) => a.value),
      );
      const issueAlert = alertStub
        .getCalls()
        .find((c) =>
          String(c.args[0]).includes("Export completed with some issues"),
        );
      expect(issueAlert, "partial failure alert").to.exist;
      expect(String(issueAlert.args[0])).to.include("thrust");
    });
  });
});
