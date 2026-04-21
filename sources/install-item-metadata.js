/**
 * Loads generated metadata chunks via parallel dynamic imports and registers them with `catalog`.
 * Each chunk calls `register*` and `m.redraw()` as soon as it arrives so the UI can show S1/S2/S3
 * without waiting for the slowest module.
 *
 * Call `loadAllMetadata()` to start loading; it returns a promise that resolves when all five
 * chunks are registered (merged shape for tests and `seedBrowserCatalogMergedOnDist`).
 * The browser test page (`tests_run.html`) still awaits `loadAllMetadata()` at module evaluation.
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

function safeRedraw() {
  try {
    globalThis.m?.redraw?.();
  } catch {
    /* ignore */
  }
}

/** Test harness: allow `loadAllMetadata()` to run again after `resetCatalogForTests()`. */
export function resetLoadAllMetadataCacheForTests() {
  loadAllMetadataPromise = null;
}

/**
 * Parallel `import()` of the five metadata modules; each registers as soon as its file loads.
 * @returns {Promise<{ itemMetadata: Record<string, object>, aliasMetadata: object, categoryTree: object, paletteMetadata: object, metadataIndexes: object }>}
 */
export function loadAllMetadata() {
  loadAllMetadataPromise ??= (async () => {
    const [indexMod, paletteMod, itemMod, creditsMod, layersMod] =
      await Promise.all([
        import("../index-metadata.js").then((mod) => {
          registerFromIndexModule({
            aliasMetadata: mod.aliasMetadata,
            categoryTree: mod.categoryTree,
            metadataIndexes: mod.metadataIndexes,
          });
          safeRedraw();
          return mod;
        }),
        import("../palette-metadata.js").then((mod) => {
          registerFromPaletteModule({ paletteMetadata: mod.paletteMetadata });
          safeRedraw();
          return mod;
        }),
        import("../item-metadata.js").then((mod) => {
          registerFromItemModule({ itemMetadata: mod.itemMetadata });
          safeRedraw();
          return mod;
        }),
        import("../credits-metadata.js").then((mod) => {
          registerFromCreditsModule({ itemCredits: mod.itemCredits });
          safeRedraw();
          return mod;
        }),
        import("../layers-metadata.js").then((mod) => {
          registerFromLayersModule({ itemLayers: mod.itemLayers });
          safeRedraw();
          return mod;
        }),
      ]);

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
