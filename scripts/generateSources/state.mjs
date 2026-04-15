import fs from "fs";
import path from "path";

export const SHEETS_DIR = "sheet_definitions" + path.sep;
export const PALETTES_DIR = "palette_definitions" + path.sep;
export const METADATA_OUTPUT = "item-metadata.js";
export const onlyIfTemplate = false;

export const licensesFound = [];
export const csvList = [];
export const itemMetadata = {};
export const paletteMetadata = { versions: {}, materials: {} };
export const aliasMetadata = {};
export const categoryTree = { items: [], children: {} };

/**
 * Sorts recursive directory entries by depth first, then locale-aware path name.
 * @param {{parentPath: string, name: string}} a First directory entry.
 * @param {{parentPath: string, name: string}} b Second directory entry.
 * @return {number} Sort comparator result compatible with Array.prototype.sort.
 * @throws {TypeError} If entry objects do not include expected path fields.
 */
export function sortDirTree(a, b) {
  const pa = path.join(a.parentPath, a.name);
  const pb = path.join(b.parentPath, b.name);

  const depthA = pa.split(path.sep).length;
  const depthB = pb.split(path.sep).length;
  if (depthA !== depthB) return depthA - depthB;

  return pa.localeCompare(pb, ["en"]);
}

/**
 * Reads and parses a Directory Tree and sorts it.
 * @param {string} dirToRead Absolute path to the directory to read.
 * @return {Array} Array of directory entries sorted by depth and name.
 * @throws {Error} If the directory does not exist.
 */
export function readDirTree(dirToRead) {
  return fs
    .readdirSync(dirToRead, {
      recursive: true,
      withFileTypes: true,
    })
    .sort(sortDirTree);
}

/**
 * Reads and parses a JSON file from disk.
 * @param {string} fullPath Absolute file path to the JSON file.
 * @return {Object} Parsed JSON object.
 * @throws {SyntaxError} If file contents are not valid JSON.
 * @throws {Error} If the file does not exist.
 */
export function parseJson(fullPath) {
  try {
    return JSON.parse(fs.readFileSync(fullPath));
  } catch (e) {
    console.error("Error parsing JSON from file:", fullPath);
    throw e;
  }
}

/**
 * Builds browser-side metadata bootstrap JS from shared generator state.
 * @return {string} JavaScript source that assigns metadata globals onto window.
 */
export function buildMetadataJs() {
	return `// THIS FILE IS AUTO-GENERATED. PLEASE DON'T ALTER IT MANUALLY
  // Generated from sheet_definitions/*.json by scripts/generate_sources.mjs
  // Contains metadata for all customization items to avoid DOM queries at runtime

  window.itemMetadata = ${JSON.stringify(itemMetadata, null, 2)};

  window.aliasMetadata = ${JSON.stringify(aliasMetadata, null, 2)};

  window.categoryTree = ${JSON.stringify(categoryTree, null, 2)};

  window.paletteMetadata = ${JSON.stringify(paletteMetadata, null, 2)};
  `;
}
