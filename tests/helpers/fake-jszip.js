/**
 * Shared fake JSZip for ZIP export tests and the issue #382 golden runner
 * (`issue382-golden-runner.mjs`).
 */

/**
 * @param {{
 *   failStandardFileAfter?: number;
 *   failStandardTreeAfter?: number;
 *   failItemsFileAfter?: number;
 *   failCustomTreeAfter?: number;
 * }} opts
 * If failStandardFileAfter is set, the Nth successful write under standard/ throws (simulates ZIP errors).
 * If failStandardTreeAfter is set, the Nth successful write under standard/ or standard/<anim>/ throws.
 * If failItemsFileAfter is set, the Nth successful write under items/ throws.
 * If failCustomTreeAfter is set, the Nth successful write whose folder path starts with custom/ throws.
 */
export function createFakeJSZip(opts = {}) {
  const files = new Map();
  let standardFileCount = 0;
  let standardTreeWrites = 0;
  let itemsFileCount = 0;
  let customTreeWrites = 0;

  function makeFolder(name, parentPath = "") {
    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    return {
      root: `${fullPath}/`,
      file(filename, data) {
        if (
          fullPath === "standard" &&
          typeof opts.failStandardFileAfter === "number"
        ) {
          standardFileCount += 1;
          if (standardFileCount > opts.failStandardFileAfter) {
            throw new Error("simulated zip write failure");
          }
        }
        if (
          fullPath.startsWith("standard") &&
          typeof opts.failStandardTreeAfter === "number"
        ) {
          standardTreeWrites += 1;
          if (standardTreeWrites > opts.failStandardTreeAfter) {
            throw new Error("simulated zip write failure");
          }
        }
        if (
          fullPath === "items" &&
          typeof opts.failItemsFileAfter === "number"
        ) {
          itemsFileCount += 1;
          if (itemsFileCount > opts.failItemsFileAfter) {
            throw new Error("simulated zip write failure");
          }
        }
        if (
          fullPath.startsWith("custom") &&
          typeof opts.failCustomTreeAfter === "number"
        ) {
          customTreeWrites += 1;
          if (customTreeWrites > opts.failCustomTreeAfter) {
            throw new Error("simulated zip write failure");
          }
        }
        files.set(`${fullPath}/${filename}`, data);
      },
      folder(sub) {
        return makeFolder(sub, fullPath);
      },
    };
  }

  return {
    files,
    file(name, data) {
      files.set(name, data);
    },
    folder(name) {
      return makeFolder(name);
    },
    generateAsync: async () => new Blob([]),
  };
}

/** @param {{ files: Map<string, unknown> }} fakeZip */
export function sortedZipKeys(fakeZip) {
  return [...fakeZip.files.keys()].sort();
}
