import { fileURLToPath } from "node:url";
import {
  MEETING_PRACTICE_FIXTURE,
  MEETING_PRACTICE_AS_OF,
  renderMunicipalMeetingPractice,
} from "./municipal-meeting-practice";
/**
 * `npm run export:municipal-governments` — the one-way source-to-game seam.
 *
 * `src/simulation` may not import `src/source`: the source substrate is Node
 * code that reads locks and hashes bytes, and the game runs in a browser. So
 * the municipal corpus crosses the boundary the way the national place corpus
 * does — as a generated, browser-safe module carrying a projection of the
 * compiled records and nothing else.
 *
 * Two things happen here that cannot happen on the far side.
 *
 * **Evidence class travels with the reading.** A government that appears in
 * both corpora — Carson City does — is exported twice, once as the enacted text
 * this repository read and once as the research pass's transcription, each
 * labelled. They are never merged. A merge would let a venue somebody reported
 * sit inside a record that claims to be the charter, and the whole point of the
 * production boundary is that those two things stay apart.
 *
 * **Name matches are candidates only.** A record declares the Census
 * place's name; this script looks it up in the accepted place corpus and
 * records a unique match only as a candidate. Runtime residency links require
 * the separately reviewed charter/Gazetteer identity declarations and exact
 * evidence checks below. An unverified name match never reaches residency.
 */

import { openGovernmentUnitsProduction } from "../../src/source/domains/government-units/index";
import { readPublishedGeneralPurposeUnits } from "../../src/source/domains/government-units/published-2025";
import { parseFinanceCrosswalk } from "../../src/source/domains/government-finances/production";
import { openProductionArtifacts } from "../../src/source/core/index";
import { MUNICIPAL_IDENTITY_LINKS } from "../../src/source/domains/municipal-governance/identity-links";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  compileMunicipalFixture,
  compileMunicipalProduction,
  openMunicipalFixture,
  openMunicipalProduction,
  MUNICIPAL_KENTUCKY_FIXTURE_PATH,
  MUNICIPAL_NATIONAL_FIXTURE_PATH,
  NATIONAL_MUNICIPAL_RESEARCH,
  PRODUCTION_PLACE_CROSSWALK,
} from "../../src/source/domains/municipal-governance/index";
import type {
  MunicipalGovernanceRecord,
  Sourced,
} from "../../src/source/domains/municipal-governance/index";
import { readFileSync } from "node:fs";

import { assertValidArtifactLock } from "../../src/source/core/index";
import type { ArtifactLock } from "../../src/source/core/index";
import { REPO_ROOT } from "./registry";
import {
  NATIONAL_PLACES_META,
  NATIONAL_PLACES_ROWS,
} from "../../src/simulation/national-places.generated";

const OUTPUT = "src/simulation/municipal-governments.generated.ts";

/** Read and structurally validate the municipal artifact lock. */
function municipalLock(): ArtifactLock {
  const path = resolve(
    REPO_ROOT,
    "data/source/municipal-governance/artifact-lock.json",
  );
  const lock = JSON.parse(readFileSync(path, "utf-8")) as ArtifactLock;
  assertValidArtifactLock(lock);
  return lock;
}

type PlaceRow = readonly [string, string, string];

function placeIndex(): readonly PlaceRow[] {
  return JSON.parse(NATIONAL_PLACES_ROWS) as PlaceRow[];
}

/** Present truth, or null. Never a default. */
function value<T>(sourced: Sourced<T>): T | null {
  return sourced.state === "KNOWN" ? sourced.value : null;
}

