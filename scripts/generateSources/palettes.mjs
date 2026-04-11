/**
 * Parses one palette JSON file and merges it into shared palette metadata state.
 * @param {string} filePath Parent directory of the palette file.
 * @param {string} fileName Palette filename to parse.
 * @return {{name?: string, material?: string, version?: string, kind: "meta"|"palette", fullPath: string}} Parsed palette descriptor.
 * @throws {SyntaxError} If the target palette file contains invalid JSON.
 */
import fs from "fs";
import path from "path";
import debugUtils from "../utils/debug.js";
import { ucwords } from "../../sources/utils/helpers.js";
import { PALETTES_DIR, paletteMetadata } from "./state.mjs";
import { sortDirTree } from "./tree.mjs";

const { debugWarn } = debugUtils;

export function parsePalette(filePath, fileName) {
  const fullPath = path.join(filePath, fileName);
  let json = null;
  try {
    json = JSON.parse(fs.readFileSync(fullPath));
  } catch (e) {
    console.error(`Error parsing palette file json data: ${fullPath}`, e);
    throw e;
  }

  if (fileName.startsWith("meta_")) {
    const name = fileName.replace("meta_", "").replace(".json", "");
    if (json.type === "material") {
      if (!paletteMetadata.materials[name]) {
        paletteMetadata.materials[name] = json;
        paletteMetadata.materials[name].palettes = {};
      } else {
        for (const [key, data] of Object.entries(json)) {
          paletteMetadata.materials[name][key] = data;
        }
      }
    } else {
      paletteMetadata.versions[name] = json;
    }
    return { name, kind: "meta", fullPath };
  }

  const [material, version] = fileName.replace(".json", "").split("_");
  if (!paletteMetadata.materials[material]) {
    paletteMetadata.materials[material] = { palettes: {} };
  }
  paletteMetadata.materials[material].palettes[version] = json;
  return { material, version, kind: "palette", fullPath };
}

/**
 * Walks the palette directory tree and parses all palette definition files.
 * @param {string|null} [palettesDir] Root palette definitions directory.
 * @return {void} No return value; mutates context.paletteMetadata.
 * @throws {SyntaxError} Propagates parse errors from parsePalette for invalid palette files.
 */
export function loadPaletteMetadata(palettesDir = null) {
  const palettes = fs
    .readdirSync(palettesDir ?? PALETTES_DIR, {
      recursive: true,
      withFileTypes: true,
    })
    .sort(sortDirTree);

  palettes.forEach((file) => {
    if (file.isDirectory()) {
      return;
    }

    parsePalette(file.parentPath, file.name);
  });
}

/**
 * Collects recolor entries from either multi-color or single-color recolor definitions.
 * @param {Object} definition Parsed sheet definition JSON.
 * @return {Object[]} Recolor entries extracted from definition.
 */
function collectRecolorEntries(definition) {
  const recolors = [];
  if (definition.recolors === undefined) {
    return recolors;
  }

  for (let n = 1; n < 10; n++) {
    const colorDef = definition.recolors[`color_${n}`];
    if (colorDef) {
      recolors.push(colorDef);
    } else {
      break;
    }
  }

  if (recolors.length === 0) {
    recolors.push(definition.recolors);
  }

  return recolors;
}



/**
 * Resolves palette material/version pair for one recolor palette token.
 * @param {string} paletteToken Palette token from recolor.palettes.
 * @param {string} fallbackMaterial Default material when token omits one.
 * @return {{material: string, version: string}} Resolved material/version pair.
 */
function resolvePaletteToken(paletteToken, fallbackMaterial) {
  let [material, version] = paletteToken.split(".");
  if (!version) {
    version = material;
    material = fallbackMaterial;
  }
  return { material, version };
}

/**
 * Applies default metadata fields for one recolor entry.
 * @param {Object} recolor Recolor entry to mutate.
 * @param {Object} materialMeta Material metadata resolved for recolor.material.
 * @return {void} No return value.
 */
function applyRecolorDefaults(recolor, materialMeta) {
  recolor.default = materialMeta.default;
  recolor.type_name = recolor.type_name ?? null;
  recolor.label = recolor.label ?? materialMeta.label ?? ucwords(recolor.material);

  if (!recolor.base) {
    recolor.base = `${materialMeta.default}.${materialMeta.base}`;
  } else if (!recolor.base.includes(".")) {
    recolor.base = `${materialMeta.default}.${recolor.base}`;
  }
}

/**
 * Expands one recolor entry into concrete palette map and variant names.
 * @param {Object} recolor Recolor entry to mutate.
 * @return {void} No return value.
 */
function expandRecolorPalettes(recolor) {
  const colorPalettes = {};
  const colorVariants = new Set();

  for (const paletteToken of recolor.palettes) {
    const { material, version } = resolvePaletteToken(
      paletteToken,
      recolor.material,
    );

    const keys = Object.keys(
      paletteMetadata.materials[material].palettes[version],
    );
    colorPalettes[`${material}.${version}`] = keys;

    const mappedKeys = keys.map((key) => {
      const matPart = recolor.material !== material ? `${material}.` : "";
      const verPart = recolor.default !== version ? `${version}.` : "";
      return `${matPart}${verPart}${key}`;
    });
    mappedKeys.forEach((key) => colorVariants.add(key));
  }

  recolor.palettes = colorPalettes;
  recolor.variants = Array.from(colorVariants);
}

/**
 * Normalizes recolor definitions and expands palette variants for runtime metadata.
 * @param {Object} definition Parsed sheet definition JSON.
 * @return {Object[]} Normalized recolor objects with expanded variants.
 */
export function normalizeRecolors(definition) {
  const recolors = collectRecolorEntries(definition);

  for (const recolor of recolors) {
    const materialMeta = paletteMetadata.materials[recolor.material];
    if (!materialMeta) {
      debugWarn(`Material metadata not found for ${recolor.material}`);
      continue;
    }

    applyRecolorDefaults(recolor, materialMeta);
    expandRecolorPalettes(recolor);
  }

  return recolors;
}
