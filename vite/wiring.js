import path from "node:path";
import { fileURLToPath } from "node:url";
import { vitePluginItemMetadata } from "./vite-plugin-item-metadata.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const distMetadata = (basename) => path.resolve(projectRoot, "dist", basename);

/**
 * `resolve.alias` entries so the app and browser tests resolve generated metadata from `dist/`.
 * Uses a regexp because root-level `*.js` metadata entry points are removed; Rolldown still needs to
 * rewrite `../item-metadata.js` (and similar) to `dist/` without an on-disk target at the alias key.
 * @returns {import("vite").AliasOptions[]}
 */
export function itemMetadataResolveAliases() {
  return [
    {
      find: /^(.+[\\/])?item-metadata\.js$/,
      replacement: distMetadata("item-metadata.js"),
    },
    {
      find: /^(.+[\\/])?index-metadata\.js$/,
      replacement: distMetadata("index-metadata.js"),
    },
    {
      find: /^(.+[\\/])?palette-metadata\.js$/,
      replacement: distMetadata("palette-metadata.js"),
    },
    {
      find: /^(.+[\\/])?credits-metadata\.js$/,
      replacement: distMetadata("credits-metadata.js"),
    },
    {
      find: /^(.+[\\/])?layers-metadata\.js$/,
      replacement: distMetadata("layers-metadata.js"),
    },
  ];
}

/**
 * Plugins for item-metadata generation (`enforce: "pre"` is set on the plugin).
 * Runs on **serve** and **build** (no `apply` filter).
 * @returns {import("vite").Plugin[]}
 */
export function itemMetadataPlugins(command) {
  const env = command === "build" ? "production" : "development";
  return [vitePluginItemMetadata(env)];
}
