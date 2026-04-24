import * as catalog from "../state/catalog.js";

// TODO: catalog.js currently returns `object | undefined` from
// getItemMerged (JSDoc-erased shape). When catalog.js converts to .ts
// and the generator output shapes it manages are typed, delete these
// local narrowings and use the real exported type instead.
type ItemLayerMeta = { zPos?: number };
type ItemMergedShape = { layers?: Record<string, ItemLayerMeta | undefined> };

function addExtensionIfMissing(filename: string, extension: string): string {
  if (filename.toLowerCase().endsWith(extension.toLowerCase())) {
    return filename;
  }
  return `${filename}.${extension}`;
}

export function getItemFileName(
  itemId: string,
  variant: string,
  name: string,
  layerNum: number = 1,
  zOverride?: number,
): string {
  const meta = catalog.getItemMerged(itemId) as ItemMergedShape | undefined;
  if (!meta) return addExtensionIfMissing(name, "png");

  // Get zPos from specified layer
  const layer = meta.layers?.[`layer_${layerNum}`];
  if (!layer)
    throw new Error(
      "Requested layer number " + layerNum + " not found for item: " + itemId,
    );
  const zPos = zOverride || layer?.zPos || 100;
  const altName = `${itemId}_${variant}`;

  // Format: "050 body_male_light" (zPos padded to 3 digits + space + name)
  const safeName = (name || altName).replace(/[^a-z0-9.]/gi, "_").toLowerCase();
  const fileName = `${String(zPos).padStart(3, "0")} ${safeName}`;
  return addExtensionIfMissing(fileName, "png");
}
