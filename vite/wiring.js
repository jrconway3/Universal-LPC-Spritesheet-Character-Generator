import path from "node:path";
import { fileURLToPath } from "node:url";
import { METADATA_MODULE_BASENAMES } from "../scripts/generateSources/state.mjs";
import { vitePluginItemMetadata } from "./vite-plugin-item-metadata.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const distMetadata = (basename) => path.resolve(projectRoot, "dist", basename);

function escapeForRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * `resolve.alias` entries so the app and browser tests resolve generated metadata from `dist/`.
 * Uses a regexp because root-level `*.js` metadata entry points are removed; Rolldown still needs to
 * rewrite `../item-metadata.js` (and similar) to `dist/` without an on-disk target at the alias key.
 * Basenames come from [`METADATA_MODULE_BASENAMES`](../scripts/generateSources/state.mjs) (Commit 4).
 * @returns {import("vite").AliasOptions[]}
 */
export function itemMetadataResolveAliases() {
  return METADATA_MODULE_BASENAMES.map((basename) => ({
    find: new RegExp(`^(.+[\\\\/])?${escapeForRegExp(basename)}$`),
    replacement: distMetadata(basename),
  }));
}

/**
 * Rolldown `codeSplitting.groups` entries (excluding `vendor`) for each generated metadata chunk.
 * @returns {object[]}
 */
export function itemMetadataCodeSplittingGroups() {
  return METADATA_MODULE_BASENAMES.map((basename) => ({
    name: basename.replace(/\.js$/, ""),
    test: new RegExp(`[\\\\/]${escapeForRegExp(basename)}$`),
    priority: 100,
    minSize: 0,
    maxSize: 10_000_000,
    maxModuleSize: 10_000_000,
  }));
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

export { METADATA_MODULE_BASENAMES };
