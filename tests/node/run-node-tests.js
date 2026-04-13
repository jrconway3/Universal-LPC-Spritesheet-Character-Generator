import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const moduleSpecDir = path.join("tests", "node", "scripts", "generateSources");
const moduleSpecs = fs
  .readdirSync(moduleSpecDir)
  .filter((fileName) => fileName.endsWith("_spec.js"))
  .map((fileName) => path.join(moduleSpecDir, fileName));

const args = [
  "--test",
  "tests/node/scripts/generate_sources_spec.js",
  ...moduleSpecs,
];
const result = spawnSync(process.execPath, args, {
  stdio: "inherit",
  shell: false,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
