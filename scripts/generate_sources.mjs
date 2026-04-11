import fs from "fs";
import path from "path";
import { fork } from "child_process";
import { pathToFileURL } from "url";
import {
  generateCreditsCsv,
  processItemCredits,
} from "./generateSources/credits.mjs";
import { loadPaletteMetadata } from "./generateSources/palettes.mjs";
import { parseJson } from "./generateSources/items.mjs";
import {
  parseTree,
  populateAndSortCategoryTree,
  sortDirTree,
} from "./generateSources/tree.mjs";
import {
  aliasMetadata,
  categoryTree,
  itemMetadata,
  onlyIfTemplate,
  paletteMetadata,
  SHEETS_DIR,
} from "./generateSources/state.mjs";

export function generateSources(options = {}, deps = {}) {
  const {
    sheetsDir = SHEETS_DIR,
    palettesDir = null,
    metadataOutput = "item-metadata.js",
  } = options;
  const writeFileSyncFn = deps.writeFileSync ?? fs.writeFileSync;

  loadPaletteMetadata(palettesDir);

  // Read sheet_definitions/*.json line by line
  const files = fs
    .readdirSync(sheetsDir, {
      recursive: true,
      withFileTypes: true,
    })
    .sort(sortDirTree);

  files.forEach((file) => {
    if (file.isDirectory()) {
      return;
    }

    if (file.name.startsWith("meta_")) {
      parseTree(file.parentPath, file.name, { sheetsDir });
      return;
    }

    try {
      const parsedItem = parseJson(file.parentPath, file.name, { sheetsDir });
      processItemCredits({
        ...parsedItem,
        filePath: file.parentPath,
        sheetsDir,
      });
    } catch (e) {
      const fullPath = path.join(file.parentPath, file.name);
      if (!onlyIfTemplate)
        console.error(`Error parsing sheet file json data: ${fullPath}`, e);
    }
  });

  // Build and sort category tree for runtime metadata output.
  populateAndSortCategoryTree();

  generateCreditsCsv(writeFileSyncFn);

  const metadataJS = `// THIS FILE IS AUTO-GENERATED. PLEASE DON'T ALTER IT MANUALLY
  // Generated from sheet_definitions/*.json by scripts/generate_sources.mjs
  // Contains metadata for all customization items to avoid DOM queries at runtime

  window.itemMetadata = ${JSON.stringify(itemMetadata, null, 2)};

  window.aliasMetadata = ${JSON.stringify(aliasMetadata, null, 2)};

  window.categoryTree = ${JSON.stringify(categoryTree, null, 2)};

  window.paletteMetadata = ${JSON.stringify(paletteMetadata, null, 2)};
  `;

  try {
    writeFileSyncFn(metadataOutput, metadataJS);
    process.stdout.write("Item Metadata JS Updated!\n");
  } catch (err) {
    console.error(err);
  }
}

function isDirectExecution() {
  return process.argv[1]
    ? import.meta.url === pathToFileURL(process.argv[1]).href
    : false;
}

if (isDirectExecution()) {
  fork("scripts/zPositioning/parse_zpos.js");
  generateSources();
}
