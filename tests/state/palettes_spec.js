import { expect } from "chai";
import { describe, it, beforeEach, afterEach } from "mocha-globals";
import { state } from "../../sources/state/state.js";
import {
  getMultiRecolors,
  getPaletteOptions,
} from "../../sources/state/palettes.js";

describe("state/palettes.js", () => {
  let previousItemMetadata;
  let previousPaletteMetadata;
  let previousSelections;

  beforeEach(() => {
    previousItemMetadata = window.itemMetadata;
    previousPaletteMetadata = window.paletteMetadata;
    previousSelections = state.selections;

    window.paletteMetadata = {
      materials: {
        cloth: {
          default: "ulpc",
          base: "base",
          palettes: {
            ulpc: {
              base: ["#111111", "#222222"],
              alt: ["#333333", "#444444"],
              red: ["#770000", "#aa0000"],
              "blue.dark": ["#000077", "#0000aa"],
            },
          },
        },
      },
    };

    window.itemMetadata = {
      target_item: {
        name: "Target",
        type_name: "cloth",
        matchBodyColor: true,
        recolors: [
          {
            label: "Cloth",
            type_name: null,
            material: "cloth",
            default: "ulpc",
            base: "ulpc.base",
            palettes: {
              ulpc: {
                base: ["#111111", "#222222"],
                alt: ["#333333", "#444444"],
                red: ["#770000", "#aa0000"],
                "blue.dark": ["#000077", "#0000aa"],
              },
            },
            variants: ["ulpc.red", "ulpc.blue.dark"],
          },
        ],
      },
      source_item: {
        name: "Source",
        type_name: "cloth",
        recolors: [{ label: "Source", type_name: null }],
      },
      body_skin: {
        name: "Body",
        type_name: "body",
        matchBodyColor: true,
        recolors: [],
      },
      shoulders_epaulettes: {
        name: "Shoulders Epaulettes",
        type_name: "shoulders",
        recolors: [
          {
            label: "Shoulders",
            type_name: null,
            variants: ["ulpc.red", "ulpc.blue"],
          },
        ],
      },
      shoulders_legion: {
        name: "Shoulders Legion",
        type_name: "shoulders",
        recolors: [
          {
            label: "Shoulders",
            type_name: null,
            variants: ["ulpc.metal.red", "ulpc.metal.gray"],
          },
        ],
      },
    };

    state.selections = {};
  });

  afterEach(() => {
    state.selections = previousSelections;
    window.itemMetadata = previousItemMetadata;
    window.paletteMetadata = previousPaletteMetadata;
  });

  it("falls back to a matching dotted recolor when the exact recolor is missing", () => {
    state.selections = {
      cloth: {
        itemId: "source_item",
        recolor: "dark",
      },
    };

    const recolors = getMultiRecolors("target_item", state.selections);

    expect(recolors).to.deep.equal({ cloth: "ulpc.blue.dark" });
  });

  it("omits recolor keys when no matching fallback exists", () => {
    state.selections = {
      cloth: {
        itemId: "source_item",
        recolor: "missing_color",
      },
    };

    const recolors = getMultiRecolors("target_item", state.selections);

    expect(recolors).to.equal(null);
  });

  it("uses matchBodyColor fallback in getPaletteOptions when body color is present", () => {
    state.selections = {
      body: {
        itemId: "body_skin",
        recolor: "alt",
      },
      cloth: {
        itemId: "target_item",
        recolor: "base",
      },
    };

    const [paletteOptions, selectedColors] = getPaletteOptions(
      "target_item",
      window.itemMetadata.target_item,
    );

    expect(selectedColors).to.deep.equal({ cloth: "alt" });
    expect(paletteOptions).to.have.lengthOf(1);
    expect(paletteOptions[0].selectionColor).to.equal("alt");
    expect(paletteOptions[0].colors).to.deep.equal(["#333333", "#444444"]);
  });

  it("falls back across same-type assets when querying the other itemId", () => {
    state.selections = {
      shoulders: {
        itemId: "shoulders_epaulettes",
        recolor: "red",
      },
    };

    const recolors = getMultiRecolors("shoulders_legion", state.selections);

    expect(recolors).to.deep.equal({ shoulders: "ulpc.metal.red" });
  });
});
