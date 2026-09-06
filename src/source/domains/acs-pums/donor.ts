/**
 * Dictionary-controlled ACS PUMS household donors.
 *
 * This is a cross-sectional source projection, not a biography generator. It
 * keeps every selected person attached to the housing record with the same
 * SERIALNO, preserves both survey weights, and carries only fields for which a
 * current canonical-initialization consumer has been identified. A later
 * adapter decides which of those facts fit existing world primitives.
 */

import {
  corpusCanonicalDigest,
  inputClassOf,
  openFixture,
  parseDelimited,
  readZipMember,
  sha256Hex,
} from "../../core/index";
import type {
  CompiledCorpus,
  Evidence,
  FixtureInput,
  OpenedArtifact,
  OpenedArtifacts,
  ProductionInput,
  SourceStateName,
} from "../../core/index";
import type { AcsPumsStateShardIdentity } from "./acquisition";
import { parsePumsDictionary, rangeFor } from "./dictionary";
import type { PumsDictionary } from "./dictionary";
import { readPumsRow } from "./normalize";
import type { PumsValue } from "./types";

export const PUMS_DONOR_COMPILER_VERSION = "1.0.0";
export const PUMS_DONOR_PARSER_VERSION = "1.0.0";

export const DONOR_HOUSING_PROJECTION: readonly string[] = [
  "RT",
  "SERIALNO",
  "PUMA",
  "STATE",
  "WGTP",
  "NP",
  "TYPEHUGQ",
  "BLD",
  "FBLDP",
  "TEN",
  "FTENP",
];

export const DONOR_PERSON_PROJECTION: readonly string[] = [
  "RT",
  "SERIALNO",
  "SPORDER",
  "PUMA",
  "STATE",
  "PWGTP",
  "AGEP",
  "FAGEP",
  "RELSHIPP",
  "FRELSHIPP",
  "SEX",
  "FSEXP",
  "SCH",
  "FSCHP",
  "SCHG",
  "FSCHGP",
  "SCHL",
  "FSCHLP",
  "ESR",
  "FESRP",
  "COW",
  "FCOWP",
  "OCCP",
  "FOCCP",
  "WKHP",
];

const DONOR_PERSON_OPTIONAL_PROJECTION = ["FWKHP"] as const;

export type PumsAllocationStatus =
  "reported" | "allocated" | "not-applicable" | "unknown";

export interface PumsCodedValue<TCanonical extends string = string> {
  readonly code: string;
  readonly label: string;
  readonly canonical: TCanonical | null;
}

export interface PumsKnownDonorFact<T> {
  readonly variable: string;
  readonly state: "KNOWN";
  readonly value: T;
  readonly rawValue: string | number;
  readonly sourceLabel: string;
  readonly allocation: PumsAllocationStatus;
  readonly evidence: readonly [Evidence, ...Evidence[]];
  readonly asOf: string;
}

type PumsUnavailableState = Exclude<SourceStateName, "KNOWN">;

export interface PumsUnavailableDonorFact {
  readonly variable: string;
  readonly state: PumsUnavailableState;
  /** The exact source algebra value; unavailable states are never defaulted. */
  readonly source: PumsValue;
}

export type PumsDonorFact<T> = PumsKnownDonorFact<T> | PumsUnavailableDonorFact;

export type PumsUnitType =
  | "housing-unit"
  | "institutional-group-quarters"
  | "noninstitutional-group-quarters";

export type PumsHouseholdRelationship =
  | "reference-person"
  | "spouse"
  | "unmarried-partner"
  | "biological-child"
  | "adopted-child"
  | "stepchild"
  | "sibling"
  | "parent"
  | "grandchild"
  | "parent-in-law"
  | "child-in-law"
  | "other-relative"
  | "roommate-or-housemate"
  | "foster-child"
  | "other-nonrelative"
  | "institutional-group-quarters-person"
  | "noninstitutional-group-quarters-person";

