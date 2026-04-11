import path from "path";

export const SHEETS_DIR = "sheet_definitions" + path.sep;
export const PALETTES_DIR = "palette_definitions" + path.sep;
export const onlyIfTemplate = false;

export const licensesFound = [];
export const csvList = [];
export const itemMetadata = {};
export const paletteMetadata = { versions: {}, materials: {} };
export const aliasMetadata = {};
export const categoryTree = { items: [], children: {} };
