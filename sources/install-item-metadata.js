/**
 * Loads generated metadata chunks (lite items, layers, credits, index, palette), merges
 * per-item records for legacy `window.itemMetadata`, and exposes structural data on `window`.
 */
import {
  aliasMetadata,
  categoryTree,
  metadataIndexes,
} from "../index-metadata.js";
import { itemCredits } from "../credits-metadata.js";
import { itemMetadata as itemMetadataLite } from "../item-metadata.js";
import { itemLayers } from "../layers-metadata.js";
import { paletteMetadata } from "../palette-metadata.js";

const itemMetadata = {};
for (const id of Object.keys(itemMetadataLite)) {
  itemMetadata[id] = {
    ...itemMetadataLite[id],
    layers: itemLayers[id] ?? {},
    credits: itemCredits[id] ?? [],
  };
}

if (typeof window !== "undefined") {
  window.itemMetadata = itemMetadata;
  window.aliasMetadata = aliasMetadata;
  window.categoryTree = categoryTree;
  window.paletteMetadata = paletteMetadata;
  window.metadataIndexes = metadataIndexes;
}

export {
  itemMetadata,
  aliasMetadata,
  categoryTree,
  paletteMetadata,
  metadataIndexes,
};