export type PumsSchoolEnrollment =
  | "not-enrolled-last-three-months"
  | "public-school-or-college"
  | "private-school-college-or-home-school";

export type PumsEmploymentStatus =
  | "civilian-employed-at-work"
  | "civilian-employed-absent"
  | "unemployed"
  | "armed-forces-at-work"
  | "armed-forces-absent"
  | "not-in-labor-force";

export type PumsHousingTenure =
  | "owned-with-mortgage-or-loan"
  | "owned-free-and-clear"
  | "rented"
  | "occupied-without-rent";

export type PumsBuildingType =
  | "mobile-home-or-trailer"
  | "single-family-detached"
  | "single-family-attached"
  | "two-apartments"
  | "three-to-four-apartments"
  | "five-to-nine-apartments"
  | "ten-to-nineteen-apartments"
  | "twenty-to-forty-nine-apartments"
  | "fifty-or-more-apartments"
  | "boat-rv-van-or-other";

export interface PumsDonorPerson {
  readonly serialNumber: string;
  readonly personNumber: number;
  readonly puma: string;
  readonly personWeight: PumsValue;
  readonly age: PumsDonorFact<number>;
  readonly relationship: PumsDonorFact<
    PumsCodedValue<PumsHouseholdRelationship>
  >;
  /** Evidence only. The character-history adapter never writes identity from it. */
  readonly sourceSexEvidence: PumsDonorFact<PumsCodedValue>;
  readonly schoolEnrollment: PumsDonorFact<
    PumsCodedValue<PumsSchoolEnrollment>
  >;
  readonly gradeAttending: PumsDonorFact<PumsCodedValue>;
  readonly educationalAttainment: PumsDonorFact<PumsCodedValue>;
  readonly employmentStatus: PumsDonorFact<
    PumsCodedValue<PumsEmploymentStatus>
  >;
  readonly classOfWorker: PumsDonorFact<PumsCodedValue>;
  readonly occupation: PumsDonorFact<PumsCodedValue>;
  readonly usualHoursWorked: PumsDonorFact<number>;
  readonly evidence: Evidence;
}

export interface PumsHouseholdDonor {
  readonly shard: AcsPumsStateShardIdentity;
  readonly serialNumber: string;
  readonly puma: string;
  readonly householdWeight: PumsValue;
  readonly unitType: PumsDonorFact<PumsCodedValue<PumsUnitType>>;
  readonly householdSize: PumsDonorFact<number>;
  readonly buildingType: PumsDonorFact<PumsCodedValue<PumsBuildingType>>;
  readonly tenure: PumsDonorFact<PumsCodedValue<PumsHousingTenure>>;
  readonly persons: readonly PumsDonorPerson[];
  readonly evidence: Evidence;
}

declare const ACS_PUMS_DONOR_CORPUS: unique symbol;

/** A donor corpus that can only be obtained through the guarded compiler. */
export interface AcsPumsDonorCorpus<
  TClass extends "production" | "fixture" = "production" | "fixture",
> extends CompiledCorpus<PumsHouseholdDonor, TClass> {
  readonly [ACS_PUMS_DONOR_CORPUS]: true;
}

export type PumsDonorArtifactRole = "housing" | "person" | "dictionary";
export type PumsDonorArtifacts = OpenedArtifacts<PumsDonorArtifactRole>;

export interface PumsDonorFixtureArtifacts {
  readonly identity: AcsPumsStateShardIdentity;
  readonly housingCsv: string;
  readonly personCsv: string;
  readonly dictionaryCsv: string;
}

interface ArtifactBytes {
  readonly artifactId: string;
  readonly sha256: string;
  readonly bytes: Buffer;
}

interface CompilerBytes {
  readonly inputClass: "production" | "fixture";
  readonly identity: AcsPumsStateShardIdentity;
  readonly housing: ArtifactBytes;
  readonly person: ArtifactBytes;
  readonly dictionary: ArtifactBytes;
  readonly boundedSampleReason: string;
}

