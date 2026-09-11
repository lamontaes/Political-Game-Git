import { readFileSync, writeFileSync } from "node:fs";
import { format } from "prettier";
import type { ArtifactLock } from "../src/source/core/index";
import { compilePersonnelSourceProjection } from "../src/source/adapters/civil-personnel";
const projection = compilePersonnelSourceProjection(
  JSON.parse(
    readFileSync("data/source/civil-service-labor/artifact-lock.json", "utf8"),
  ) as ArtifactLock,
);
const output = await format(JSON.stringify(projection), { parser: "json" });
const path = "src/simulation/civil-personnel-sources.json";
if (process.argv.includes("--check")) {
  if (readFileSync(path, "utf8") !== output)
    throw new Error("Civil personnel projection is stale.");
} else writeFileSync(path, output);
