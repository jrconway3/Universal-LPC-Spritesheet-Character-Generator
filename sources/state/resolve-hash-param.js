/**
 * Indexed hash param resolution: same tie-breaking as legacy `Object.entries(itemMetadata)` scans
 * when `itemsByTypeName[typeName]` lists rows in `Object.keys(itemMetadata)` order (see
 * `buildMetadataIndexes` in `scripts/generateSources/state.js`).
 *
 * `byTypeName` / `buildItemsByTypeNameLite` store only the fields used by
 * `resolveHashParamFromHashMatch` and `path.getNameWithoutVariant` (plus `itemId`); the full
 * item record lives in the lite item map.
 *
 * Emitted `index-metadata.js` may store interned rows (`v` / `r` into `variantArrays` /
 * `recolorVariantArrays`); `catalog.registerFromIndexModule` expands `byTypeName` to the slim row
 * shape and keeps the two array tables for expanding interned `item-metadata.js` lites. Emitted
 * `item-metadata.js` may store per-item `v` / `r` and stripped `recolors[0].variants` only.
 *
 * @param {string} itemId
 * @param {object} meta Full or lite item metadata (may include `layers` / `credits`).
 * @returns {{ itemId: string, name: unknown, type_name: unknown, variants: Array, recolors: Array<{ variants: string[] }> }}
 */
/**
 * Expands `metadataIndexes` as emitted with interned `variantArrays` + `recolorVariantArrays` and
 * per-row `v` / `r` indices (production `index-metadata.js`). In-memory / test fixtures with full
 * `variants` + `recolors` on each row are returned unchanged.
 * @param {object} metadataIndexes
 * @returns {object}
 */
export function expandMetadataIndexesWithInternedArrays(metadataIndexes) {
  if (!metadataIndexes || !metadataIndexes.byTypeName) {
    return metadataIndexes;
  }
  const { byTypeName, variantArrays, recolorVariantArrays } = metadataIndexes;
  if (!Array.isArray(variantArrays) || !Array.isArray(recolorVariantArrays)) {
    return metadataIndexes;
  }
  const firstType = Object.values(byTypeName).find(
    (rows) => Array.isArray(rows) && rows.length > 0,
  );
  const firstRow = firstType?.[0];
  if (
    !firstRow ||
    firstRow.variants !== undefined ||
    !Object.prototype.hasOwnProperty.call(firstRow, "v") ||
    !Object.prototype.hasOwnProperty.call(firstRow, "r")
  ) {
    return metadataIndexes;
  }

  const V = variantArrays;
  const R = recolorVariantArrays;
  const expanded = {};
  for (const [t, rows] of Object.entries(byTypeName)) {
    expanded[t] = rows.map((row) => {
      const variants = V[row.v] ?? [];
      const rArr = R[row.r] ?? [];
      const recolors =
        Array.isArray(rArr) && rArr.length > 0 ? [{ variants: rArr }] : [];
      return {
        itemId: row.itemId,
        name: row.name,
        type_name: row.type_name,
        variants: [...variants],
        recolors,
      };
    });
  }
  const {
    variantArrays: variantArraysKept,
    recolorVariantArrays: recolorVariantArraysKept,
    ...rest
  } = metadataIndexes;
  return {
    ...rest,
    byTypeName: expanded,
    hashMatch: { itemsByTypeName: expanded },
    variantArrays: variantArraysKept,
    recolorVariantArrays: recolorVariantArraysKept,
  };
}

/**
 * @param {object|undefined} lite
 * @returns {boolean}
 */
export function isInternedItemLite(lite) {
  return (
    lite != null &&
    typeof lite === "object" &&
    typeof lite.v === "number" &&
    typeof lite.r === "number" &&
    !Object.prototype.hasOwnProperty.call(lite, "variants")
  );
}

/**
 * Restores `variants` and `recolors[0].variants` from the shared tables (same as `index-metadata.js`).
 * @param {object} lite
 * @param {string[][]|undefined} variantArrays
 * @param {string[][]|undefined} recolorVariantArrays
 * @returns {object}
 */
export function expandInternedItemLite(
  lite,
  variantArrays,
  recolorVariantArrays,
) {
  if (
    !isInternedItemLite(lite) ||
    !Array.isArray(variantArrays) ||
    !Array.isArray(recolorVariantArrays)
  ) {
    return lite;
  }
  const { v, r, recolors: rcIn, ...rest } = lite;
  const variants = variantArrays[v] ?? [];
  const rList = recolorVariantArrays[r] ?? [];
  let recolors = Array.isArray(rcIn) ? rcIn : [];
  if (recolors.length > 0) {
    const [head, ...tail] = recolors;
    if (head && typeof head === "object") {
      const merged0 = { ...head, variants: rList.length ? [...rList] : [] };
      recolors = [merged0, ...tail];
    }
  } else if (rList.length > 0) {
    recolors = [{ variants: [...rList] }];
  } else {
    recolors = recolors ?? [];
  }
  return { ...rest, variants, recolors };
}

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