const UNIT_TYPES: Readonly<Record<string, PumsUnitType>> = {
  "Housing unit": "housing-unit",
  "Institutional group quarters": "institutional-group-quarters",
  "Noninstitutional group quarters": "noninstitutional-group-quarters",
};

const RELATIONSHIPS: Readonly<Record<string, PumsHouseholdRelationship>> = {
  "Reference person": "reference-person",
  "Opposite-sex husband/wife/spouse": "spouse",
  "Same-sex husband/wife/spouse": "spouse",
  "Opposite-sex unmarried partner": "unmarried-partner",
  "Same-sex unmarried partner": "unmarried-partner",
  "Biological son or daughter": "biological-child",
  "Adopted son or daughter": "adopted-child",
  "Stepson or stepdaughter": "stepchild",
  "Brother or sister": "sibling",
  "Father or mother": "parent",
  Grandchild: "grandchild",
  "Parent-in-law": "parent-in-law",
  "Son-in-law or daughter-in-law": "child-in-law",
  "Other relative": "other-relative",
  "Roommate or housemate": "roommate-or-housemate",
  "Foster child": "foster-child",
  "Other nonrelative": "other-nonrelative",
  "Institutionalized group quarters population":
    "institutional-group-quarters-person",
  "Noninstitutionalized group quarters population":
    "noninstitutional-group-quarters-person",
};

const SCHOOL_ENROLLMENT: Readonly<Record<string, PumsSchoolEnrollment>> = {
  "No, has not attended in the last 3 months": "not-enrolled-last-three-months",
  "Yes, public school or public college": "public-school-or-college",
  "Yes, private school or college or home school":
    "private-school-college-or-home-school",
};

const EMPLOYMENT_STATUS: Readonly<Record<string, PumsEmploymentStatus>> = {
  "Civilian employed, at work": "civilian-employed-at-work",
  "Civilian employed, with a job but not at work": "civilian-employed-absent",
  Unemployed: "unemployed",
  "Armed forces, at work": "armed-forces-at-work",
  "Armed forces, with a job but not at work": "armed-forces-absent",
  "Not in labor force": "not-in-labor-force",
};

const TENURE: Readonly<Record<string, PumsHousingTenure>> = {
  "Owned with mortgage or loan (include home equity loans)":
    "owned-with-mortgage-or-loan",
  "Owned free and clear": "owned-free-and-clear",
  Rented: "rented",
  "Occupied without payment of rent": "occupied-without-rent",
};

const BUILDING_TYPES: Readonly<Record<string, PumsBuildingType>> = {
  "Mobile home or trailer": "mobile-home-or-trailer",
  "One-family house detached": "single-family-detached",
  "One-family house attached": "single-family-attached",
  "2 Apartments": "two-apartments",
  "3-4 Apartments": "three-to-four-apartments",
  "5-9 Apartments": "five-to-nine-apartments",
  "10-19 Apartments": "ten-to-nineteen-apartments",
  "20-49 Apartments": "twenty-to-forty-nine-apartments",
  "50 or more apartments": "fifty-or-more-apartments",
  "Boat, RV, van, etc.": "boat-rv-van-or-other",
};

function requiredColumns(
  header: readonly string[],
  projection: readonly string[],
  label: string,
): void {
  const missing = projection.filter((name) => !header.includes(name));
  if (missing.length > 0) {
    throw new Error(
      `${label} is missing required columns: ${missing.join(", ")}.`,
    );
  }
}

function requiredDictionary(
  dictionary: PumsDictionary,
  projection: readonly string[],
): void {
  const missing = projection.filter((name) => !dictionary.has(name));
  if (missing.length > 0) {
    throw new Error(
      `The declared PUMS dictionary is missing donor variables: ${missing.join(", ")}.`,
    );
  }
}

