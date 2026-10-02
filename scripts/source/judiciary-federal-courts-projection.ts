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
const SEAT_INPUT = resolve(
  ROOT,
  "data/source/judiciary-calibration/federal-seat-counts.json",
);
const SEAT_OUTPUT = resolve(
  ROOT,
  "src/simulation/judiciary/generated/federal-seat-counts.ts",
);

interface SourceSeatRow {
  readonly kind: "supreme" | "circuit" | "district";
  readonly allocation: "single-court" | "joint-districts";
  readonly publishedLabel: string;
  readonly districtLabels: readonly string[];
  readonly authorizedSeats: number;
  readonly citation: string;
  readonly artifactId: string;
  readonly sha256: string;
  readonly sourceCurrentThrough: string;
  readonly row: number;
  readonly termYears?: number;
  readonly holdsUntilSuccessorQualified?: boolean;
}

function projectSeatRow(row: SourceSeatRow) {
  return {
    kind: row.kind,
    allocation: row.allocation,
    publishedLabel: row.publishedLabel,
    districtLabels: row.districtLabels,
    authorizedSeats: row.authorizedSeats,
    citation: row.citation,
    artifactId: row.artifactId,
    sha256: row.sha256,
    sourceCurrentThrough: row.sourceCurrentThrough,
    row: row.row,
    ...(row.termYears === undefined ? {} : { termYears: row.termYears }),
    ...(row.holdsUntilSuccessorQualified === undefined
      ? {}
      : { holdsUntilSuccessorQualified: row.holdsUntilSuccessorQualified }),
  };
}

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
  readonly comprisesCounties: readonly string[] | null;
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
    comprisesCounties: record.comprisesCounties,
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
  const seatBytes = readFileSync(SEAT_INPUT);
  const seatSha256 = createHash("sha256").update(seatBytes).digest("hex");
  const seatSource = JSON.parse(seatBytes.toString("utf8")) as {
    readonly records: readonly SourceSeatRow[];
  };
  const seatRows = seatSource.records.map(projectSeatRow);
  const seatContent = `/** Generated from locked 28 U.S.C. 1, 44 and 133 seat rows. Joint rows are shared allocations. */\nimport type { FederalSeatCountProjection } from "../courts";\n\nexport const FEDERAL_SEAT_COUNTS_SHA256 = "${seatSha256}";\nexport const FEDERAL_SEAT_COUNT_ROWS: readonly FederalSeatCountProjection[] = JSON.parse(${JSON.stringify(JSON.stringify(seatRows))}) as readonly FederalSeatCountProjection[];\n`;
  const formattedSeats = await format(seatContent, { parser: "typescript" });
  if (process.argv.includes("--check")) {
    if (readFileSync(OUTPUT, "utf8") !== formatted)
      throw new Error("Federal court projection is stale.");
    if (readFileSync(SEAT_OUTPUT, "utf8") !== formattedSeats)
      throw new Error("Federal seat-count projection is stale.");
    console.log(
      `Federal court projection current: ${courts.length} courts and ${seatRows.length} seat rows, ${sha256}, ${seatSha256}`,
    );
  } else {
    mkdirSync(dirname(OUTPUT), { recursive: true });
    writeFileSync(OUTPUT, formatted);
    writeFileSync(SEAT_OUTPUT, formattedSeats);
    console.log(
      `Federal court projection written: ${courts.length} courts and ${seatRows.length} seat rows, ${sha256}, ${seatSha256}`,
    );
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === resolve(import.meta.filename)
) {
  await main();
}
