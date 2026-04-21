import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aliasMetadata,
  buildIndexMetadataJs,
  buildMetadataIndexes,
  categoryTree,
  itemMetadata,
} from "../../../../scripts/generateSources/state.mjs";
import { resetTestState } from "./test_helpers.js";

test("buildMetadataIndexes lite rows omit layers and credits", () => {
  resetTestState();
  itemMetadata.one = {
    name: "One",
    type_name: "t1",
    layers: { layer_1: { male: "p" } },
    credits: [{ file: "x", licenses: ["L"] }],
    variants: [],
    recolors: [],
  };
  const { byTypeName } = buildMetadataIndexes(itemMetadata, {});
  const row = byTypeName.t1[0];
  assert.equal(row.itemId, "one");
  assert.equal(row.name, "One");
  assert.ok(!Object.prototype.hasOwnProperty.call(row, "layers"));
  assert.ok(!Object.prototype.hasOwnProperty.call(row, "credits"));
});

test("buildMetadataIndexes second arg is reserved; aliasMetadata does not change byTypeName", () => {
  resetTestState();
  itemMetadata.a = {
    name: "A",
    type_name: "body",
    layers: {},
    credits: [],
    variants: [],
    recolors: [],
  };
  const emptyAliases = buildMetadataIndexes(itemMetadata, {});
  const fakeAliases = buildMetadataIndexes(itemMetadata, {
    sash: {
      Waistband_rose: { typeName: "waistband", name: "x", variant: "y" },
    },
  });
  assert.deepEqual(emptyAliases.byTypeName, fakeAliases.byTypeName);
});

test("buildMetadataIndexes preserves itemId on each lite row", () => {
  resetTestState();
  itemMetadata.x = {
    name: "X",
    type_name: "tx",
    layers: {},
    credits: [],
    variants: ["v"],
    recolors: [],
  };
  const { byTypeName } = buildMetadataIndexes(itemMetadata, {});
  assert.equal(byTypeName.tx[0].itemId, "x");
});

test("buildIndexMetadataJs serializes non-empty aliasMetadata from shared state", () => {
  resetTestState();
  itemMetadata.item = {
    name: "I",
    type_name: "itype",
    layers: {},
    credits: [],
    variants: [],
    recolors: [],
  };
  aliasMetadata.origin = {
    oldkey: { typeName: "itype", name: "I", variant: "v" },
  };
  const js = buildIndexMetadataJs(aliasMetadata, categoryTree, itemMetadata);
  assert.match(js, /const aliasMetadata = /);
  assert.match(js, /"origin"/);
  assert.match(js, /"oldkey"/);
});
