import { ok, type Result } from "neverthrow";
import { getZPos } from "../canvas/canvas-utils.ts";
import { variantToFilename } from "../utils/helpers.ts";
import { replaceInPath } from "./path.ts";
import {
  defaultCatalog,
  type CatalogReader,
  type ItemMerged,
  type LoadError,
} from "./catalog.ts";
import type { Selections } from "./state.ts";

type MetaCatalog = Pick<CatalogReader, "getItemMerged">;

type MetaDeps = {
  getZPos: (itemId: string, layerNum?: number) => number;
  variantToFilename: (variant: string) => string;
  replaceInPath: (
    path: string,
    selections: Selections,
    meta: ItemMerged,
  ) => string;
  /** Result-returning lookup; callers either `.unwrapOr(default)` or branch on `.isErr()`. */
  getItemMetadata: (itemId: string) => Result<ItemMerged, LoadError>;
};

function createDefaultMetaDeps(catalog: MetaCatalog): MetaDeps {
  return {
    getZPos: (itemId, layerNum) => getZPos(catalog, itemId, layerNum),
    variantToFilename,
    replaceInPath,
    getItemMetadata: (itemId) => catalog.getItemMerged(itemId),
  };
}

export type SortedLayer = { layerNum: number; zPos: number };
export type AnimationLayer = SortedLayer & { animLayerNum: number };

/**
 * Tap a `LoadError` to surface a missing-item error to the console. Loading
 * errors are transient (chunk hasn't registered yet) and stay silent.
 */
function logIfNotFound(itemId: string): (err: LoadError) => LoadError {
  return (err) => {
    if (err.kind === "not-found") {
      console.error("Item metadata not found:", itemId);
    }
    return err;
  };
}

export type LayerToLoad = { zPos: number; path: string };

