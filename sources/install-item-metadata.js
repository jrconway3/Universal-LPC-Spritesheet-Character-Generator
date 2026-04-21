/**
 * Loads generated metadata chunks (lite items, layers, credits, index, palette), merges
 * per-item records for legacy `window.itemMetadata`, and exposes structural data on `window`.
 *
 * Transitional (rollout Commit 4 / until ~Commit 8): mirrors catalog payloads onto `window` so
 * `npm run dev` / `build` stay usable before the app migrates to `catalog.js` only. Remove these
 * assignments when callers use the catalog façade.
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
