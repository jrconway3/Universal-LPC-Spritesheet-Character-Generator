import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ANIMATIONS,
  ANIMATION_CONFIGS,
} from "../../sources/state/constants.ts";

const FRAME_SIZE = 64;
const SPRITESHEETS_DIR = fileURLToPath(
  new URL("../../spritesheets/", import.meta.url),
);

// Expected column count per animation strip file: one 64px cell per frame
// index the compositor can cycle through (walk's stand frame 0 is never in
// the cycle but is part of the strip, hence max cycle index + 1 everywhere).
const expectedColumns = new Map<string, number>();
for (const animation of ANIMATIONS) {
  if (animation.noExport) continue;
  const config =
    ANIMATION_CONFIGS[animation.value as keyof typeof ANIMATION_CONFIGS];
  if (!config) continue;
  const fileName = `${animation.folderName ?? animation.value}.png`;
  const columns = Math.max(...config.cycle) + 1;
  if (expectedColumns.has(fileName)) {
    assert.equal(
      expectedColumns.get(fileName),
      columns,
      `ANIMATIONS entries disagree about ${fileName}`,
    );
  }
  expectedColumns.set(fileName, columns);
}

function collectStrips(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectStrips(full, acc);
    } else if (expectedColumns.has(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

test("every standard animation strip has the frame count the compositor cycles", () => {
  const strips = collectStrips(SPRITESHEETS_DIR);
  assert.ok(
    strips.length > 1000,
    `expected the standard animation strips to be present, found ${strips.length}`,
  );

  const broken: string[] = [];
  for (const filePath of strips) {
    const buffer = fs.readFileSync(filePath);
    const columns = buffer.readUInt32BE(16) / FRAME_SIZE;
    const expected = expectedColumns.get(path.basename(filePath)) ?? 0;
    if (columns !== expected) {
      // A mismatch usually means the strip was exported over with the wrong
      // animation (e.g. Basic Boots male thrust was a walk copy, #588).
      broken.push(
        `${filePath}: ${columns} columns, expected ${expected} (${path.basename(filePath)})`,
      );
    }
  }
  assert.deepEqual(
    broken,
    [],
    `${broken.length} animation strip(s) have the wrong frame count`,
  );
});
