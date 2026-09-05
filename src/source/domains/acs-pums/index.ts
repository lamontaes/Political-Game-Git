/**
 * The ACS PUMS domain's public API.
 *
 * #65 was the strongest donor in the metrics wave — it genuinely retrieved
 * Census bytes and its hashes verified — and the three repairs the audit asked
 * for are all made by reading the data dictionary rather than by widening a
 * hard-coded list. What is new is honesty about scope: the corpus is a declared
 * slice of one state's one-year sample, its parent files are committed whole,
 * and nothing anywhere claims a national universe.
 */

import {
  corpusCanonicalDigest,
  openProductionArtifacts,
  parseDelimited,
} from "../../core/index";
import type {
  ArtifactLock,
  CompiledCorpus,
  FixtureInput,
  OpenedArtifacts,
  ProductionInput,
  SourceDomainModule,
  ValidationReport,
} from "../../core/index";
import {
  DICTIONARY_ARTIFACT,
  HOUSING_SLICE_ARTIFACT,
  HOUSING_SLICE_PREDICATE,
  PERSON_SLICE_ARTIFACT,
  PERSON_SLICE_PREDICATE,
  QA_SLICE_GROUP_QUARTERS,
  QA_SLICE_HOUSING_UNITS,
  acsPumsAcquisition,
} from "./acquisition";
import { parsePumsDictionary } from "./dictionary";
import { readPumsRow } from "./normalize";
import {
  HOUSING_PROJECTION,
  PERSON_PROJECTION,
  UNPROJECTED_VARIABLE_NOTE,
} from "./projection";
import { validatePumsCorpus } from "./validate";
import type { PumsHousingRecord, PumsPersonRecord, PumsValue } from "./types";

export type { PumsHousingRecord, PumsPersonRecord, PumsValue } from "./types";
export {
  parsePumsDictionary,
  rangeFor,
  isNotApplicableFill,
} from "./dictionary";
export { readPumsCell } from "./normalize";
export { HOUSING_PROJECTION, PERSON_PROJECTION } from "./projection";
export {
  cutHousingSlice,
  cutPersonSlice,
  HOUSING_SLICE_ARTIFACT,
  HOUSING_ARTIFACT,
  PERSON_SLICE_ARTIFACT,
  PERSON_ARTIFACT,
  QA_SLICE_HOUSING_UNITS,
} from "./acquisition";

export const PUMS_COMPILER_VERSION = "1.0.0";
export const PUMS_PARSER_VERSION = "1.0.0";

/** The 2023 ACS 1-year estimates describe calendar year 2023. */
export const PUMS_CORPUS_AS_OF = "2023-12-31";

type PumsRole = "housingSlice" | "personSlice" | "dictionary";
export type PumsArtifacts = OpenedArtifacts<PumsRole>;

function requireValue(
  values: Readonly<Record<string, PumsValue>>,
  name: string,
): PumsValue {
  const value = values[name];
  if (!value) {
    throw new Error(`The PUMS projection does not include ${name}.`);
  }
  return value;
}