function allocationStatus(
  values: Readonly<Record<string, PumsValue>>,
  flagName: string | null,
): PumsAllocationStatus {
  if (flagName === null) return "unknown";
  const flag = values[flagName];
  if (!flag) return "unknown";
  if (flag.state === "NOT_APPLICABLE") return "not-applicable";
  if (flag.state !== "KNOWN") return "unknown";
  if (flag.value === "0" || flag.value === 0) return "reported";
  if (flag.value === "1" || flag.value === 1) return "allocated";
  return "unknown";
}

function unavailable(
  variable: string,
  value: PumsValue,
): PumsUnavailableDonorFact {
  return {
    variable,
    state: value.state === "KNOWN" ? "UNKNOWN" : value.state,
    source:
      value.state === "KNOWN"
        ? {
            state: "UNKNOWN",
            reason: `${variable} could not be translated through the declared dictionary.`,
            investigated: value.evidence,
          }
        : value,
  };
}

function donorFact<T>(
  dictionary: PumsDictionary,
  values: Readonly<Record<string, PumsValue>>,
  variable: string,
  allocationFlag: string | null,
  translate: (raw: string | number, label: string) => T,
): PumsDonorFact<T> {
  const source = values[variable];
  if (!source) {
    return {
      variable,
      state: "UNKNOWN",
      source: {
        state: "UNKNOWN",
        reason: `${variable} was not projected from the row.`,
        investigated: [],
      },
    };
  }
  if (source.state !== "KNOWN") return unavailable(variable, source);
  const definition = dictionary.get(variable);
  const range = definition ? rangeFor(definition, String(source.value)) : null;
  if (!range) return unavailable(variable, source);
  return {
    variable,
    state: "KNOWN",
    value: translate(source.value, range.label),
    rawValue: source.value,
    sourceLabel: range.label,
    allocation: allocationStatus(values, allocationFlag),
    evidence: source.evidence,
    asOf: source.asOf,
  };
}

function coded<T extends string>(
  map: Readonly<Record<string, T>>,
): (raw: string | number, label: string) => PumsCodedValue<T> {
  return (raw, label) => ({
    code: String(raw),
    label,
    canonical: map[label] ?? null,
  });
}

function genericCode(raw: string | number, label: string): PumsCodedValue {
  return { code: String(raw), label, canonical: null };
}

function exactNumber(raw: string | number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    throw new Error(
      `Expected a dictionary-declared numeric PUMS value; got ${raw}.`,
    );
  }
  return raw;
}

function knownString(
  values: Readonly<Record<string, PumsValue>>,
  name: string,
  recordLabel: string,
): string {
  const value = values[name];
  if (!value || value.state !== "KNOWN") {
    throw new Error(`${recordLabel} has no known ${name}.`);
  }
  return String(value.value);
}

function knownNumber(
  values: Readonly<Record<string, PumsValue>>,
  name: string,
  recordLabel: string,
): number {
  const value = values[name];
  if (!value || value.state !== "KNOWN" || typeof value.value !== "number") {
    throw new Error(`${recordLabel} has no known numeric ${name}.`);
  }
  return value.value;
}

function tableBytes(artifact: OpenedArtifact): Buffer {
  if (artifact.artifact.mediaType !== "application/zip") return artifact.bytes;
  const member = artifact.artifact.container?.memberPath;
  if (!member) {
    throw new Error(
      `PUMS archive ${artifact.artifact.artifactId} has no locked container member.`,
    );
  }
  return readZipMember(artifact.bytes, member);
}

