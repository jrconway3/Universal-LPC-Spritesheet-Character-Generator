/**
 * Indexed hash param resolution: same tie-breaking as legacy `Object.entries(itemMetadata)` scans
 * when `itemsByTypeName[typeName]` lists rows in `Object.keys(itemMetadata)` order (see
 * `buildMetadataIndexes` in `scripts/generateSources/state.mjs`).
 */

/**
 * @param {Record<string, object>|null|undefined} itemMetadata
 * @returns {Record<string, Array<{ itemId: string } & Record<string, unknown>>>}
 */
export function buildItemsByTypeNameLite(itemMetadata) {
  const byType = {};
  for (const itemId of Object.keys(itemMetadata || {})) {
    const meta = itemMetadata[itemId];
    if (!meta) continue;
    const t = meta.type_name;
    if (!byType[t]) byType[t] = [];
    const { layers: _layers, credits: _credits, ...lite } = meta;
    byType[t].push({ itemId, ...lite });
  }
  return byType;
}

/**
 * @param {object} opts
 * @param {string} opts.typeName
 * @param {string} opts.nameAndVariant
 * @param {Record<string, Array<{ itemId: string, type_name?: string } & Record<string, unknown>>>} opts.itemsByTypeName
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
