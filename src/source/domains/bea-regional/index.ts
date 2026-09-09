/**
 * The BEA regional domain's public API.
 *
 * Nothing survives from #69's data. That branch wrote six rows into TypeScript
 * and hashed the serialized objects, so there was no publisher artifact to
 * re-home — the audit's verdict was rebuild the raw provenance, and this is the
 * rebuild. Its two code defects are fixed structurally rather than patched:
 * geography level comes from the product a row was published in, so a
 * metropolitan area cannot fall through a county test, and no state code is
 * parsed out of a geography name at all, so "Austin-Round Rock-Georgetown, TX
 * (MSA)" cannot yield the state "TX (MSA)".
 *
 * Nothing here becomes a cost-of-living score. A regional price parity is a
 * price level relative to the national average, and that is all it is.
 */

import {
  corpusCanonicalDigest,
  openProductionArtifacts,
  readZipMember,
} from "../../core/index";
import type {
  ArtifactLock,
  CompiledCorpus,
  FixtureInput,
  OpenedArtifact,
  OpenedArtifacts,
  ProductionInput,
  SourceDomainModule,
  ValidationReport,
} from "../../core/index";
import {
  COUNTY_INCOME_ARTIFACT,
  COUNTY_INCOME_DEFINITION,
  COUNTY_INCOME_MEMBER,
  MSA_RPP_ARTIFACT,
  MSA_RPP_DEFINITION,
  MSA_RPP_MEMBER,
  STATE_RPP_ARTIFACT,
  STATE_RPP_DEFINITION,
  STATE_RPP_MEMBER,
  beaRegionalAcquisition,
} from "./acquisition";
import { parseBeaTable, parseBeaTableDefinition } from "./parse";
import { normalizeBeaObservations } from "./normalize";
import { validateBeaCorpus } from "./validate";
import type { BeaGeographyLevel, BeaObservationRecord } from "./types";

export type {
  BeaGeographyLevel,
  BeaObservationRecord,
  BeaValuationKind,
} from "./types";
export {
  classifyBeaGeography,
  classifyValuation,
  readBeaValue,
  BEA_VALUE_CODES,
} from "./normalize";
export { parseBeaTable, parseBeaTableDefinition } from "./parse";

export const BEA_COMPILER_VERSION = "1.1.0";
export const BEA_PARSER_VERSION = "1.0.0";

/**
 * A stable pre-2020 comparison point already present in every locked table.
 * The compiler also keeps each table's latest and immediately prior year.
 */
export const BEA_COMPARISON_ANCHOR_YEAR = "2019";

type BeaRole = "countyIncome" | "stateRpp" | "msaRpp";
export type BeaArtifacts = OpenedArtifacts<BeaRole>;

interface BeaProductSpec {
  readonly role: BeaRole;
  readonly tableName: string;
  readonly member: string;
  readonly definitionMember: string;
  readonly defaultLevel: BeaGeographyLevel;
  /**
   * The publisher's encoding for this product.
   *
   * CAINC1 is Latin-1: it carries Doña Ana County, New Mexico, whose ñ is a
   * single 0xF1 byte. The price parity tables are plain ASCII.
   */
  readonly encoding: "utf-8" | "latin1";
}

/** The three products, and which geography each one publishes. */
export const BEA_PRODUCTS: readonly BeaProductSpec[] = [
  {
    role: "countyIncome",
    tableName: "CAINC1",
    member: COUNTY_INCOME_MEMBER,
    definitionMember: COUNTY_INCOME_DEFINITION,
    defaultLevel: "county",
    encoding: "latin1",
  },
  {
    role: "stateRpp",
    tableName: "SARPP",
    member: STATE_RPP_MEMBER,
    definitionMember: STATE_RPP_DEFINITION,
    defaultLevel: "state",
    encoding: "utf-8",
  },
  {
    role: "msaRpp",
    tableName: "MARPP",
    member: MSA_RPP_MEMBER,
    definitionMember: MSA_RPP_DEFINITION,
    defaultLevel: "msa",
    encoding: "utf-8",
  },
];

