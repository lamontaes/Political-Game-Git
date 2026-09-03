/**
 * The BLS LAUS domain's public API.
 *
 * Each of the audit's findings against #73 is answered structurally. There is
 * no compile timestamp because nothing tracked in this substrate carries one.
 * There is no formatter-versus-generator churn because one canonical
 * serializer writes every corpus and the generated tree is prettier-ignored.
 * The flat files are read by the core's BLS dialect parser rather than split on
 * a comma they do not contain. And the truncation is gone: the large data file
 * is cached rather than committed, and what *is* committed is a QA slice that
 * says it is one, carries its parent's digest, and states the predicate that
 * produced it.
 */

import {
  corpusCanonicalDigest,
  openProductionArtifacts,
  parseBlsTimeSeries,
} from "../../core/index";
import type {
  ArtifactLock,
  CompiledCorpus,
  Evidence,
  FixtureInput,
  OpenedArtifacts,
  ProductionInput,
  SourceDomainModule,
  ValidationReport,
} from "../../core/index";
import {
  AREA_ARTIFACT,
  AREA_TYPE_ARTIFACT,
  DATA_SLICE_ARTIFACT,
  DATA_SLICE_PREDICATE,
  FOOTNOTE_ARTIFACT,
  MEASURE_ARTIFACT,
  PERIOD_ARTIFACT,
  QA_SLICE_FIRST_YEAR,
  SERIES_ARTIFACT,
  STATE_REGION_ARTIFACT,
  blsLausAcquisition,
} from "./acquisition";
import {
  lausField,
  periodAsOf,
  readLausValue,
  splitFootnoteCodes,
} from "./normalize";
import { validateLausCorpus } from "./validate";
import type { LausObservationRecord } from "./types";

export type { LausArea, LausMeasure, LausObservationRecord } from "./types";
export {
  readLausValue,
  splitFootnoteCodes,
  periodAsOf,
  ABSENCE_FOOTNOTE_CODES,
  PRELIMINARY_FOOTNOTE_CODES,
} from "./normalize";
export { cutRecentYears, QA_SLICE_FIRST_YEAR } from "./acquisition";
export { RATE_TOLERANCE, COUNT_TOLERANCE } from "./validate";

export const LAUS_COMPILER_VERSION = "1.0.0";
export const LAUS_PARSER_VERSION = "1.0.0";

type LausRole =
  | "areaType"
  | "measure"
  | "footnote"
  | "period"
  | "stateRegion"
  | "area"
  | "series"
  | "dataSlice";

export type LausArtifacts = OpenedArtifacts<LausRole>;

function lookup(
  bytes: Uint8Array,
  keyColumn: string,
): ReadonlyMap<string, Readonly<Record<string, string>>> {
  const parsed = parseBlsTimeSeries(bytes);
  const table = new Map<string, Readonly<Record<string, string>>>();
  for (const row of parsed.rows) {
    const key = (row.values[keyColumn] ?? "").trim();
    if (key !== "") table.set(key, row.values);
  }
  return table;
}