/** Compile the PUMS QA-slice corpus from locked publisher bytes. */
export function compileAcsPums(
  input: ProductionInput<PumsArtifacts> | FixtureInput<PumsArtifacts>,
): CompiledCorpus<PumsHousingRecord> {
  const inputClass = "lock" in input ? "production" : "fixture";
  const {
    housingSlice,
    personSlice,
    dictionary: dictionaryArtifact,
  } = input.artifacts;

  const dictionary = parsePumsDictionary(dictionaryArtifact.bytes);

  const housingParsed = parseDelimited(housingSlice.bytes, {
    delimiter: ",",
    hasHeaderRow: true,
    trimFields: false,
  });
  const personParsed = parseDelimited(personSlice.bytes, {
    delimiter: ",",
    hasHeaderRow: true,
    trimFields: false,
  });
  const defects = [...housingParsed.defects, ...personParsed.defects];
  if (defects.length > 0) {
    throw new Error(
      `The PUMS QA slices produced ${defects.length} parse defects, the first being: ${defects[0]?.message}`,
    );
  }

  const housingHeader = housingParsed.header ?? [];
  const personHeader = personParsed.header ?? [];

  const personsBySerial = new Map<string, PumsPersonRecord[]>();
  for (const row of personParsed.rows) {
    const variables = readPumsRow(
      dictionary,
      personHeader,
      row,
      PERSON_PROJECTION,
      personSlice.artifact.artifactId,
      PUMS_CORPUS_AS_OF,
    );
    const serial = row.fields[personHeader.indexOf("SERIALNO")] ?? "";
    const order = Number(row.fields[personHeader.indexOf("SPORDER")] ?? "0");
    const record: PumsPersonRecord = {
      serialNumber: serial,
      personNumber: Number.isFinite(order) ? order : 0,
      personWeight: requireValue(variables, "PWGTP"),
      variables,
      evidence: {
        artifactId: personSlice.artifact.artifactId,
        locator: {
          kind: "delimited-row",
          artifactId: personSlice.artifact.artifactId,
          line: row.line,
        },
      },
    };
    const bucket = personsBySerial.get(serial);
    if (bucket) bucket.push(record);
    else personsBySerial.set(serial, [record]);
  }
  for (const bucket of personsBySerial.values()) {
    bucket.sort((left, right) => left.personNumber - right.personNumber);
  }

  const records: PumsHousingRecord[] = housingParsed.rows.map((row) => {
    const variables = readPumsRow(
      dictionary,
      housingHeader,
      row,
      HOUSING_PROJECTION,
      housingSlice.artifact.artifactId,
      PUMS_CORPUS_AS_OF,
    );
    const serial = row.fields[housingHeader.indexOf("SERIALNO")] ?? "";
    return {
      serialNumber: serial,
      housingWeight: requireValue(variables, "WGTP"),
      variables,
      persons: personsBySerial.get(serial) ?? [],
      evidence: {
        artifactId: housingSlice.artifact.artifactId,
        locator: {
          kind: "delimited-row",
          artifactId: housingSlice.artifact.artifactId,
          line: row.line,
        },
      },
    };
  });

  records.sort((left, right) =>
    left.serialNumber < right.serialNumber
      ? -1
      : left.serialNumber > right.serialNumber
        ? 1
        : 0,
  );

  return {
    corpus: {
      corpusId: "acs-pums",
      compiler: { name: "acs-pums", version: PUMS_COMPILER_VERSION },
      parser: { name: "pums-csv", version: PUMS_PARSER_VERSION },
      inputs: [
        {
          artifactId: housingSlice.artifact.artifactId,
          sha256: housingSlice.artifact.bytes.sha256,
        },
        {
          artifactId: personSlice.artifact.artifactId,
          sha256: personSlice.artifact.bytes.sha256,
        },
        {
          artifactId: dictionaryArtifact.artifact.artifactId,
          sha256: dictionaryArtifact.artifact.bytes.sha256,
        },
      ],
      asOf: PUMS_CORPUS_AS_OF,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass,
      coverage: {
        isCompleteUniverse: false,
        universeDescription:
          "Sampled housing units and persons from the U.S. Census Bureau's 2023 American Community Survey 1-year Public Use Microdata Sample for Wyoming. PUMS is a weighted sample supporting estimates at the public use microdata area level; it is not an enumeration, and it is not national — the national product (csv_pus.zip) is roughly a gigabyte, is not retrieved here, and is not claimed.",
        boundedSampleReason: `Two bounds, both stated. Geographically, this is Wyoming's complete 1-year product, not the nation's. Within it, the corpus compiles a QA slice of ${QA_SLICE_HOUSING_UNITS} housing units and ${QA_SLICE_GROUP_QUARTERS} group-quarters records, with every person in them: ${HOUSING_SLICE_PREDICATE} ${PERSON_SLICE_PREDICATE} Both parents are committed whole and hashed, so the slice is re-cuttable and checkable by anyone. ${UNPROJECTED_VARIABLE_NOTE}`,
      },
    },
    records,
  } as CompiledCorpus<PumsHousingRecord>;
}

export function openPumsProduction(
  lock: ArtifactLock,
): ProductionInput<PumsArtifacts> {
  return openProductionArtifacts<PumsRole>("acs-pums", lock, {
    housingSlice: HOUSING_SLICE_ARTIFACT,
    personSlice: PERSON_SLICE_ARTIFACT,
    dictionary: DICTIONARY_ARTIFACT,
  });
}

export const sourceDomain: SourceDomainModule<PumsHousingRecord> = {
  domain: "acs-pums",
  compilerVersion: PUMS_COMPILER_VERSION,
  acquisitionPlan: acsPumsAcquisition,
  lockPath: "data/source/acs-pums/artifact-lock.json",
  compileProduction(
    lock: ArtifactLock,
  ): CompiledCorpus<PumsHousingRecord, "production"> {
    return compileAcsPums(openPumsProduction(lock)) as CompiledCorpus<
      PumsHousingRecord,
      "production"
    >;
  },
  validateCorpus(corpus: CompiledCorpus<PumsHousingRecord>): ValidationReport {
    return validatePumsCorpus(corpus);
  },
};
