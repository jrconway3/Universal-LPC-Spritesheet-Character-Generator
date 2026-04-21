/**
 * Loads generated metadata chunks via parallel dynamic imports and registers them with `catalog`.
 *
 * Call `loadAllMetadata()` from the app entry (e.g. after DOM ready) before `initState` / canvas
 * work. The browser test page (`tests_run.html`) triggers an eager `loadAllMetadata()` at module
 * evaluation so specs see a populated catalog.
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

/** Test harness: allow `loadAllMetadata()` to run again after `resetCatalogForTests()`. */
export function resetLoadAllMetadataCacheForTests() {
  loadAllMetadataPromise = null;
}

/**
 * Parallel `import()` of the five metadata modules and `catalog.register*`.
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
