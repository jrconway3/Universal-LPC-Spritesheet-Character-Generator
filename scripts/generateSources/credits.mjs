import path from "path";
import debugUtils from "../utils/debug.js";
import { ANIMATIONS } from "../../sources/state/constants.js";
import {
  categoryTree,
  csvList,
  itemMetadata,
  licensesFound,
  onlyIfTemplate,
  SHEETS_DIR,
} from "./state.mjs";

const { debugLog } = debugUtils;

/**
 * Prints a sorted list to debug output using a colored bracketed format.
 * @param {string[]} array String array to print.
 * @param {string} label Prefix label for the printed array.
 * @return {void} No return value.
 */
function printArray(array, label) {
  const colors = {
    red: "\x1b[31m",
    reset: "\x1b[0m",
  };
  debugLog(`${label}: ${colors.red}[`);
  array.sort();
  for (const item of array) {
    debugLog(`  "${item}",`);
  }
  debugLog(`]${colors.reset}`);
}

/**
 * Recursively resolves the best credit entry for a generated sprite filename.
 * @param {string} fileName Candidate filename or path fragment to match.
 * @param {Array<Object>} credits Credits list from a sheet definition.
 * @param {string} origFileName Original filename used for terminal error logging.
 * @return {Object|undefined} Matching credit object when found; otherwise undefined.
 * @throws {TypeError} If credits is not an array-like object and indexed access fails.
 */
function searchCredit(fileName, credits, origFileName) {
  if (credits.count <= 0) {
    console.error("no credits for filename:", fileName);
    return undefined;
  }
  if (credits.count === 1) {
    if (!credits[0].file.includes(fileName)) {
      console.error("Wrong credit at filename:", fileName);
    }
    return undefined;
  }

  for (let creditsIndex = 0; creditsIndex < credits.length; creditsIndex++) {
    const credit = credits[creditsIndex];
    if (
      credit.file === fileName ||
      credit.file === fileName + ".png" ||
      credit.file + "/" === fileName
    ) {
      return credit;
    }
  }

  const index = fileName.lastIndexOf("/");
  if (index > -1) {
    return searchCredit(fileName.substring(0, index), credits, origFileName);
  } else {
    console.error(
      "missing credit after searching recursively filename:",
      origFileName,
    );
  }
  return undefined;
}

/**
 * Builds CSV credit row data for a specific rendered frame and tracks encountered licenses.
 * @param {string} fileName Render path to resolve credit information for.
 * @param {Array<Object>} credits Credit entries defined for the item.
 * @param {Object|null} listCreditToUse Current selected credit for this item run.
 * @param {Array<string>} addedCreditsFor Paths already emitted to CSV.
 * @param {string} sex Active body type being processed.
 * @param {number} jdx Layer index being processed.
 * @return {[Object|null, string, string]} Updated selected credit, generated CSV line text, and image filename token.
 * @throws {Error} If no matching credit can be resolved for the requested filename.
 */
export function parseCredits(fileName, credits, listCreditToUse, addedCreditsFor, sex, jdx) {
  const fileNameForCreditSearch = fileName;
  const imageFileName = '"' + fileName + '.png" ';
  if (!onlyIfTemplate)
    debugLog(
      `Searching for credits to use for ${imageFileName} in ${fileNameForCreditSearch} for layer ${jdx}`,
    );

  const creditToUse = searchCredit(
    fileNameForCreditSearch,
    credits,
    fileNameForCreditSearch,
  );
  if (!onlyIfTemplate)
    debugLog(`file name set for ${sex} is ${imageFileName} for layer ${jdx}`);

  if (creditToUse !== undefined) {
    // comparing via JSON.stringify is faster than node-deep-equal library
    if (
      listCreditToUse !== null &&
      JSON.stringify(listCreditToUse) !== JSON.stringify(creditToUse)
    ) {
      // do nothing
    } else if (listCreditToUse === null) {
      listCreditToUse = creditToUse;
    }
    for (const license of creditToUse.licenses) {
      if (!licensesFound.includes(license)) {
        licensesFound.push(license);
      }
    }
    const licenses = '"' + creditToUse.licenses.join(",") + '" ';
    const authors = '"' + creditToUse.authors.join(",") + '" ';
    const urls = '"' + creditToUse.urls.join(",") + '" ';
    const notes = '"' + creditToUse.notes.replaceAll('"', "**") + '" ';
    let lineText = "";
    if (!addedCreditsFor.includes(imageFileName)) {
      const quotedShortName = '"' + fileName + '.png"';
      lineText = `${quotedShortName},${notes},${authors},${licenses},${urls}\n`;
    }
    return [listCreditToUse, lineText, imageFileName];
  } else {
    throw Error(`missing credit inside ${fileName}`);
  }
}

/**
 * Builds CSV credit rows for one item across all supported animations, body types, and layers.
 * @param {Object} params Input parameters.
 * @param {Object} params.definition Parsed sheet definition object.
 * @param {string[]} params.animations Animation names to evaluate.
 * @param {string[]} params.requiredSexes Body types required by the item.
 * @param {Object[]} params.credits Credits entries from item metadata.
 * @param {number|null|undefined} params.priority Item priority copied into CSV row payloads.
 * @return {{listCreditToUse: Object|null, listItemsCSV: Array<{priority: (number|null|undefined), lineText: string}>}} Generated CSV row payloads and selected credit.
 * @throws {Error} Propagates missing-credit errors from parseCredits.
 */
