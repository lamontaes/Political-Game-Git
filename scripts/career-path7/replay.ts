import { readFileSync, writeFileSync } from "node:fs";
import { compileCareerOccupations } from "../../src/source/domains/career-occupations/compile";
import { writeProductionCorpus } from "../../src/source/core/index";
const c = compileCareerOccupations(
  JSON.parse(
    readFileSync("data/source/career-occupations/artifact-lock.json", "utf8"),
  ),
);
const output =
  JSON.stringify(
    c.records.filter((r) =>
      ["41-2031.00", "43-9061.00", "49-9043.00"].includes(r.id),
    ),
    null,
    2,
  ) + "\n";
const file = "src/presentation/generated/career-occupations.json";
if (process.argv.includes("--write")) {
  writeProductionCorpus(
    c,
    "data/source/career-occupations/corpus.json",
    "data/source/career-occupations/corpus-manifest.json",
  );
  writeFileSync(file, output);
} else if (readFileSync(file, "utf8") !== output)
  throw new Error(
    "Career runtime projection differs from locked source replay.",
  );
console.log(
  `${c.records.length} occupations; ${c.records.reduce((n, r) => n + r.tasks.length, 0)} source tasks; 62 tasks projected for existing LIFE contexts.`,
);