/** Compile the LAUS corpus from locked publisher bytes. */
export function compileBlsLaus(
  input: ProductionInput<LausArtifacts> | FixtureInput<LausArtifacts>,
): CompiledCorpus<LausObservationRecord> {
  const inputClass = "lock" in input ? "production" : "fixture";
  const a = input.artifacts;

  const areaTypes = lookup(a.areaType.bytes, "area_type_code");
  const measures = lookup(a.measure.bytes, "measure_code");
  const footnotes = lookup(a.footnote.bytes, "footnote_code");
  const areas = lookup(a.area.bytes, "area_code");
  const series = lookup(a.series.bytes, "series_id");

  const footnoteText = (code: string): string =>
    (footnotes.get(code)?.footnote_text ?? "").trim() ||
    `Footnote ${code}, whose text the Bureau's footnote table does not carry.`;

  const observations = parseBlsTimeSeries(a.dataSlice.bytes);
  if (observations.defects.length > 0) {
    throw new Error(
      `The LAUS data slice produced ${observations.defects.length} parse defects, the first being: ${observations.defects[0]?.message}`,
    );
  }

  const artifactId = a.dataSlice.artifact.artifactId;
  const records: LausObservationRecord[] = [];
  const unknownSeries = new Set<string>();

  for (const row of observations.rows) {
    const seriesId = lausField(row, "series_id");
    const year = lausField(row, "year");
    const period = lausField(row, "period");
    if (seriesId === "" || year === "" || period === "") continue;

    const definition = series.get(seriesId);
    if (!definition) {
      unknownSeries.add(seriesId);
      continue;
    }

    const areaCode = (definition.area_code ?? "").trim();
    const areaTypeCode = (definition.area_type_code ?? "").trim();
    const measureCode = (definition.measure_code ?? "").trim();
    const footnoteCodes = splitFootnoteCodes(lausField(row, "footnote_codes"));

    const evidence: Evidence = {
      artifactId,
      locator: {
        kind: "delimited-row",
        artifactId,
        line: row.line,
        column: "value",
      },
      providerNativeId: seriesId,
    };

    records.push({
      recordId: `${seriesId}:${year}:${period}`,
      seriesId,
      seriesTitle: (definition.series_title ?? "").trim(),
      area: {
        areaCode,
        areaText: (areas.get(areaCode)?.area_text ?? "").trim(),
        areaTypeCode,
        areaTypeText: (areaTypes.get(areaTypeCode)?.areatype_text ?? "").trim(),
      },
      measure: {
        code: measureCode,
        text: (measures.get(measureCode)?.measure_text ?? "").trim(),
      },
      seasonalAdjustmentCode: (definition.seasonal ?? "").trim(),
      year,
      period,
      isAnnualAverage: period === "M13",
      footnoteCodes,
      footnoteTexts: footnoteCodes.map(footnoteText),
      value: readLausValue(lausField(row, "value"), {
        footnoteCodes,
        footnoteText,
        asOf: periodAsOf(year, period),
        evidence,
        isAnnualAverage: period === "M13",
      }),
      evidence,
    });
  }

  if (unknownSeries.size > 0) {
    throw new Error(
      `The LAUS data slice references ${unknownSeries.size} series that la.series does not define, the first being ${[...unknownSeries][0]}.`,
    );
  }

  records.sort((left, right) =>
    left.recordId < right.recordId
      ? -1
      : left.recordId > right.recordId
        ? 1
        : 0,
  );

  const latest = records.reduce(
    (newest, record) => (record.year > newest ? record.year : newest),
    String(QA_SLICE_FIRST_YEAR),
  );

  return {
    corpus: {
      corpusId: "bls-laus",
      compiler: { name: "bls-laus", version: LAUS_COMPILER_VERSION },
      parser: { name: "bls-timeseries", version: LAUS_PARSER_VERSION },
      inputs: [
        {
          artifactId: a.areaType.artifact.artifactId,
          sha256: a.areaType.artifact.bytes.sha256,
        },
        {
          artifactId: a.measure.artifact.artifactId,
          sha256: a.measure.artifact.bytes.sha256,
        },
        {
          artifactId: a.footnote.artifact.artifactId,
          sha256: a.footnote.artifact.bytes.sha256,
        },
        {
          artifactId: a.period.artifact.artifactId,
          sha256: a.period.artifact.bytes.sha256,
        },
        {
          artifactId: a.stateRegion.artifact.artifactId,
          sha256: a.stateRegion.artifact.bytes.sha256,
        },
        {
          artifactId: a.area.artifact.artifactId,
          sha256: a.area.artifact.bytes.sha256,
        },
        {
          artifactId: a.series.artifact.artifactId,
          sha256: a.series.artifact.bytes.sha256,
        },
        {
          artifactId: a.dataSlice.artifact.artifactId,
          sha256: a.dataSlice.artifact.bytes.sha256,
        },
      ],
      asOf: `${latest}-12-31`,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass,
      coverage: {
        isCompleteUniverse: false,
        universeDescription:
          "Seasonally adjusted Local Area Unemployment Statistics observations for every series BLS publishes in la.data.1.CurrentS. The seven reference tables that give those series their areas, measures, periods and footnote meanings are compiled from complete files.",
        boundedSampleReason: `The observation file holds 248,282 rows going back to 1976, which is past the point where committing raw bytes to this repository is reasonable. It is cached rather than committed — its identity is pinned in the lock even though its bytes are not here — and the corpus compiles a QA slice of it: ${DATA_SLICE_PREDICATE} Anyone who retrieves the parent can re-cut the slice and compare digests. BLS also publishes an unadjusted file covering many more areas, which is a different product and is not part of this corpus.`,
      },
    },
    records,
  } as CompiledCorpus<LausObservationRecord>;
}

export function openLausProduction(
  lock: ArtifactLock,
): ProductionInput<LausArtifacts> {
  return openProductionArtifacts<LausRole>("bls-laus", lock, {
    areaType: AREA_TYPE_ARTIFACT,
    measure: MEASURE_ARTIFACT,
    footnote: FOOTNOTE_ARTIFACT,
    period: PERIOD_ARTIFACT,
    stateRegion: STATE_REGION_ARTIFACT,
    area: AREA_ARTIFACT,
    series: SERIES_ARTIFACT,
    dataSlice: DATA_SLICE_ARTIFACT,
  });
}

export const sourceDomain: SourceDomainModule<LausObservationRecord> = {
  domain: "bls-laus",
  compilerVersion: LAUS_COMPILER_VERSION,
  acquisitionPlan: blsLausAcquisition,
  lockPath: "data/source/bls-laus/artifact-lock.json",
  compileProduction(
    lock: ArtifactLock,
  ): CompiledCorpus<LausObservationRecord, "production"> {
    return compileBlsLaus(openLausProduction(lock)) as CompiledCorpus<
      LausObservationRecord,
      "production"
    >;
  },
  validateCorpus(
    corpus: CompiledCorpus<LausObservationRecord>,
  ): ValidationReport {
    return validateLausCorpus(corpus);
  },
};