export function collectCreditsCsvRows({
  definition,
  animations,
  requiredSexes,
  credits,
  priority,
}) {
  let listCreditToUse = null;
  const listItemsCSV = [];
  const addedCreditsFor = [];

  for (const anim of animations) {
    const animConfig = ANIMATIONS.find(({ value }) => value === anim);
    if (animConfig?.noExport) continue;
    const snakeItemName = anim.replaceAll(" ", "_");

    for (const sex of requiredSexes) {
      for (let jdx = 1; jdx < 10; jdx++) {
        const layerDefinition = definition[`layer_${jdx}`];
        if (layerDefinition === undefined) {
          break;
        }

        const file = layerDefinition[sex];
        if (file !== null && file !== "") {
          const searchFileName = file + snakeItemName;
          const [newCreditToUse, lineText, creditsFor] = parseCredits(
            searchFileName,
            credits,
            listCreditToUse,
            addedCreditsFor,
            sex,
            jdx,
          );
          listCreditToUse = newCreditToUse;
          listItemsCSV.push({
            priority,
            lineText,
          });
          addedCreditsFor.push(creditsFor);
        }
      }
    }
  }

  return { listCreditToUse, listItemsCSV };
}

/**
 * Appends a generated CSV block to shared CSV list state with normalized relative path.
 * @param {string} filePath Parent directory path of the processed sheet file.
 * @param {Array<{priority: (number|null|undefined), lineText: string}>} csv Generated CSV row payloads.
 * @param {{sheetsDir?: string}} [options] Optional path normalization options.
 * @param {string} [options.sheetsDir] Sheets root used to strip absolute prefixes from filePath.
 * @return {void} No return value.
 */
export function appendCsvEntry(filePath, csv, options = {}) {
  const { sheetsDir = SHEETS_DIR } = options;
  const normalizedSheetsDir = sheetsDir.endsWith(path.sep)
    ? sheetsDir
    : sheetsDir + path.sep;
  csvList.push({
    path: filePath.replace(normalizedSheetsDir, ""),
    csv,
  });
}

/**
 * Generates CSV rows and injects resolved license data for one parsed item.
 * @param {Object} params Input parameters.
 * @param {string} params.itemId Parsed item identifier used to look up shared metadata.
 * @param {string} params.filePath Parent directory path of the processed sheet file.
 * @param {Object} params.definition Parsed sheet definition object used for layer traversal.
 * @param {string} [params.sheetsDir] Optional sheets root used for CSV path normalization.
 * @return {{csv: Array<{priority: (number|null|undefined), lineText: string}>, listCreditToUse: Object|null}} Generated CSV rows and selected credit.
 * @throws {Error} Propagates missing-credit errors from collectCreditsCsvRows.
 */
export function processItemCredits({
  itemId,
  filePath,
  definition,
  sheetsDir,
}) {
  const meta = itemMetadata[itemId];
  const animations = meta.animations ?? [];
  const requiredSexes = meta.required ?? [];
  const credits = meta.credits ?? [];
  const priority = meta.priority;

  const { listCreditToUse, listItemsCSV } = collectCreditsCsvRows({
    definition,
    animations,
    requiredSexes,
    credits,
    priority,
  });

  if (!itemMetadata[itemId].licenses) {
    itemMetadata[itemId].licenses = {};
  }

  for (const sex of requiredSexes) {
    itemMetadata[itemId].licenses[sex] = listCreditToUse?.licenses || [];
  }

  appendCsvEntry(filePath, listItemsCSV, { sheetsDir });

  return { csv: listItemsCSV, listCreditToUse };
}

/**
 * Sorts CSV list entries by category tree priority and label path.
 * @param {Array<{path: string, csv: Array<{priority: (number|null|undefined), lineText: string}>}>} csvList CSV sections grouped by directory path.
 * @param {{children?: Object<string, any>}} categoryTree Category tree used for priority and label lookup.
 * @return {void} No return value; sorts csvList in place.
 */
export function sortCsvList(csvList, categoryTree) {
  csvList.sort((a, b) => {
    const pathA = a.path.split(path.sep).filter(Boolean);
    const pathB = b.path.split(path.sep).filter(Boolean);

    const maxLen = Math.max(pathA.length, pathB.length);
    for (let i = 0; i < maxLen; i++) {
      if (i >= pathA.length) return -1;
      if (i >= pathB.length) return 1;

      const segA = pathA[i];
      const segB = pathB[i];

      if (segA === segB) continue;

      let nodeA = categoryTree;
      let nodeB = categoryTree;
      for (let j = 0; j <= i; j++) {
        nodeA = nodeA.children?.[pathA[j]];
        nodeB = nodeB.children?.[pathB[j]];
        if (!nodeA || !nodeB) break;
      }

      const prioA = nodeA?.priority ?? Number.POSITIVE_INFINITY;
      const prioB = nodeB?.priority ?? Number.POSITIVE_INFINITY;
      if (prioA !== prioB) return prioA - prioB;

      const labelA = nodeA?.label ?? segA;
      const labelB = nodeB?.label ?? segB;
      return labelA.localeCompare(labelB, ["en"]);
    }

    return 0;
  });
}

/**
 * Generates final CREDITS.csv content from shared CSV/category state and writes it to disk.
 * @param {(filePath: string, data: string) => void} writeFileSyncFn File writer dependency.
 * @return {string} Full generated CSV text.
 */
export function generateCreditsCsv(writeFileSyncFn) {
  const creditsOutput = "CREDITS.csv";
  sortCsvList(csvList, categoryTree);

  let csvGenerated = "filename,notes,authors,licenses,urls\n";
  for (const result of csvList) {
    for (const item of result.csv) {
      csvGenerated += item.lineText;
    }
  }

  try {
    writeFileSyncFn(creditsOutput, csvGenerated);
    process.stdout.write("CSV Updated!\n");
    printArray(licensesFound, "Found licenses");
  } catch (err) {
    console.error(err);
  }

  return csvGenerated;
}
