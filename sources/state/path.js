import { getHashParamsforSelections } from './state.js';
import { variantToFilename, es6DynamicTemplate } from '../utils/helpers.js';

/**
 * Build sprite path from item metadata for a specific animation
 */
export function getSpritePath(itemId, variant, bodyType, animation, layerNum = 1, selections = {}, meta = null) {
  if (!meta) {
    meta = window.itemMetadata[itemId];
  }
  if (!meta) return null;

  const layerKey = `layer_${layerNum}`;
  const layer = meta.layers?.[layerKey];
  if (!layer) return null;

  // Get the file path for this body type
  let basePath = layer[bodyType];
  if (!basePath) return null;

  // Replace template variables like ${head}
  if (basePath.includes('${')) {
	basePath = replaceInPath(basePath, selections, meta);
  }

  // If no variant specified, try to extract from itemId
  if (!variant) {
    const parts = itemId.split('_');
    variant = parts[parts.length - 1];
  }

  // Build full path: spritesheets/ + basePath + animation/ + variant.png
  return `spritesheets/${basePath}${animation}/${variantToFilename(variant)}.png`;
}

// Replace template variables like ${head} in a path using current selections
export function replaceInPath(path, selections, meta) {
	if (path.includes("${")) {
		// get params from selections
		// TODO: this could be optimized to avoid recomputing every time
		// or to only do it when relevant selections change
		// or just use the selections directly instead of recomputing the hash params
		const hashParams = getHashParamsforSelections(selections || {});
		const replacements = Object.fromEntries(
			Object.entries(hashParams).map(([typeName, nameAndVariant]) => {
				// TODO: this works for head, eye color, and faces but probably not for everything
				const name = nameAndVariant.substr(
					0,
					nameAndVariant.lastIndexOf("_"),
				); // Extract name before variant
				const replacement = meta.replace_in_path[typeName]?.[name];
				return [typeName, replacement];
			}),
		);

		return es6DynamicTemplate(path, replacements);
	}

	return path;
}
