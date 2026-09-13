import { readFileSync, writeFileSync } from "node:fs";
import { format } from "prettier";
import type { ArtifactLock } from "../src/source/core/index";
import { compilePersonnelSourceProjection } from "../src/source/adapters/civil-personnel";

/**
 * Writes the browser-safe projection as a typed TypeScript module rather than
 * JSON: the simulation graph is loaded by Node's ESM loader under Playwright,
 * which refuses a bare JSON import.
 */
const projection = compilePersonnelSourceProjection(
  JSON.parse(
    readFileSync("data/source/civil-service-labor/artifact-lock.json", "utf8"),
  ) as ArtifactLock,
);
const output = await format(
  [
    "/**",
    " * GENERATED — do not edit by hand.",
    " *",
    " * Written by `scripts/compile-civil-personnel.ts` from the locked",
    " * civil-service-labor artifacts. Every procedure excerpt was re-found in the",
    " * rights-scoped enacted text. Regenerate with",
    " * `node --import tsx scripts/compile-civil-personnel.ts`; `--check` replays.",
    " */",
    'import type { PersonnelSourceProjection } from "./civil-personnel-contract";',
    "",
    `export const CIVIL_PERSONNEL_SOURCE_PROJECTION: PersonnelSourceProjection = ${JSON.stringify(projection)};`,
    "",
  ].join("\n"),
  { parser: "typescript" },
);
const path = "src/simulation/civil-personnel-sources.generated.ts";
if (process.argv.includes("--check")) {
  if (readFileSync(path, "utf8") !== output)
    throw new Error("Civil personnel projection is stale.");
} else writeFileSync(path, output);
