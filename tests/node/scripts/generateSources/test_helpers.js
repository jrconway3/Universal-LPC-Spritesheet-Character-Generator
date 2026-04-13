import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  aliasMetadata,
  categoryTree,
  csvList,
  itemMetadata,
  licensesFound,
  paletteMetadata,
  readDirTree,
} from "../../../../scripts/generateSources/state.mjs";
import { loadPaletteMetadata } from "../../../../scripts/generateSources/palettes.mjs";
import { parseTree } from "../../../../scripts/generateSources/tree.mjs";
import { parseItem } from "../../../../scripts/generateSources/items.mjs";
import { processItemCredits } from "../../../../scripts/generateSources/credits.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..", "..", "..");
const generatorModuleUrl = pathToFileURL(
  projectPath("scripts", "generate_sources.mjs"),
).href;

let moduleLoadCounter = 0;

export function projectPath(...segments) {
  return path.join(projectRoot, ...segments);
}

export function buildPath(buildName, kind) {
  return projectPath("tests", "node", "scripts", buildName, kind);
}

function clearObject(obj) {
  for (const key of Object.keys(obj)) {
    delete obj[key];
  }
}

export function resetTestState() {
  licensesFound.length = 0;
  csvList.length = 0;
  clearObject(itemMetadata);
  paletteMetadata.versions = {};
  paletteMetadata.materials = {};
  clearObject(aliasMetadata);
  categoryTree.items = [];
  categoryTree.children = {};
}

function extractWindowAssignment(outputText, symbol, nextSymbol) {
  const match = outputText.match(
    new RegExp(
      `window\\.${symbol} = ([\\s\\S]*?);\\s+window\\.${nextSymbol}`,
      "s",
    ),
  );
  assert.ok(match, `Expected window.${symbol} assignment in output`);
  return JSON.parse(match[1]);
}

export function extractGlobalObjects(metadataJS) {
  return {
    itemMetadata: extractWindowAssignment(
      metadataJS,
      "itemMetadata",
      "aliasMetadata",
    ),
    aliasMetadata: extractWindowAssignment(
      metadataJS,
      "aliasMetadata",
      "categoryTree",
    ),
    categoryTree: extractWindowAssignment(
      metadataJS,
      "categoryTree",
      "paletteMetadata",
    ),
    paletteMetadata: JSON.parse(
      metadataJS.split("window.paletteMetadata = ")[1].split(";\n")[0],
    ),
  };
}

export async function loadGeneratorModule() {
  moduleLoadCounter += 1;
  return import(`${generatorModuleUrl}?test=${moduleLoadCounter}`);
}

export async function runBuild(buildName, palettesBuildName = buildName) {
  const { generateSources } = await loadGeneratorModule();
  resetTestState();
  const writes = new Map();

  generateSources({
    readDirTreeFn: () => readDirTree(buildPath(buildName, "sheets")),
    parseTreeFn: (filePath, fileName) =>
      parseTree(filePath, fileName, {
        sheetsDir: buildPath(buildName, "sheets"),
      }),
    parseItemFn: (filePath, fileName) =>
      parseItem(filePath, fileName, {
        sheetsDir: buildPath(buildName, "sheets"),
      }),
    processItemCreditsFn: (item, filePath, definition) =>
      processItemCredits(
        item,
        filePath,
        definition,
        buildPath(buildName, "sheets"),
      ),
    writeFileSync: (filePath, contents) => {
      writes.set(path.basename(filePath), String(contents));
    },
    loadPaletteMetadataFn: () =>
      loadPaletteMetadata({
        palettesDir: buildPath(palettesBuildName, "palettes"),
      }),
  });

  const csvGenerated = writes.get("CREDITS.csv") || "";
  const metadataJS = writes.get("item-metadata.js") || "";
  const globals = extractGlobalObjects(metadataJS);

  return {
    csvGenerated,
    metadataJS,
    globals,
  };
}

export async function withCapturedConsoleError(callback) {
  const original = console.error;
  const errors = [];
  console.error = (...args) => {
    errors.push(args.map((value) => String(value)).join(" "));
  };

  try {
    const result = await callback();
    return { result, errors };
  } finally {
    console.error = original;
  }
}
