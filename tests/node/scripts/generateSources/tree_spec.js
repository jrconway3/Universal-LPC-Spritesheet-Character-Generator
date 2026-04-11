import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import {
  parseTree,
  sortCategoryTree,
  sortDirTree,
} from "../../../../scripts/generateSources/tree.mjs";
import { categoryTree } from "../../../../scripts/generateSources/state.mjs";
import { buildPath, resetTestState } from "./test_helpers.js";

test("parseTree creates a category node from valid meta", () => {
  resetTestState();
  const sheetsDir = buildPath("build1-basic", "sheets");

  const node = parseTree(path.join(sheetsDir, "body"), "meta_body.json", {
    sheetsDir,
  });

  assert.equal(node.label, "Body");
  assert.equal(node.priority, 10);
  assert.deepEqual(node.required, ["male"]);
});

test("parseTree does not overwrite existing node metadata", () => {
  resetTestState();
  const sheetsDir = buildPath("build1-basic", "sheets");
  const bodyDir = path.join(sheetsDir, "body");

  parseTree(bodyDir, "meta_body.json", { sheetsDir });
  const firstNode = categoryTree.children.body;
  firstNode.label = "Custom Label";

  parseTree(bodyDir, "meta_body.json", { sheetsDir });

  assert.equal(categoryTree.children.body.label, "Custom Label");
});

test("parseTree throws for malformed meta JSON", () => {
  resetTestState();
  const sheetsDir = buildPath("build3-errors", "sheets");
  const brokenMetaDir = path.join(buildPath("build3-errors", "meta-errors"), "body");

  assert.throws(
    () => parseTree(brokenMetaDir, "meta_body_broken.json", { sheetsDir }),
    /SyntaxError|Expected/,
  );
});

test("sortDirTree sorts shallow paths before deep paths", () => {
  const entries = [
    { parentPath: path.join("a", "b"), name: "z.json" },
    { parentPath: "a", name: "a.json" },
  ];

  entries.sort(sortDirTree);

  assert.equal(entries[0].parentPath, "a");
});

test("sortDirTree falls back to locale compare at same depth", () => {
  const entries = [
    { parentPath: "a", name: "z.json" },
    { parentPath: "a", name: "a.json" },
  ];

  entries.sort(sortDirTree);

  assert.equal(entries[0].name, "a.json");
});

test("sortCategoryTree sorts children and items recursively", () => {
  const root = {
    items: ["item_z", "item_a"],
    children: {
      second: {
        label: "Second",
        priority: 2,
        items: ["item_b"],
        children: {},
      },
      first: {
        label: "First",
        priority: 1,
        items: ["item_c"],
        children: {},
      },
    },
  };

  const metadata = {
    item_a: { priority: 1, name: "A" },
    item_z: { priority: 2, name: "Z" },
    item_b: { priority: 1, name: "B" },
    item_c: { priority: 1, name: "C" },
  };

  const sorted = sortCategoryTree(root, metadata);

  assert.deepEqual(Object.keys(sorted.children), ["first", "second"]);
  assert.deepEqual(sorted.items, ["item_a", "item_z"]);
});

test("sortCategoryTree handles missing metadata and missing child collections", () => {
  const root = {
    items: ["unknown2", "unknown1"],
    children: {},
  };

  sortCategoryTree(root, {});

  assert.deepEqual(root.items, ["unknown1", "unknown2"]);
});
