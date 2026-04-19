import path from "node:path";
import { fileURLToPath } from "node:url";
import { vitePluginItemMetadata } from "./vite-plugin-item-metadata.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

/** Absolute path importers use for `../item-metadata.js` from `sources/` and `tests/`. */
const itemMetadataAlias = path.resolve(projectRoot, "item-metadata.js");
const itemMetadataDist = path.resolve(projectRoot, "dist", "item-metadata.js");

/**
 * `resolve.alias` entries so the app and browser tests resolve generated metadata from `dist/`.
 * @returns {Record<string, string>}
 */
export function itemMetadataResolveAliases() {
  return {
    [itemMetadataAlias]: itemMetadataDist,
  };
}

/**
 * Plugins for item-metadata generation (`enforce: "pre"` is set on the plugin).
 * Runs on **serve** and **build** (no `apply` filter).
 * @returns {import("vite").Plugin[]}
 */
export function itemMetadataPlugins() {
  return [vitePluginItemMetadata()];
}
