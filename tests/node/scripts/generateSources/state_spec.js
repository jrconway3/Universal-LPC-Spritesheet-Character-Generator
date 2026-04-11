import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  PALETTES_DIR,
  SHEETS_DIR,
  aliasMetadata,
  categoryTree,
  csvList,
  itemMetadata,
  licensesFound,
  onlyIfTemplate,
  paletteMetadata,
} from "../../../../scripts/generateSources/state.mjs";

test("state exports expected constant directory suffixes", () => {
  assert.ok(SHEETS_DIR.endsWith(path.sep));
  assert.ok(PALETTES_DIR.endsWith(path.sep));
});

test("state exports mutable shared collections with expected defaults", () => {
  assert.equal(onlyIfTemplate, false);
  assert.ok(Array.isArray(licensesFound));
  assert.ok(Array.isArray(csvList));
  assert.deepEqual(itemMetadata, {});
  assert.deepEqual(aliasMetadata, {});
  assert.deepEqual(categoryTree, { items: [], children: {} });
  assert.deepEqual(paletteMetadata, { versions: {}, materials: {} });
});