/** Why a fact is missing, in the words the record carries. */
function absence(sourced: Sourced<unknown>): string | null {
  switch (sourced.state) {
    case "KNOWN":
      return null;
    case "UNKNOWN":
      return sourced.reason;
    case "NOT_APPLICABLE":
      return sourced.reason;
    case "NO_REQUIREMENT_FOUND":
      return sourced.scopeSearched;
    case "HISTORICAL":
      return `A closed past fact, true from ${sourced.period.start} to ${sourced.period.end}.`;
    case "NOT_YET_OPERATIVE":
      return `Not operative until ${sourced.operativeFrom}.`;
    case "CONFLICTING":
      return "Authorities disagree.";
    case "SUPPRESSED":
      return `Withheld by the provider (${sourced.providerFlag}).`;
  }
}

function stateOf(sourced: Sourced<unknown>): string {
  return sourced.state;
}

interface ExportedPower {
  readonly power: string;
  readonly heldByRole: string;
  readonly held: boolean | null;
  readonly heldState: string;
  readonly target: string | null;
  readonly conditions: readonly string[];
  readonly exceptions: readonly string[];
  readonly threshold: unknown;
}

function exportPowers(
  record: MunicipalGovernanceRecord,
): readonly ExportedPower[] {
  return record.enumeratedPowers.map((entry) => {
    const details = value(entry.details);
    return {
      power: entry.power,
      heldByRole: entry.heldByRole,
      held: value(entry.capability),
      heldState: stateOf(entry.capability),
      target: details?.target ?? null,
      conditions: details?.conditions ?? [],
      exceptions: details?.exceptions ?? [],
      threshold: details?.threshold ?? null,
    };
  });
}

function resolvePlace(
  places: readonly PlaceRow[],
  state: string,
  placeName: string | null,
): { geoid: string; name: string } | null {
  if (!placeName) return null;
  const matches = places.filter(
    (row) =>
      row[2] === state && row[1].toLowerCase() === placeName.toLowerCase(),
  );
  if (matches.length !== 1) {
    throw new Error(
      `Place "${placeName}" in ${state} matches ${matches.length} rows of the accepted place corpus; a municipal crosswalk must resolve to exactly one.`,
    );
  }
  return { geoid: matches[0]![0], name: matches[0]![1] };
}

/** Preserve every compiled leaf and its own evidence; convenience fields above are not a provenance substitute. */
function sourcedFacts(node: unknown, path = ""): Record<string, unknown>[] {
  if (node === null || typeof node !== "object") return [];
  if ("state" in node && typeof node.state === "string")
    return [{ path, ...node }];
  return Object.entries(node).flatMap(([key, child]) =>
    sourcedFacts(child, path ? `${path}.${key}` : key),
  );
}

let identityInputs: ReturnType<typeof loadIdentityInputs> | undefined;
function loadIdentityInputs() {
  const governmentLock = JSON.parse(
    readFileSync(
      resolve(REPO_ROOT, "data/source/government-units/artifact-lock.json"),
      "utf8",
    ),
  ) as ArtifactLock;
  const financeLock = JSON.parse(
    readFileSync(
      resolve(REPO_ROOT, "data/source/government-finances/artifact-lock.json"),
      "utf8",
    ),
  ) as ArtifactLock;
  const units = readPublishedGeneralPurposeUnits(
    openGovernmentUnitsProduction(governmentLock),
  );
  const crosswalk = openProductionArtifacts(
    "government-finances",
    financeLock,
    { crosswalk: "census-pid-gid-crosswalk" },
  ).artifacts.crosswalk;
  return {
    units,
    gids: parseFinanceCrosswalk(crosswalk.bytes),
    crosswalkEvidence: {
      artifactId: crosswalk.artifact.artifactId,
      sha256: crosswalk.artifact.bytes.sha256,
      retrievedAt: crosswalk.artifact.retrieval.retrievedAt,
    },
  };
}

