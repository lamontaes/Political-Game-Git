/** Regenerate the browser-safe federal court identities from locked corpus bytes. */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { format } from "prettier";

const ROOT = resolve(import.meta.dirname, "../..");
const INPUT = resolve(ROOT, "data/source/federal-courts/corpus.json");
const OUTPUT = resolve(
  ROOT,
  "src/simulation/judiciary/generated/federal-courts.ts",
);

interface SourceFederalCourt {
  readonly courtId: string;
  readonly courtKind:
    "court-of-appeals" | "district-court" | "bankruptcy-court";
  readonly courtName: string;
  readonly establishedByCitation: string;
  readonly statutoryTitle: 28 | 48;
  readonly circuitDesignation: string | null;
  readonly composition: readonly string[] | null;
  readonly circuitId: string | null;
  readonly jurisdictionName: string | null;
  readonly divisions:
    | readonly {
        readonly divisionName: string;
        readonly comprisesCounties: readonly string[];
        readonly courtHeldAt: readonly string[];
      }[]
    | null;
  readonly courtHeldAt: readonly string[] | null;
}

export function projectFederalCourt(record: SourceFederalCourt) {
  return {
    courtId: record.courtId,
    courtKind: record.courtKind,
    courtName: record.courtName,
    establishedByCitation: record.establishedByCitation,
    statutoryTitle: record.statutoryTitle,
    circuitDesignation: record.circuitDesignation,
    composition: record.composition,
    circuitId: record.circuitId,
    jurisdictionName: record.jurisdictionName,
    divisions:
      record.divisions?.map((division) => ({
        divisionName: division.divisionName,
        comprisesCounties: division.comprisesCounties,
        courtHeldAt: division.courtHeldAt,
      })) ?? null,
    courtHeldAt: record.courtHeldAt,
  };
}

async function main(): Promise<void> {
  const bytes = readFileSync(INPUT);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const source = JSON.parse(bytes.toString("utf8")) as SourceFederalCourt[];
  const courts = source
    .filter((record) => record.courtKind !== "bankruptcy-court")
    .map(projectFederalCourt);
  const content = `/** Generated from locked 28/48 U.S.C. court corpus. Do not edit by hand. */\nimport type { FederalCourtProjection } from "../courts";\n\nexport const FEDERAL_COURTS_CORPUS_SHA256 = "${sha256}";\nexport const FEDERAL_COURTS_PROJECTION: readonly FederalCourtProjection[] = JSON.parse(${JSON.stringify(JSON.stringify(courts))}) as readonly FederalCourtProjection[];\n`;
  const formatted = await format(content, { parser: "typescript" });
  if (process.argv.includes("--check")) {
    if (readFileSync(OUTPUT, "utf8") !== formatted)
      throw new Error("Federal court projection is stale.");
    console.log(
      `Federal court projection current: ${courts.length} courts, ${sha256}`,
    );
  } else {
    mkdirSync(dirname(OUTPUT), { recursive: true });
    writeFileSync(OUTPUT, formatted);
    console.log(
      `Federal court projection written: ${courts.length} courts, ${sha256}`,
    );
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  await main();
}