function compileDonorBytes(
  input: CompilerBytes,
): CompiledCorpus<PumsHouseholdDonor> {
  const { identity } = input;
  if (
    identity.product !== "acs-1-year-pums" ||
    identity.surveyYear !== 2024 ||
    !/^[A-Z]{2}$/.test(identity.stateUsps) ||
    !/^\d{2}$/.test(identity.stateFips)
  ) {
    throw new Error(
      "ACS PUMS donor identity must name the 2024 1-year product and normalized state codes.",
    );
  }
  const asOf = `${identity.surveyYear}-12-31`;
  const dictionary = parsePumsDictionary(input.dictionary.bytes);
  requiredDictionary(dictionary, [
    ...DONOR_HOUSING_PROJECTION,
    ...DONOR_PERSON_PROJECTION,
  ]);

  const housingParsed = parseDelimited(input.housing.bytes, {
    delimiter: ",",
    hasHeaderRow: true,
    trimFields: false,
  });
  const personParsed = parseDelimited(input.person.bytes, {
    delimiter: ",",
    hasHeaderRow: true,
    trimFields: false,
  });
  const defects = [...housingParsed.defects, ...personParsed.defects];
  if (defects.length > 0) {
    throw new Error(
      `The ACS PUMS donor shard produced ${defects.length} parse defects; first: ${defects[0]?.message}`,
    );
  }
  const housingHeader = housingParsed.header ?? [];
  const personHeader = personParsed.header ?? [];
  requiredColumns(
    housingHeader,
    DONOR_HOUSING_PROJECTION,
    "PUMS housing shard",
  );
  requiredColumns(personHeader, DONOR_PERSON_PROJECTION, "PUMS person shard");
  const hasHoursAllocationColumn = personHeader.includes("FWKHP");
  const hasHoursAllocationDictionary = dictionary.has("FWKHP");
  if (hasHoursAllocationColumn !== hasHoursAllocationDictionary) {
    throw new Error(
      "PUMS FWKHP must be present in both the person shard and dictionary, or absent from both.",
    );
  }
  const personProjection = hasHoursAllocationColumn
    ? [...DONOR_PERSON_PROJECTION, ...DONOR_PERSON_OPTIONAL_PROJECTION]
    : DONOR_PERSON_PROJECTION;

  const personsBySerial = new Map<string, PumsDonorPerson[]>();
  const personKeys = new Set<string>();
  for (const row of personParsed.rows) {
    const values = readPumsRow(
      dictionary,
      personHeader,
      row,
      personProjection,
      input.person.artifactId,
      asOf,
    );
    const serialNumber = knownString(
      values,
      "SERIALNO",
      `Person row ${row.line}`,
    );
    const personNumber = knownNumber(
      values,
      "SPORDER",
      `Person row ${row.line}`,
    );
    const key = `${serialNumber}/${personNumber}`;
    if (knownString(values, "RT", key) !== "P") {
      throw new Error(`Person ${key} does not carry person record type P.`);
    }
    if (personKeys.has(key))
      throw new Error(`Duplicate PUMS person key ${key}.`);
    personKeys.add(key);
    if (!serialNumber.startsWith(String(identity.surveyYear))) {
      throw new Error(
        `Person ${key} does not carry declared survey year ${identity.surveyYear}.`,
      );
    }
    if (knownString(values, "STATE", key) !== identity.stateFips) {
      throw new Error(
        `Person ${key} is outside declared state ${identity.stateFips}.`,
      );
    }

    const person: PumsDonorPerson = {
      serialNumber,
      personNumber,
      puma: knownString(values, "PUMA", key),
      personWeight: values.PWGTP as PumsValue,
      age: donorFact(dictionary, values, "AGEP", "FAGEP", exactNumber),
      relationship: donorFact(
        dictionary,
        values,
        "RELSHIPP",
        "FRELSHIPP",
        coded(RELATIONSHIPS),
      ),
      sourceSexEvidence: donorFact(
        dictionary,
        values,
        "SEX",
        "FSEXP",
        genericCode,
      ),
      schoolEnrollment: donorFact(
        dictionary,
        values,
        "SCH",
        "FSCHP",
        coded(SCHOOL_ENROLLMENT),
      ),
      gradeAttending: donorFact(
        dictionary,
        values,
        "SCHG",
        "FSCHGP",
        genericCode,
      ),
      educationalAttainment: donorFact(
        dictionary,
        values,
        "SCHL",
        "FSCHLP",
        genericCode,
      ),
      employmentStatus: donorFact(
        dictionary,
        values,
        "ESR",
        "FESRP",
        coded(EMPLOYMENT_STATUS),
      ),
      classOfWorker: donorFact(dictionary, values, "COW", "FCOWP", genericCode),
      occupation: donorFact(dictionary, values, "OCCP", "FOCCP", genericCode),
      usualHoursWorked: donorFact(
        dictionary,
        values,
        "WKHP",
        hasHoursAllocationColumn ? "FWKHP" : null,
        exactNumber,
      ),
      evidence: {
        artifactId: input.person.artifactId,
        locator: {
          kind: "delimited-row",
          artifactId: input.person.artifactId,
          line: row.line,
        },
      },
    };
    const bucket = personsBySerial.get(serialNumber);
    if (bucket) bucket.push(person);
    else personsBySerial.set(serialNumber, [person]);
  }

  const records: PumsHouseholdDonor[] = [];
  const serials = new Set<string>();
  for (const row of housingParsed.rows) {
    const values = readPumsRow(
      dictionary,
      housingHeader,
      row,
      DONOR_HOUSING_PROJECTION,
      input.housing.artifactId,
      asOf,
    );
    const serialNumber = knownString(
      values,
      "SERIALNO",
      `Housing row ${row.line}`,
    );
    if (serials.has(serialNumber)) {
      throw new Error(`Duplicate PUMS housing SERIALNO ${serialNumber}.`);
    }
    serials.add(serialNumber);
    if (!serialNumber.startsWith(String(identity.surveyYear))) {
      throw new Error(
        `Housing ${serialNumber} does not carry declared survey year ${identity.surveyYear}.`,
      );
    }
    if (knownString(values, "STATE", serialNumber) !== identity.stateFips) {
      throw new Error(
        `Housing ${serialNumber} is outside declared state ${identity.stateFips}.`,
      );
    }
    const puma = knownString(values, "PUMA", serialNumber);
    if (knownString(values, "RT", serialNumber) !== "H") {
      throw new Error(
        `Housing ${serialNumber} does not carry housing record type H.`,
      );
    }
    const persons = (personsBySerial.get(serialNumber) ?? []).sort(
      (left, right) => left.personNumber - right.personNumber,
    );
    for (const person of persons) {
      if (person.puma !== puma) {
        throw new Error(
          `Person ${serialNumber}/${person.personNumber} PUMA ${person.puma} disagrees with housing PUMA ${puma}.`,
        );
      }
    }

    const unitType = donorFact(
      dictionary,
      values,
      "TYPEHUGQ",
      null,
      coded(UNIT_TYPES),
    );
    const householdSize = donorFact(
      dictionary,
      values,
      "NP",
      null,
      exactNumber,
    );
    if (
      unitType.state === "KNOWN" &&
      unitType.value.canonical === "housing-unit" &&
      householdSize.state === "KNOWN" &&
      householdSize.value !== persons.length
    ) {
      throw new Error(
        `Housing ${serialNumber} declares NP ${householdSize.value} but joins to ${persons.length} person rows.`,
      );
    }

    records.push({
      shard: identity,
      serialNumber,
      puma,
      householdWeight: values.WGTP as PumsValue,
      unitType,
      householdSize,
      buildingType: donorFact(
        dictionary,
        values,
        "BLD",
        "FBLDP",
        coded(BUILDING_TYPES),
      ),
      tenure: donorFact(dictionary, values, "TEN", "FTENP", coded(TENURE)),
      persons,
      evidence: {
        artifactId: input.housing.artifactId,
        locator: {
          kind: "delimited-row",
          artifactId: input.housing.artifactId,
          line: row.line,
        },
      },
    });
    personsBySerial.delete(serialNumber);
  }
  if (personsBySerial.size > 0) {
    throw new Error(
      `PUMS person rows have no housing record for SERIALNO: ${[...personsBySerial.keys()].sort().join(", ")}.`,
    );
  }
  records.sort((left, right) =>
    left.serialNumber.localeCompare(right.serialNumber),
  );

  return {
    corpus: {
      corpusId: `acs-pums-household-donors-${identity.surveyYear}-${identity.stateUsps.toLowerCase()}`,
      compiler: {
        name: "acs-pums-household-donors",
        version: PUMS_DONOR_COMPILER_VERSION,
      },
      parser: { name: "pums-csv", version: PUMS_DONOR_PARSER_VERSION },
      inputs: [input.housing, input.person, input.dictionary].map(
        (artifact) => ({
          artifactId: artifact.artifactId,
          sha256: artifact.sha256,
        }),
      ),
      asOf,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass: input.inputClass,
      coverage: {
        isCompleteUniverse: false,
        universeDescription: `Linked housing-unit and person donor records from the ${identity.surveyYear} ACS 1-year PUMS ${identity.stateUsps} state shard. PUMS is a weighted sample at state/PUMA geography; it is not an enumeration and does not identify an exact city, address, school, employer, or real person.`,
        boundedSampleReason: input.boundedSampleReason,
      },
    },
    records,
  };
}

