/**
 * Loads generated metadata chunks (lite items, layers, credits, index, palette) via parallel
 * dynamic imports, registers them with `catalog`, and applies transitional `window` shims.
 *
 * Call `loadAllMetadata()` from the app entry (e.g. after DOM ready) before `initState` / canvas
 * work that reads `window.itemMetadata`. The browser test page (`tests_run.html`) triggers an
 * eager `loadAllMetadata()` at module evaluation so specs keep seeing populated `window.*`.
 *
 * Remove `window.*` assignments when callers use the catalog façade only (target ~Commit 8).
 */
import {
  registerFromCreditsModule,
  registerFromIndexModule,
  registerFromItemModule,
  registerFromLayersModule,
  registerFromPaletteModule,
} from "./state/catalog.js";

/** @returns {boolean} */
function isBrowserTestHarnessPage() {
  try {
    return /tests_run/i.test(globalThis.location?.pathname ?? "");
  } catch {
    return false;
  }
}

let loadAllMetadataPromise = null;

/**
 * Parallel `import()` of the five metadata modules, `catalog.register*`, merged `itemMetadata`
 * for `window`, and transitional mirrors for tree / indexes / palette.
 * @returns {Promise<{ itemMetadata: Record<string, object>, aliasMetadata: object, categoryTree: object, paletteMetadata: object, metadataIndexes: object }>}
 */
export function loadAllMetadata() {
  loadAllMetadataPromise ??= (async () => {
    const [indexMod, paletteMod, itemMod, creditsMod, layersMod] =
      await Promise.all([
        import("../index-metadata.js"),
        import("../palette-metadata.js"),
        import("../item-metadata.js"),
        import("../credits-metadata.js"),
        import("../layers-metadata.js"),
      ]);

    registerFromIndexModule({
      aliasMetadata: indexMod.aliasMetadata,
      categoryTree: indexMod.categoryTree,
      metadataIndexes: indexMod.metadataIndexes,
    });
    registerFromPaletteModule({ paletteMetadata: paletteMod.paletteMetadata });
    registerFromItemModule({ itemMetadata: itemMod.itemMetadata });
    registerFromCreditsModule({ itemCredits: creditsMod.itemCredits });
    registerFromLayersModule({ itemLayers: layersMod.itemLayers });

    const itemMetadataLite = itemMod.itemMetadata;
    const itemLayersMap = layersMod.itemLayers;
    const itemCreditsMap = creditsMod.itemCredits;

    const itemMetadata = {};
    for (const id of Object.keys(itemMetadataLite)) {
      itemMetadata[id] = {
        ...itemMetadataLite[id],
        layers: itemLayersMap[id] ?? {},
        credits: itemCreditsMap[id] ?? [],
      };
    }

    if (typeof window !== "undefined") {
      window.itemMetadata = itemMetadata;
      window.aliasMetadata = indexMod.aliasMetadata;
      window.categoryTree = indexMod.categoryTree;
      window.paletteMetadata = paletteMod.paletteMetadata;
      window.metadataIndexes = indexMod.metadataIndexes;
    }

    return {
      itemMetadata,
      aliasMetadata: indexMod.aliasMetadata,
      categoryTree: indexMod.categoryTree,
      paletteMetadata: paletteMod.paletteMetadata,
      metadataIndexes: indexMod.metadataIndexes,
    };
  })();

  return loadAllMetadataPromise;
}

if (isBrowserTestHarnessPage()) {
  await loadAllMetadata();
}