/** Compile the BEA regional corpus from locked publisher bytes. */
export function compileBeaRegional(
  input: ProductionInput<BeaArtifacts> | FixtureInput<BeaArtifacts>,
): CompiledCorpus<BeaObservationRecord> {
  const inputClass = "lock" in input ? "production" : "fixture";
  const records: BeaObservationRecord[] = [];
  const inputs: { artifactId: string; sha256: string }[] = [];
  const defects: string[] = [];
  const compiledYears: string[] = [];

  for (const product of BEA_PRODUCTS) {
    const opened: OpenedArtifact = input.artifacts[product.role];
    const table = parseBeaTable(
      readZipMember(opened.bytes, product.member),
      product.encoding,
    );
    const lineDescriptions = parseBeaTableDefinition(
      readZipMember(opened.bytes, product.definitionMember),
    );

    for (const defect of table.defects) {
      defects.push(`${opened.artifact.artifactId}: ${defect.message}`);
    }

    // The product supplies the year universe. Keep a small useful history from
    // the locked bytes: a stable comparison anchor, the prior year, and the
    // latest year. No year is invented and no new retrieval is needed.
    const years = selectedComparisonYears(table.years);
    if (years.length === 0) {
      throw new Error(
        `BEA table ${product.tableName} publishes no year columns.`,
      );
    }
    compiledYears.push(`${product.tableName} ${years.join(",")}`);

    for (const year of years) {
      records.push(
        ...normalizeBeaObservations(table.rows, {
          tableName: product.tableName,
          artifactId: opened.artifact.artifactId,
          header: table.header,
          year,
          lineDescriptions,
          product: { defaultLevel: product.defaultLevel },
        }),
      );
    }
    inputs.push({
      artifactId: opened.artifact.artifactId,
      sha256: opened.artifact.bytes.sha256,
    });
  }

  if (defects.length > 0) {
    throw new Error(
      `The BEA tables produced ${defects.length} parse defects, the first being: ${defects[0]}`,
    );
  }

  records.sort((left, right) =>
    left.recordId < right.recordId
      ? -1
      : left.recordId > right.recordId
        ? 1
        : 0,
  );

  const latestYear = records
    .map((record) => record.year)
    .sort()
    .at(-1);

  return {
    corpus: {
      corpusId: "bea-regional",
      compiler: { name: "bea-regional", version: BEA_COMPILER_VERSION },
      parser: { name: "bea-regional-csv", version: BEA_PARSER_VERSION },
      inputs,
      asOf: `${latestYear ?? "2024"}-12-31`,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass,
      coverage: {
        isCompleteUniverse: false,
        universeDescription:
          "Bureau of Economic Analysis regional estimates for every area published in three tables: CAINC1 county and state personal income, SARPP state regional price parities, and MARPP metropolitan regional price parities. Every area each table publishes is present; the bound is temporal, not geographic.",
        boundedSampleReason: `Each table is compiled from locked bytes for a consumer-sized historical window: ${compiledYears.join("; ")}. The selection keeps ${BEA_COMPARISON_ANCHOR_YEAR} when present plus the latest and immediately prior published years. The tables carry longer annual series in the committed artifacts; widening the bound is a recompile, not another retrieval.`,
      },
    },
    records,
  } as CompiledCorpus<BeaObservationRecord>;
}

/** Select only years the publisher actually placed in the table header. */
export function selectedComparisonYears(
  publishedYears: readonly string[],
): readonly string[] {
  const ordered = [...new Set(publishedYears)].sort();
  const latest = ordered.at(-1);
  if (!latest) return [];
  const prior = ordered.at(-2);
  return [...new Set([BEA_COMPARISON_ANCHOR_YEAR, prior, latest])]
    .filter(
      (year): year is string =>
        typeof year === "string" && ordered.includes(year),
    )
    .sort();
}

export function openBeaProduction(
  lock: ArtifactLock,
): ProductionInput<BeaArtifacts> {
  return openProductionArtifacts<BeaRole>("bea-regional", lock, {
    countyIncome: COUNTY_INCOME_ARTIFACT,
    stateRpp: STATE_RPP_ARTIFACT,
    msaRpp: MSA_RPP_ARTIFACT,
  });
}

export const sourceDomain: SourceDomainModule<BeaObservationRecord> = {
  domain: "bea-regional",
  compilerVersion: BEA_COMPILER_VERSION,
  acquisitionPlan: beaRegionalAcquisition,
  lockPath: "data/source/bea-regional/artifact-lock.json",
  compileProduction(
    lock: ArtifactLock,
  ): CompiledCorpus<BeaObservationRecord, "production"> {
    return compileBeaRegional(openBeaProduction(lock)) as CompiledCorpus<
      BeaObservationRecord,
      "production"
    >;
  },
  validateCorpus(
    corpus: CompiledCorpus<BeaObservationRecord>,
  ): ValidationReport {
    return validateBeaCorpus(corpus);
  },
};