function websiteHost(url: string): string | null {
  try {
    return new URL(/^https?:/.test(url) ? url : `https://${url}`).hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return null;
  }
}
/** Exact publisher website references, never names, identify these source entries. */
function publishedWebsiteIdentity(
  state: string,
  readings: readonly Record<string, unknown>[],
) {
  const inputs = (identityInputs ??= loadIdentityInputs());
  const hosts = new Set<string>();
  for (const reading of readings) {
    for (const source of reading.sources as { url: string }[]) {
      const host = websiteHost(source.url);
      if (host) hosts.add(host);
    }
    for (const fact of reading.facts as { path: string; value?: unknown }[]) {
      if (
        !fact.path.startsWith("researchObservations.") ||
        typeof fact.value !== "string"
      )
        continue;
      for (const url of fact.value.match(/https?:\/\/[^\s<>`]+/g) ?? []) {
        const host = websiteHost(url);
        if (host) hosts.add(host);
      }
    }
  }
  for (const host of [
    "docs.google.com",
    "census.gov",
    "www2.census.gov",
    "library.municode.com",
    "codelibrary.amlegal.com",
  ])
    hosts.delete(host);
  const matches = inputs.units.filter(
    (unit) =>
      unit.state === state &&
      /^[123] - /.test(unit.unitType) &&
      unit.webAddress !== null &&
      hosts.has(websiteHost(unit.webAddress)!),
  );
  if (matches.length !== 1) return null;
  const unit = matches[0]!;
  const places = JSON.parse(
    readFileSync(resolve(REPO_ROOT, "data/source/places/corpus.json"), "utf8"),
  ) as {
    geoid: string;
    sourceName: string;
    stateUsps: string;
    ansiCode: string;
    functionalStatusCode: string;
    evidence: unknown;
  }[];
  const counties = JSON.parse(
    readFileSync(
      resolve(REPO_ROOT, "data/source/counties/corpus.json"),
      "utf8",
    ),
  ) as { geoid: string; ansiCode: string; evidence: unknown }[];
  // Township and county codes must never be reinterpreted as incorporated-place IDs.
  const place =
    unit.unitType === "2 - MUNICIPAL" && unit.placeFips
      ? places.find(
          (row) =>
            row.geoid === `${unit.stateFips}${unit.placeFips}` &&
            row.stateUsps === state &&
            row.functionalStatusCode === "A",
        )
      : undefined;
  const county = unit.countyAreaFips
    ? counties.find(
        (row) => row.geoid === `${unit.stateFips}${unit.countyAreaFips}`,
      )
    : undefined;
  return {
    publisherId: unit.publisherId,
    publisherUnitName: unit.unitName,
    governmentUnit: unit,
    governmentUnitEvidence: unit.evidence,
    placeGeoid: place?.geoid ?? null,
    sourceName: place?.sourceName ?? null,
    placeEvidence: place?.evidence ?? null,
    countyAreaGeoid: county?.geoid ?? null,
    countyEquivalentGeoid:
      place && county?.ansiCode === place.ansiCode ? county.geoid : null,
    countyEvidence: county?.evidence ?? null,
    censusGovernmentUnitId: inputs.gids.get(unit.publisherId) ?? null,
    legacyCrosswalkEvidence: inputs.crosswalkEvidence,
    basis:
      "The research's official website reference matches exactly one same-state general-purpose unit's published GUS website host. GUS website addresses are primarily self-reported with limited publisher verification. Place and county-area codes are publisher fields, not name matches; county area is not a governing parent. A legacy GID, when present, comes only from the official PID/GID crosswalk.",
  };
}

/** Validate the reviewed identity pair against the exact accepted records and retrieved charter. */
function verifiedIdentity(
  governmentKey: string,
  state: string,
  readings: readonly Record<string, unknown>[],
) {
  const link = MUNICIPAL_IDENTITY_LINKS.find(
    (row) => row.governmentKey === governmentKey,
  );
  if (!link) return publishedWebsiteIdentity(state, readings);
  const inputs = (identityInputs ??= loadIdentityInputs());
  const unit = inputs.units.find((row) => row.publisherId === link.publisherId);
  if (
    !unit ||
    unit.unitName !== link.publisherUnitName ||
    unit.state !== link.state ||
    unit.unitType !== "2 - MUNICIPAL" ||
    `${unit.stateFips}${unit.placeFips}` !== link.placeGeoid ||
    `${unit.stateFips}${unit.countyAreaFips}` !== link.countyEquivalentGeoid
  )
    throw new Error(
      `Published government-unit link disagrees with its reviewed declaration: ${governmentKey}`,
    );
  const places = JSON.parse(
    readFileSync(resolve(REPO_ROOT, "data/source/places/corpus.json"), "utf8"),
  ) as {
    geoid: string;
    sourceName: string;
    stateUsps: string;
    ansiCode: string;
    functionalStatusCode: string;
    evidence: unknown;
  }[];
  const counties = JSON.parse(
    readFileSync(
      resolve(REPO_ROOT, "data/source/counties/corpus.json"),
      "utf8",
    ),
  ) as {
    geoid: string;
    stateUsps: string;
    ansiCode: string;
    evidence: unknown;
  }[];
  const place = places.find((row) => row.geoid === link.placeGeoid);
  const county = counties.find(
    (row) => row.geoid === link.countyEquivalentGeoid,
  );
  const charter =
    openMunicipalProduction(municipalLock()).artifacts[
      link.charterArtifactId
    ]!.bytes.toString("utf8");
  if (
    !place ||
    !county ||
    place.sourceName !== link.sourceName ||
    place.stateUsps !== link.state ||
    county.stateUsps !== link.state ||
    place.ansiCode !== link.ansiCode ||
    county.ansiCode !== link.ansiCode ||
    place.functionalStatusCode !== "A" ||
    !charter.includes(link.charterIdentity)
  )
    throw new Error(
      `Reviewed municipal identity no longer matches its evidence: ${governmentKey}`,
    );
  return {
    ...link,
    governmentUnit: unit,
    governmentUnitEvidence: unit.evidence,
    placeEvidence: place.evidence,
    countyEvidence: county.evidence,
    censusGovernmentUnitId: inputs.gids.get(unit.publisherId) ?? null,
    legacyCrosswalkEvidence: inputs.crosswalkEvidence,
    basis:
      "Reviewed charter corporate identity and explicit Census PID6 row; place and county-area codes come from the published GUS row. Exact shared ANSI independently identifies the county-equivalent representation. Legacy GID comes only from the official PID/GID crosswalk; no county-government parent or powers are inferred.",
  };
}

function exportReading(
  record: MunicipalGovernanceRecord,
  evidence: "enacted-text" | "research-transcription" | "reference-observation",
  corpusAsOf: string,
): Record<string, unknown> {
  const procedure = record.legislativeProcedure;
  const budget = record.budgetProcedure;
  return {
    key: record.recordId,
    state: record.sourceIdentity.state,
    displayName: record.sourceIdentity.jurisdictionDisplayName,
    evidence,
    facts: sourcedFacts(record),
    asOf: corpusAsOf,
    form: value(record.legalBasis.form),
    basisType: value(record.legalBasis.basisType),
    controllingAuthority: value(record.legalBasis.controllingAuthority),
    formEffectiveDate: value(record.legalBasis.effectiveDate),
    bodyName: value(record.electedStructure.bodyName),
    bodySize: value(record.electedStructure.bodySize),
    composition: value(record.electedStructure.composition),
    presidingOffice: value(record.electedStructure.presidingOffice),
    executiveSelection: value(record.electedStructure.executiveSelection),
    presidingRules: record.electedStructure.presidingRules
      .map((rule) => value(rule))
      .filter((rule) => rule !== null),
    partisanship: record.electedStructure.partisanshipHistory
      .map((entry) => value(entry))
      .filter((entry) => entry !== null),
    terms: record.electedStructure.terms.map((term) => ({
      seatClass: term.seatClass,
      years: value(term.termYears),
    })),
    vacancyMechanism: value(record.electedStructure.vacancyMechanism),
    separation: value(
      record.administrativeStructure.executiveLegislativeSeparation,
    ),
    mayor: value(record.administrativeStructure.mayor),
    manager: value(record.administrativeStructure.professionalManager),
    departmentHeadAuthority: value(
      record.administrativeStructure.departmentHeadAuthority,
    ),
    consolidationType: value(record.consolidation.consolidationType),
    predecessorUnits: record.consolidation.predecessorUnits
      .filter((unit) => value(unit.attested) === true)
      .map((unit) => ({ name: unit.name, unitKind: unit.unitKind })),
    powers: exportPowers(record),
    procedure: {
      measureTypes: value(procedure.measureTypes),
      introductionSponsorship: value(procedure.introductionSponsorship),
      readings: value(procedure.readings),
      quorumText: value(procedure.quorum),
      quorumRule: value(procedure.quorumRule),
      passageText: value(procedure.passageThreshold),
      passageAbsence: absence(procedure.passageThreshold),
      amendment: value(procedure.amendment),
      publicHearing: value(procedure.publicHearing),
      mayoralAction: value(procedure.mayoralAction),
      mayoralActionState: stateOf(procedure.mayoralAction),
      mayoralActionWindow: value(procedure.mayoralActionWindow),
      override: value(procedure.override),
      overrideState: stateOf(procedure.override),
      overrideAbsence: absence(procedure.override),
      effectivePublication: value(procedure.effectivePublication),
      committeeReferral: value(procedure.committeeReferral),
    },
    budget: {
      fiscalYear: value(budget.fiscalYear),
      prepares: value(budget.prepares),
      proposes: value(budget.proposes),
      amends: value(budget.amends),
      adopts: value(budget.adopts),
      submissionDeadline: value(budget.submissionDeadline),
      adoptionDeadline: value(budget.adoptionDeadline),
      balancedBudgetConstraint: value(budget.balancedBudgetConstraint),
    },
    meetingSeries: record.meetingSeries.map((series) => ({
      seriesKey: series.seriesKey,
      kind: series.kind,
      bodyName: value(series.bodyName),
      cadence: value(series.cadence),
      venue: value(series.venue),
      publicAttendance: value(series.publicAttendance),
    })),
    meetingPlaces: record.meetingPlaces
      .map((place) => ({ kind: place.kind, location: value(place.location) }))
      .filter((place) => place.location !== null),
    sources: record.provenance.citedSources.map((source) => ({
      key: source.sourceKey,
      title: source.title,
      issuingAuthority: source.issuingAuthority,
      url: source.url,
      authorityType: source.authorityType,
      retrievedDate: source.retrievedDate,
      retrievable: source.retrievable,
    })),
    unresolved: record.provenance.unresolved,
  };
}

export function renderMunicipalGovernments(): string {
  const places = placeIndex();

  const production = compileMunicipalProduction(
    openMunicipalProduction(municipalLock()),
  );
  const kentucky = compileMunicipalFixture(
    openMunicipalFixture(MUNICIPAL_KENTUCKY_FIXTURE_PATH),
  );
  const national = compileMunicipalFixture(
    openMunicipalFixture(MUNICIPAL_NATIONAL_FIXTURE_PATH),
  );

  if (
    readFileSync(resolve(REPO_ROOT, MEETING_PRACTICE_FIXTURE), "utf8") !==
    renderMunicipalMeetingPractice()
  )
    throw new Error(
      "Meeting-practice fixture is stale; regenerate from its captured references.",
    );
  const practice = compileMunicipalFixture(
    openMunicipalFixture(MEETING_PRACTICE_FIXTURE),
    MEETING_PRACTICE_AS_OF,
  );

  const placeNameByKey = new Map<string, string>();
  for (const government of NATIONAL_MUNICIPAL_RESEARCH.governments) {
    if (government.placeCrosswalk) {
      placeNameByKey.set(government.key, government.placeCrosswalk.placeName);
    }
  }
  for (const [key, placeName] of Object.entries(PRODUCTION_PLACE_CROSSWALK)) {
    placeNameByKey.set(key, placeName);
  }

  const readings: Record<string, unknown>[] = [];
  for (const record of production.records) {
    readings.push(
      exportReading(record, "enacted-text", production.corpus.asOf),
    );
  }
  for (const compiled of [kentucky, national]) {
    for (const record of compiled.records) {
      readings.push(
        exportReading(record, "research-transcription", compiled.corpus.asOf),
      );
    }
  }

  for (const record of practice.records) {
    readings.push(
      exportReading(record, "reference-observation", practice.corpus.asOf),
    );
  }

  const governments = new Map<string, Record<string, unknown>>();
  for (const reading of readings) {
    const key = reading.key as string;
    const state = reading.state as string;
    const existing = governments.get(key);
    if (existing) {
      (existing.readings as Record<string, unknown>[]).push(reading);
      continue;
    }
    const place = resolvePlace(places, state, placeNameByKey.get(key) ?? null);
    const identity = verifiedIdentity(
      key,
      state,
      readings.filter((candidate) => candidate.key === key),
    );
    governments.set(key, {
      key,
      state,
      displayName: reading.displayName,
      placeGeoid: identity?.placeGeoid ?? null,
      placeName: identity?.sourceName ?? null,
      identity,
      candidatePlace: place
        ? {
            geoid: place.geoid,
            name: place.name,
            status: "UNVERIFIED_NAME_MATCH",
          }
        : null,
      readings: [reading],
    });
  }

  const ordered = [...governments.values()].sort((left, right) =>
    (left.key as string).localeCompare(right.key as string),
  );

  const payload = JSON.stringify(ordered);
  const module = `/**
 * GENERATED — do not edit by hand.
 *
 * Written by \`scripts/source/export-municipal-governments.ts\` from the
 * compiled municipal-governance corpora. It carries a projection of what those
 * records say and the evidence class of each reading; it imports nothing from
 * \`src/source\` and asserts no power a record did not carry. Regenerate with
 * \`npm run export:municipal-governments\`.
 */

/** Provenance for the readings below, surfaced honestly. */
export const MUNICIPAL_GOVERNMENTS_META = ${JSON.stringify(
    {
      productionRecords: production.records.length,
      productionCorpusSha256: production.corpus.canonicalSha256,
      productionAsOf: production.corpus.asOf,
      fixtureRecords: kentucky.records.length + national.records.length,
      referenceObservationRecords: practice.records.length,
      referenceObservationSha256: practice.corpus.canonicalSha256,
      kentuckyCorpusSha256: kentucky.corpus.canonicalSha256,
      nationalCorpusSha256: national.corpus.canonicalSha256,
      governmentCount: ordered.length,
      states: [...new Set(ordered.map((entry) => entry.state as string))]
        .sort()
        .join(" "),
      placeCorpus: NATIONAL_PLACES_META.source,
      coverage:
        "All compiled governments retain separate enacted, secondary-report and dated reference-observation readings; inventory counts do not establish complete legal authority.",
    },
    null,
    2,
  )} as const;

/** Every government, as one JSON string parsed once at first use. */
export const MUNICIPAL_GOVERNMENTS_JSON: string =
  ${JSON.stringify(payload)};
`;

  return module;
}

function main(): void {
  const module = renderMunicipalGovernments();
  if (process.argv.includes("--check")) {
    const checkIndex = process.argv.indexOf("--check-file");
    const target =
      checkIndex >= 0
        ? process.argv[checkIndex + 1]!
        : resolve(REPO_ROOT, OUTPUT);
    if (readFileSync(target, "utf8") !== module)
      throw new Error(
        "Municipal browser projection differs from its locked sources. Run export:municipal-governments.",
      );
    process.stdout.write(
      "Municipal browser projection regenerates byte-identically.\n",
    );
    return;
  }
  writeFileSync(resolve(REPO_ROOT, OUTPUT), module, "utf-8");
  process.stdout.write(`Wrote ${OUTPUT}.\n`);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();