/** Compile locked publisher rows or archives into a source-only donor interface. */
export function compileAcsPumsDonorShard(
  input: ProductionInput<PumsDonorArtifacts>,
  identity: AcsPumsStateShardIdentity,
): AcsPumsDonorCorpus<"production"> {
  const { housing, person, dictionary } = input.artifacts;
  return compileDonorBytes({
    inputClass: inputClassOf(input),
    identity,
    housing: {
      artifactId: housing.artifact.artifactId,
      sha256: housing.artifact.bytes.sha256,
      bytes: tableBytes(housing),
    },
    person: {
      artifactId: person.artifact.artifactId,
      sha256: person.artifact.bytes.sha256,
      bytes: tableBytes(person),
    },
    dictionary: {
      artifactId: dictionary.artifact.artifactId,
      sha256: dictionary.artifact.bytes.sha256,
      bytes: tableBytes(dictionary),
    },
    boundedSampleReason:
      "The corpus is one declared state shard of a disclosure-protected survey sample. It preserves every linked person in each included housing record and both published weights; it does not claim a national or exact-city population.",
  }) as AcsPumsDonorCorpus<"production">;
}

export function openAcsPumsDonorFixture(
  fixturePath: string,
): FixtureInput<PumsDonorFixtureArtifacts> {
  return openFixture<PumsDonorFixtureArtifacts>("acs-pums", fixturePath);
}

