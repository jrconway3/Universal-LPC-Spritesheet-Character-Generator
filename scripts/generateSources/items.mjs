import fs from "fs";
import path from "path";
import debugUtils from "../utils/debug.js";
import {
  ANIMATION_DEFAULTS,
  BODY_TYPES,
} from "../../sources/state/constants.js";
import { writeAliases } from "./aliases.mjs";
import { normalizeRecolors } from "./palettes.mjs";
import {
  itemMetadata,
  onlyIfTemplate,
  SHEETS_DIR,
} from "./state.mjs";

const { debugLog } = debugUtils;

/**
 * Reads and parses a sheet definition JSON file from disk.
 * @param {string} fullPath Absolute file path to the sheet definition JSON.
 * @return {Object} Parsed JSON object for the sheet definition.
 * @throws {SyntaxError} If file contents are not valid JSON.
 */
function parseDefinition(fullPath) {
  try {
    return JSON.parse(fs.readFileSync(fullPath));
  } catch (e) {
    console.error("Error parsing metadata JSON from file:", fullPath);
    throw e;
  }
}

/**
 * Computes required body types by checking the first layer entries present in the definition.
 * @param {Object} definition Parsed sheet definition JSON.
 * @return {string[]} Ordered list of required body types found in layer_1.
 */
function getRequiredSexes(definition) {
  const requiredSexes = [];
  for (const sex of BODY_TYPES) {
    if (definition.layer_1[sex]) {
      requiredSexes.push(sex);
    }
  }
  return requiredSexes;
}

/**
 * Builds an item path array relative to the active sheets directory.
 * @param {string} filePath Parent path containing the current sheet file.
 * @param {string} itemId Unique item identifier derived from filename.
 * @param {string} sheetsDir Base sheets directory used for normalization.
 * @return {string[]} Path segments from sheets root to the item.
 */
function buildTreePath(filePath, itemId, sheetsDir) {
  const normalizedSheetsDir = sheetsDir.endsWith(path.sep)
    ? sheetsDir
    : sheetsDir + path.sep;
  const treePath = filePath.replace(normalizedSheetsDir, "").split(path.sep);
  treePath.push(itemId);
  return treePath;
}

/**
 * Collects contiguous layer definitions from layer_1 through layer_9.
 * @param {Object} definition Parsed sheet definition JSON.
 * @return {Object<string, Object>} Layer map keyed by layer name.
 */
function collectLayers(definition) {
  const layers = {};
  for (let i = 1; i < 10; i++) {
    const layerDef = definition[`layer_${i}`];
    if (layerDef) {
      layers[`layer_${i}`] = layerDef;
    } else {
      break;
    }
  }
  return layers;
}

/**
 * Parses one sheet definition file and writes normalized item metadata into shared state.
 * @param {string} filePath Parent directory path of the target definition file.
 * @param {string} fileName Target definition filename.
 * @param {{sheetsDir?: string}} [options] Optional parser options.
 * @param {string} [options.sheetsDir] Sheets root used for relative path normalization.
 * @return {{
 * itemId: string,
 * definition: Object
 * }} Parsed item context used by downstream credits processing.
 * @throws {SyntaxError} When the sheet JSON file content cannot be parsed.
 * @throws {Error} When the item is ignored.
 */
export function parseJson(filePath, fileName, options = {}) {
  const { sheetsDir = SHEETS_DIR } = options;
  const fullPath = path.join(filePath, fileName);
  const searchFileName = fileName.replace(".json", "");
  if (!onlyIfTemplate) debugLog(`Parsing ${fullPath}`);

  // Read JSON Definition
  const definition = parseDefinition(fullPath);

  const {
    variants = [],
    name,
    credits = [],
    replace_in_path: replaceInPath = {},
    priority,
    ignore = false,
    aliases,
    tags = [],
    required_tags: requiredTags = [],
    excluded_tags: excludedTags = [],
    type_name: typeName,
    animations = ANIMATION_DEFAULTS,
    preview_row: previewRow = 2,
    preview_column: previewColumn = 0,
    preview_x_offset: previewXOffset = 0,
    preview_y_offset: previewYOffset = 0,
    match_body_color: matchBodyColor = false,
  } = definition;

  // Skip Ignored Items
  if (ignore) {
    throw Error(`Skipping ignored item: ${searchFileName}`);
  }

  const requiredSexes = getRequiredSexes(definition);

  // Build unique itemId from filename (not from path or type_name)
  // This ensures each item has a unique ID even if they share the same type_name
  const itemId = searchFileName;
  const treePath = buildTreePath(filePath, itemId, sheetsDir);

  // Collect layer information (file paths and zPos)
  const layers = collectLayers(definition);

  // Collect recolor information
  const recolors = normalizeRecolors(definition);

  // Collect metadata for this item
  itemMetadata[itemId] = {
    name: name,
    priority: priority || null,
    type_name: typeName,
    required: requiredSexes,
    animations: animations,
    tags: tags,
    required_tags: requiredTags,
    excluded_tags: excludedTags,
    path: treePath || ["other"],
    replace_in_path: replaceInPath,
    variants: variants,
    layers: layers,
    credits: credits,
    preview_row: previewRow,
    preview_column: previewColumn,
    preview_x_offset: previewXOffset,
    preview_y_offset: previewYOffset,
    matchBodyColor,
    recolors: recolors || [],
  };

  // Process alias definitions for this item (for backward compatibility)
  if (aliases) {
    writeAliases(aliases, itemMetadata[itemId]);
  }

  return {
    itemId,
    definition,
  };
}
