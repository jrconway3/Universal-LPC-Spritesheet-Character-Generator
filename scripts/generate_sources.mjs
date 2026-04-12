import fs from "fs";
import path from "path";
import { fork } from "child_process";
import { pathToFileURL } from "url";
import {
  CREDITS_OUTPUT,
  generateCreditsCsv,
  processItemCredits,
} from "./generateSources/credits.mjs";
import { loadPaletteMetadata } from "./generateSources/palettes.mjs";
import { parseItem } from "./generateSources/items.mjs";
import {
  parseTree,
  populateAndSortCategoryTree,
  sortDirTree,
} from "./generateSources/tree.mjs";
import {
  buildMetadataJs,
  METADDATA_OUTPUT,
  onlyIfTemplate,
  SHEETS_DIR,
} from "./generateSources/state.mjs";

export function generateSources(options = {}, deps = {}) {
  const {
    sheetsDir = SHEETS_DIR,
    palettesDir = null,
    metadataOutput = METADDATA_OUTPUT,
  } = options;
  const writeFileSyncFn = deps.writeFileSync ?? fs.writeFileSync;
  const parseTreeFn = deps.parseTreeFn ?? parseTree;
  const parseJsonFn = deps.parseJsonFn ?? parseItem;
  const processItemCreditsFn = deps.processItemCreditsFn ?? processItemCredits;

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
      parseTreeFn(file.parentPath, file.name);
      return;
    }

    try {
      const { itemId, definition } = parseJsonFn(file.parentPath, file.name);
      processItemCreditsFn(itemId, file.parentPath, definition);
    } catch (e) {
      const fullPath = path.join(file.parentPath, file.name);
      if (!onlyIfTemplate)
        console.error(`Error parsing sheet file json data: ${fullPath}`, e);
    }
  });

  // Build and sort category tree for runtime metadata output.
  populateAndSortCategoryTree();

  // Write Credits CSV Output
  const csvGenerated = generateCreditsCsv();
  try {
    writeFileSyncFn(CREDITS_OUTPUT, csvGenerated);
    process.stdout.write("CSV Updated!\n");
  } catch (err) {
    console.error(err);
  }

  // Build and Write Item Metadata Output
  const metadataJS = buildMetadataJs();
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
