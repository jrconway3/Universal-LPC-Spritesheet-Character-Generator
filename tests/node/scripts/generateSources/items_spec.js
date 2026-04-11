import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ANIMATION_DEFAULTS } from "../../../../sources/state/constants.js";
import { parseJson } from "../../../../scripts/generateSources/items.mjs";
import { loadPaletteMetadata } from "../../../../scripts/generateSources/palettes.mjs";
import {
  aliasMetadata,
  itemMetadata,
} from "../../../../scripts/generateSources/state.mjs";
import { buildPath, resetTestState } from "./test_helpers.js";

function writeTempJson(tempRoot, fileName, jsonContent) {
  const dir = path.join(tempRoot, "body");
  fs.mkdirSync(dir, { recursive: true });
  const fullPath = path.join(dir, fileName);
  fs.writeFileSync(fullPath, JSON.stringify(jsonContent, null, 2));
  return { dir, fullPath };
}

test("parseJson parses valid fixture file and writes item metadata", () => {
  resetTestState();
  const sheetsDir = buildPath("build1-basic", "sheets");
  const palettesDir = buildPath("build1-basic", "palettes");
  loadPaletteMetadata(palettesDir);

  const parsed = parseJson(path.join(sheetsDir, "body"), "wheelchair.json", {
    sheetsDir,
  });

  assert.equal(parsed.itemId, "wheelchair");
  assert.equal(parsed.definition.name, "Wheelchair");
  assert.deepEqual(itemMetadata.wheelchair.required, [
    "male",
    "female",
    "teen",
    "muscular",
    "pregnant",
  ]);
  assert.deepEqual(itemMetadata.wheelchair.path, ["body", "wheelchair"]);
  assert.equal(Object.keys(itemMetadata.wheelchair.layers).length, 2);
});

test("parseJson throws for ignored fixture item", () => {
  resetTestState();
  const sheetsDir = buildPath("build2-invalid", "sheets");

  assert.throws(
    () =>
      parseJson(path.join(sheetsDir, "body"), "ignored_item.json", {
        sheetsDir,
      }),
    /Skipping ignored item: ignored_item/,
  );
});

test("parseJson throws for malformed JSON input", () => {
  resetTestState();
  const sheetsDir = buildPath("build3-errors", "sheets");

  assert.throws(
    () =>
      parseJson(path.join(sheetsDir, "body"), "bad_json.json", { sheetsDir }),
    /SyntaxError|Expected/,
  );
});

test("parseJson applies animation defaults and alias mappings when fields are omitted", () => {
  resetTestState();

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gen-items-"));
  const sheetsDir = path.join(tempRoot, "sheets");
  const { dir } = writeTempJson(sheetsDir, "alias_item.json", {
    name: "Alias Item",
    variants: ["adult"],
    layer_1: {
      male: "body/alias/adult/",
    },
    aliases: {
      old: "adult",
    },
    type_name: "aliasType",
    recolors: {
      material: "missing",
      palettes: ["base"],
    },
  });

  const parsed = parseJson(dir, "alias_item.json", { sheetsDir });

  assert.equal(parsed.itemId, "alias_item");
  assert.deepEqual(itemMetadata.alias_item.animations, ANIMATION_DEFAULTS);
  assert.deepEqual(itemMetadata.alias_item.required, ["male"]);
  assert.deepEqual(itemMetadata.alias_item.recolors[0].material, "missing");
  assert.deepEqual(aliasMetadata.aliasType.old, {
    typeName: "aliasType",
    name: "Alias_Item",
    variant: "adult",
  });
});

test("parseJson normalizes recolors when palette metadata is loaded", () => {
  resetTestState();
  const sheetsDir = buildPath("build1-basic", "sheets");
  const palettesDir = buildPath("build1-basic", "palettes");
  loadPaletteMetadata(palettesDir);

  parseJson(path.join(sheetsDir, "head", "nose"), "head_nose_big.json", {
    sheetsDir,
  });

  const [recolor] = itemMetadata.head_nose_big.recolors;
  assert.equal(recolor.default, "ulpc");
  assert.equal(recolor.base, "ulpc.skin");
  assert.ok(recolor.variants.includes("light"));
  assert.ok(recolor.variants.includes("lpcr.ashen"));
  assert.ok(recolor.variants.includes("all.lpcr.indigo"));
});

test("parseJson defaults to empty recolor list when recolors are absent", () => {
  resetTestState();

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gen-items-"));
  const sheetsDir = path.join(tempRoot, "sheets");
  const { dir } = writeTempJson(sheetsDir, "plain_item.json", {
    name: "Plain Item",
    layer_1: {
      female: "body/plain/adult/",
    },
    type_name: "plain",
  });

  parseJson(dir, "plain_item.json", { sheetsDir });

  assert.deepEqual(itemMetadata.plain_item.recolors, []);
});
