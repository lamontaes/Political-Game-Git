import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
process.chdir(
  execFileSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim(),
);
const retired = "src/core2/deep-past.ts";
const current = "src/core2/past.ts";
if (existsSync(retired) || !existsSync(current))
  throw new Error(
    "Expected the retired deep-past entrypoint and the current past entrypoint",
  );
const files = [
  "tests/src/core2/work-data-native-import.test.ts",
  "src/core2/work-data-native-import.test.ts",
].filter(existsSync);
if (files.length !== 1)
  throw new Error("Expected exactly one native-import test");
const [file] = files;
const text = readFileSync(file, "utf8");
if (!text.includes(retired) && text.includes(current)) {
  console.log(
    "Native-import test already follows the current past entrypoint.",
  );
} else {
  if (text.split(retired).length !== 2)
    throw new Error("Expected one native-import anchor");
  writeFileSync(file, text.replace(retired, current));
  console.log("Repointed the native-import test to " + current);
}
