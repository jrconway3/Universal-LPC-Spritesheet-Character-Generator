/**
 * Indexed hash param resolution: same tie-breaking as legacy `Object.entries(itemMetadata)` scans
 * when `itemsByTypeName[typeName]` lists rows in `Object.keys(itemMetadata)` order (see
 * `buildMetadataIndexes` in `scripts/generateSources/state.mjs`).
 *
 * `byTypeName` / `buildItemsByTypeNameLite` store only the fields used by
 * `resolveHashParamFromHashMatch` and `path.getNameWithoutVariant` (plus `itemId`); the full
 * item record lives in the lite item map.
 *
 * @param {string} itemId
 * @param {object} meta Full or lite item metadata (may include `layers` / `credits`).
 * @returns {{ itemId: string, name: unknown, type_name: unknown, variants: Array, recolors: Array<{ variants: string[] }> }}
 */
export function buildSlimByTypeNameRow(itemId, meta) {
  if (!meta) {
    return {
      itemId,
      name: undefined,
      type_name: undefined,
      variants: [],
      recolors: [],
    };
  }
  const variants = Array.isArray(meta.variants) ? meta.variants : [];
  const v0 = meta.recolors?.[0]?.variants;
  const recolors =
    Array.isArray(v0) && v0.length > 0 ? [{ variants: [...v0] }] : [];
  return {
    itemId,
    name: meta.name,
    type_name: meta.type_name,
    variants,
    recolors,
  };
}

/**
 * @param {Record<string, object>|null|undefined} itemMetadata
 * @returns {Record<string, Array<ReturnType<typeof buildSlimByTypeNameRow>>>}
 */
export function buildItemsByTypeNameLite(itemMetadata) {
  const byType = {};
  for (const itemId of Object.keys(itemMetadata || {})) {
    const meta = itemMetadata[itemId];
    if (!meta) continue;
    const t = meta.type_name;
    if (!byType[t]) byType[t] = [];
    byType[t].push(buildSlimByTypeNameRow(itemId, meta));
  }
  return byType;
}

/**
 * @param {object} opts
 * @param {string} opts.typeName
 * @param {string} opts.nameAndVariant
 * @param {Record<string, Array<{ itemId: string, name: string, type_name: string, variants: string[], recolors: Array<{ variants: string[] }> }>>} opts.itemsByTypeName
 * @returns {{ foundItemId: string|null, matchedVariant: string, matchedRecolor: string }}
 */
export function resolveHashParamFromHashMatch({
  typeName,
  nameAndVariant,
  itemsByTypeName,
}) {
  let foundItemId = null;
  let matchedVariant = "";
  let matchedRecolor = "";

  const parts = nameAndVariant.split("_");
  const metasForType = itemsByTypeName[typeName] || [];

  for (let i = 1; i <= parts.length; i++) {
    const nameToMatch = parts.slice(0, i).join("_");
    const variants = parts.slice(i).join("_");
    const variantToMatch = variants.split("|")[0];
    const recolorToMatch = variants.split("|")[1] || "";

    for (const row of metasForType) {
      const itemId = row.itemId;
      const meta = row;
      if (meta.type_name !== typeName) continue;

      const metaNameNormalized = meta.name.replaceAll(" ", "_");

      if (metaNameNormalized.toLowerCase() === nameToMatch.toLowerCase()) {
        if (meta.variants?.length > 0) {
          for (const variant of meta.variants) {
            if (variant.toLowerCase() === variantToMatch.toLowerCase()) {
              foundItemId = itemId;
              matchedVariant = variant;
              matchedRecolor = "";
              break;
            }
          }
        }
        if (meta.recolors?.[0]?.variants?.length > 0) {
          for (const variant of meta.recolors[0].variants) {
            if (
              (recolorToMatch !== "" &&
                variant.toLowerCase() === recolorToMatch.toLowerCase()) ||
              (recolorToMatch === "" &&
                variant.toLowerCase() === variantToMatch.toLowerCase())
            ) {
              foundItemId = itemId;
              matchedVariant = "";
              matchedRecolor = variant;
              break;
            }
          }
        }
        if (variantToMatch === "") {
          foundItemId = itemId;
          matchedVariant = "";
          matchedRecolor = "";
          break;
        }
      }

      if (foundItemId) break;
    }

    if (foundItemId) break;
  }

  return { foundItemId, matchedVariant, matchedRecolor };
}