export function createMeta(
  catalog: MetaCatalog,
  overrides: Partial<MetaDeps> = {},
) {
  const initialOverrides = { ...overrides };
  let metaDeps: MetaDeps = {
    ...createDefaultMetaDeps(catalog),
    ...initialOverrides,
  };

  function setMetaDeps(overrides: Partial<MetaDeps>): void {
    Object.assign(metaDeps, overrides);
  }

  function resetMetaDeps(): void {
    metaDeps = {
      ...createDefaultMetaDeps(catalog),
      ...initialOverrides,
    };
  }

  function getMetaDeps(): MetaDeps {
    return metaDeps;
  }

  /** Sort layers by zPos. */
  function getSortedLayers(
    itemId: string,
    standardOnly: boolean = false,
  ): Result<SortedLayer[], LoadError> {
    return metaDeps
      .getItemMetadata(itemId)
      .mapErr(logIfNotFound(itemId))
      .map((meta) => {
        const layersList: SortedLayer[] = [];
        for (let layerNum = 1; layerNum < 10; layerNum++) {
          const layerKey = `layer_${layerNum}`;
          const layer = meta.layers[layerKey];
          if (!layer) break;
          if (standardOnly && layer.custom_animation) continue;

          const zPos = metaDeps.getZPos(itemId, layerNum);
          layersList.push({ layerNum, zPos });
        }
        return layersList;
      });
  }

  /**
   * Layers for item-based ZIP exports: prefer standard sheet rows; if none
   * (custom-animation-only items), fall back to all layers.
   */
  function getSortedLayersWithCustomFallback(
    itemId: string,
  ): Result<SortedLayer[], LoadError> {
    return getSortedLayers(itemId, true).andThen((layers) =>
      layers.length === 0 ? getSortedLayers(itemId) : ok(layers),
    );
  }

  /** Split layers by animation type, then sort by zPos. */
  function getSortedLayersByAnim(
    itemId: string,
    customOnly: boolean = false,
  ): Result<Record<string, AnimationLayer[]>, LoadError> {
    return metaDeps
      .getItemMetadata(itemId)
      .mapErr(logIfNotFound(itemId))
      .map((meta) => {
        const animsList: Record<string, SortedLayer[]> = {};
        for (let layerNum = 1; layerNum < 10; layerNum++) {
          const layerKey = `layer_${layerNum}`;
          const layer = meta.layers[layerKey];
          if (!layer) break;
          if (customOnly && !layer.custom_animation) continue;

          const animName =
            (layer.custom_animation as string | undefined) || "standard";
          if (!animsList[animName]) {
            animsList[animName] = [];
          }

          const zPos = metaDeps.getZPos(itemId, layerNum);
          animsList[animName].push({ layerNum, zPos });
        }

        // Sort each animation's layers by zPos.
        const result: Record<string, AnimationLayer[]> = {};
        for (const animName in animsList) {
          result[animName] = animsList[animName]
            .sort((a, b) => a.zPos - b.zPos)
            .map((layer, index) => ({
              layerNum: layer.layerNum,
              animLayerNum: index + 1,
              zPos: layer.zPos,
            }));
        }

        return result;
      });
  }

  /**
   * Get layers to load for the given metadata and variant.
   *
   * `variant` is required for layers with `custom_animation` (those entries
   * are omitted if missing).
   */
  function getLayersToLoad(
    meta: ItemMerged,
    bodyType: string,
    selections: Selections,
    variant: string | null = null,
  ): LayerToLoad[] {
    // Check if this item uses a custom animation.
    const layer1 = meta.layers["layer_1"];
    const hasCustomAnimation = layer1?.custom_animation;
    const layer1CustomAnimation = hasCustomAnimation
      ? layer1.custom_animation
      : null;

    const layersToLoad: LayerToLoad[] = [];
    for (let layerNum = 1; layerNum < 10; layerNum++) {
      const layer = meta.layers[`layer_${layerNum}`];
      if (!layer) break;

      let layerPath = layer[bodyType] as string | undefined;
      if (!layerPath) continue;

      // Filter: only include layers with matching custom animation.
      if (layer1CustomAnimation) {
        if (layer.custom_animation !== layer1CustomAnimation) {
          continue;
        }
      }

      // Replace template variables like ${head}.
      if (layerPath.includes("${")) {
        layerPath = metaDeps.replaceInPath(layerPath, selections, meta);
      }

      const hasCustomAnim = layer.custom_animation;
      let imagePath: string;
      const variantFileName =
        variant !== null ? `${metaDeps.variantToFilename(variant)}` : "";
      if (hasCustomAnim) {
        if (!variantFileName) {
          continue;
        }
        imagePath = `spritesheets/${layerPath}${variantFileName}.png`;
      } else {
        const defaultAnim = meta.animations.includes("walk")
          ? "walk"
          : meta.animations[0];
        imagePath = `spritesheets/${layerPath}${defaultAnim}${variantFileName ? `/${variantFileName}` : ""}.png`;
      }

      layersToLoad.push({
        zPos: (layer.zPos as number | undefined) ?? 100,
        path: imagePath,
      });
    }
    return layersToLoad.sort((a, b) => a.zPos - b.zPos);
  }

  return {
    setMetaDeps,
    resetMetaDeps,
    getMetaDeps,
    getSortedLayers,
    getSortedLayersWithCustomFallback,
    getSortedLayersByAnim,
    getLayersToLoad,
  };
}

const defaultMeta = createMeta(defaultCatalog);

// Transitional legacy exports: callers keep using the module functions while
// new tests and later modules can construct isolated `createMeta(...)` services.
// TODO(catalog-di): Delete these wrappers once callers use `createMeta(...)` directly.
export function setMetaDeps(overrides: Partial<MetaDeps>): void {
  defaultMeta.setMetaDeps(overrides);
}

export function resetMetaDeps(): void {
  defaultMeta.resetMetaDeps();
}

export function getMetaDeps(): MetaDeps {
  return defaultMeta.getMetaDeps();
}

export function getSortedLayers(
  itemId: string,
  standardOnly: boolean = false,
): Result<SortedLayer[], LoadError> {
  return defaultMeta.getSortedLayers(itemId, standardOnly);
}

export function getSortedLayersWithCustomFallback(
  itemId: string,
): Result<SortedLayer[], LoadError> {
  return defaultMeta.getSortedLayersWithCustomFallback(itemId);
}

export function getSortedLayersByAnim(
  itemId: string,
  customOnly: boolean = false,
): Result<Record<string, AnimationLayer[]>, LoadError> {
  return defaultMeta.getSortedLayersByAnim(itemId, customOnly);
}

export function getLayersToLoad(
  meta: ItemMerged,
  bodyType: string,
  selections: Selections,
  variant: string | null = null,
): LayerToLoad[] {
  return defaultMeta.getLayersToLoad(meta, bodyType, selections, variant);
}