/** Compile an explicitly marked deterministic fixture; never a production claim. */
export function compileAcsPumsDonorFixture(
  input: FixtureInput<PumsDonorFixtureArtifacts>,
): AcsPumsDonorCorpus<"fixture"> {
  const { identity, housingCsv, personCsv, dictionaryCsv } = input.artifacts;
  const housingBytes = Buffer.from(housingCsv, "utf-8");
  const personBytes = Buffer.from(personCsv, "utf-8");
  const dictionaryBytes = Buffer.from(dictionaryCsv, "utf-8");
  return compileDonorBytes({
    inputClass: "fixture",
    identity,
    housing: {
      artifactId: `${input.fixtureId}:housing`,
      sha256: sha256Hex(housingBytes),
      bytes: housingBytes,
    },
    person: {
      artifactId: `${input.fixtureId}:person`,
      sha256: sha256Hex(personBytes),
      bytes: personBytes,
    },
    dictionary: {
      artifactId: `${input.fixtureId}:dictionary`,
      sha256: sha256Hex(dictionaryBytes),
      bytes: dictionaryBytes,
    },
    boundedSampleReason:
      "Deterministic synthetic fixture rows prove linkage, translation, weighting, and adapter behavior. They are not empirical ACS observations and cannot be written as a production corpus.",
  }) as AcsPumsDonorCorpus<"fixture">;
}
