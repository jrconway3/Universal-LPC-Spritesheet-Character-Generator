import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  PALETTES_DIR,
  SHEETS_DIR,
  aliasMetadata,
  buildMetadataJs,
  categoryTree,
  csvList,
  itemMetadata,
  licensesFound,
  onlyIfTemplate,
  paletteMetadata,
  parseJson,
} from "../../../../scripts/generateSources/state.mjs";
import { buildPath, resetTestState } from "./test_helpers.js";

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

test("buildMetadataJs contains all four window global assignments", () => {
  resetTestState();
  itemMetadata.test_item = { name: "Test" };
  categoryTree.children.body = { items: [], children: {} };

  const js = buildMetadataJs();

  assert.match(js, /window\.itemMetadata\s*=/);
  assert.match(js, /window\.aliasMetadata\s*=/);
  assert.match(js, /window\.categoryTree\s*=/);
  assert.match(js, /window\.paletteMetadata\s*=/);
  assert.match(js, /"test_item"/);
});

test("buildMetadataJs returns valid output with empty state", () => {
  resetTestState();

  const js = buildMetadataJs();

  assert.match(js, /THIS FILE IS AUTO-GENERATED/);
  assert.match(js, /window\.itemMetadata = \{\}/);
  assert.match(js, /window\.aliasMetadata = \{\}/);
});

test("parseJson reads and parses a valid palette fixture file", () => {
  const fullPath = path.join(
    buildPath("build1-basic", "palettes"),
    "body",
    "meta_body.json",
  );

  const result = parseJson(fullPath);

  assert.equal(result.type, "material");
  assert.equal(result.label, "Body");
  assert.equal(result.default, "ulpc");
});

test("parseJson throws SyntaxError for malformed palette JSON", () => {
  const fullPath = path.join(
    buildPath("build2-invalid", "palettes"),
    "bad_lpcr.json",
  );

  assert.throws(() => parseJson(fullPath), /SyntaxError|Expected/);
});

test("parseJson throws for a non-existent file", () => {
  const fullPath = path.join(
    buildPath("build1-basic", "palettes"),
    "does_not_exist.json",
  );

  assert.throws(() => parseJson(fullPath), /ENOENT|no such file/);
});
