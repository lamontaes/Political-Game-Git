/** Opening-only historical county identity and represented procurement coverage. */
import { makeIsoDate } from "../simulation/dates";
import {
  governmentUnit,
  governmentUnitJurisdictionId,
  countyGeoidsForPlace,
  PLACE_COUNTY_RELATIONS_META,
} from "../simulation/government-units";
import { createStableId } from "../simulation/ids";
import { lifePlaceByJurisdictionId } from "../simulation/life-places";
import type { EntityId } from "../simulation/types";
import ownerDataJson from "./data/opening-public-owners-2017.json" with { type: "json" };
import { parameter } from "./parameters";
import { stopgap } from "./stopgaps";
import type { CoreInput, OrganizationInput, Source } from "./types";

export const OPENING_COUNTY_BUYER_CLASSIFICATION = "service:county-government";
export const OPENING_PUBLIC_OWNER_HISTORY_STOPGAP = stopgap(
  "SG-P8-opening-public-owner-history",
).id;
export const OPENING_PUBLIC_OWNER_COVERAGE_STOPGAP = stopgap(
  "SG-P8-opening-public-owner-coverage",
).id;
const prefix = "local-government:";
const factPrefix = "openingPublicOwner.";
const zero = parameter("zero");
const one = parameter("one");

export interface HistoricalCountyObservation {
  censusGovernmentId: string;
  name: string;
  stateUsps: string;
  countyGeoid: string;
  sourceRow: number;
}
export interface HistoricalCountyOwnerData {
  observedAt: string;
  source: Source;
  provenance: {
    archiveUrl: string;
    archiveSha256: string;
    workbookMember: string;
    workbookSha256: string;
    sheet: string;
    crosswalkUrl: string;
    crosswalkSha256: string;
    crosswalkMemberSha256: string;
  };
  purchaseCoverageGeography: {
    corpusId: string;
    corpusSha256: string;
    observedAt: string;
    releaseDate: string;
    documentationUrl: string;
    artifactLockSha256: string;
  };
  recordsByPublisherPid6: Readonly<Record<string, HistoricalCountyObservation>>;
}
export const DEFAULT_OPENING_PUBLIC_OWNER_DATA =
  ownerDataJson as HistoricalCountyOwnerData;

export interface OpeningCountyOwnerProjectionInput {
  organizationId: string;
  organizationStableKey: string;
  worldId: string;
  name: string;
  classification?: string;
  placeId: string;
  startedAt: string;
}
export interface OpeningCountyOwnerProjection {
  governmentFacts?: Readonly<Record<string, string>>;
  identitySource?: Source;
  gaps: readonly string[];
}

function validDate(value: string): boolean {
  try {
    return makeIsoDate(value) === value;
  } catch {
    return false;
  }
}
function normalizedName(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/g, " ").toUpperCase();
}
function nonblank(value: unknown): value is string {
  return typeof value === "string" && !!value.trim();
}
function validProvenance(data: HistoricalCountyOwnerData): boolean {
  return (
    data.source.tag === "SOURCED" &&
    nonblank(data.source.citation) &&
    data.source.asOf === data.observedAt &&
    validDate(data.observedAt) &&
    nonblank(data.provenance.archiveUrl) &&
    nonblank(data.provenance.crosswalkUrl) &&
    nonblank(data.provenance.workbookMember) &&
    nonblank(data.provenance.sheet) &&
    [
      data.provenance.archiveSha256,
      data.provenance.workbookSha256,
      data.provenance.crosswalkSha256,
      data.provenance.crosswalkMemberSha256,
    ].every((hash) => /^[a-f0-9]{64}$/.test(hash))
  );
}

/**
 * The history record's actual stable key and ID select an already existing
 * county account. A workplace name/classification cannot establish ownership.
 * The observed source remains dated 2017; forward application is estimated.
 */
export function openingHistoricalCountyOwnerFacts(
  input: OpeningCountyOwnerProjectionInput,
  data: HistoricalCountyOwnerData = DEFAULT_OPENING_PUBLIC_OWNER_DATA,
): OpeningCountyOwnerProjection {
  if (input.classification !== OPENING_COUNTY_BUYER_CLASSIFICATION)
    return { gaps: [] };
  const unsupported = (reason: string): OpeningCountyOwnerProjection => ({
    gaps: [`opening-public-owner:${reason}:${input.organizationId}`],
  });
  if (!validProvenance(data) || !validDate(input.startedAt))
    return unsupported("historical-identity-source-invalid");
  if (data.observedAt > input.startedAt)
    return unsupported("historical-identity-source-after-opening");
  if (!input.organizationStableKey.startsWith(prefix) || !input.worldId.trim())
    return unsupported("county-account-needs-recorded-government-key");
  const governmentKey = input.organizationStableKey.slice(prefix.length);
  const unit = governmentUnit(governmentKey);
  if (
    !unit ||
    unit.unitType !== "county" ||
    !unit.countyGeoid ||
    !unit.functionalActive ||
    governmentUnitJurisdictionId(unit) !== input.placeId
  )
    return unsupported("county-account-canonical-identity-mismatch");
  if (
    createStableId(
      "organization",
      `${input.worldId}:${input.organizationStableKey}`,
    ) !== input.organizationId
  )
    return unsupported("county-account-id-does-not-match-record");
  const record = data.recordsByPublisherPid6[unit.publisherId];
  if (!record) return unsupported("historical-county-identity-source-missing");
  if (
    !/^\d{2}1\d{11}$/.test(record.censusGovernmentId) ||
    !Number.isSafeInteger(record.sourceRow) ||
    record.sourceRow <= zero ||
    record.countyGeoid !== unit.countyGeoid ||
    record.stateUsps !== unit.stateUsps ||
    normalizedName(record.name) !== normalizedName(unit.name) ||
    normalizedName(input.name) !== normalizedName(record.name)
  )
    return unsupported("historical-county-identity-record-mismatch");
  const recordId = `census-gus2017:county:${record.censusGovernmentId}`;
  const identitySource: Source = {
    ...data.source,
    citation: `${data.source.citation} ${data.provenance.workbookMember}, ${data.provenance.sheet} row ${record.sourceRow}; GID ${record.censusGovernmentId}, PID ${unit.publisherId}. Official PID/GID alias: ${data.provenance.crosswalkUrl}; archive SHA-256 ${data.provenance.archiveSha256}; workbook SHA-256 ${data.provenance.workbookSha256}; crosswalk SHA-256 ${data.provenance.crosswalkSha256}.`,
  };
  const projectionSource: Source = {
    tag: "ESTIMATED",
    asOf: input.startedAt,
    citation: `${identitySource.citation} ${OPENING_PUBLIC_OWNER_HISTORY_STOPGAP}`,
    estimatedFrom:
      "Observed active county identity is carried forward to this opening using the official stable PID/GID alias and existing canonical county account. Intermediate identity changes, actual opening legal powers, appropriation and cash are not observed by this listing. The later canonical directory is an identifier/geography guard, not a backdated observation.",
  };
  return {
    governmentFacts: {
      governmentKind: "local-government",
      governmentKey,
      governmentJurisdictionId: input.placeId,
      [`${factPrefix}recordId`]: recordId,
      [`${factPrefix}censusGovernmentId`]: record.censusGovernmentId,
      [`${factPrefix}publisherPid6`]: unit.publisherId,
      [`${factPrefix}organizationStableKey`]: input.organizationStableKey,
      [`${factPrefix}worldId`]: input.worldId,
      [`${factPrefix}countyGeoid`]: record.countyGeoid,
      [`${factPrefix}recordedName`]: record.name,
      [`${factPrefix}observedAt`]: data.observedAt,
      [`${factPrefix}identitySource`]: JSON.stringify(identitySource),
      [`${factPrefix}projectionSource`]: JSON.stringify(projectionSource),
      [`${factPrefix}stopgapId`]: OPENING_PUBLIC_OWNER_HISTORY_STOPGAP,
    },
    identitySource,
    gaps: [
      `opening-public-owner:historical-identity-forward-application-estimated:${governmentKey}`,
    ],
  };
}

export interface OpeningCountyPlaceCoverage {
  placeId: string;
  basisRecordIds: readonly string[];
  identitySource: Source;
  coverageSource: Source;
}
export interface OpeningCountyPurchaseCoverage extends OpeningCountyPlaceCoverage {
  representedResidentCount: number;
}
export interface OpeningCountyPurchaseCoverageResult {
  rows: readonly OpeningCountyPurchaseCoverage[];
  gaps: readonly string[];
}
export interface OpeningCountyPlaceCoverageResult {
  coverage?: OpeningCountyPlaceCoverage;
  gaps: readonly string[];
}

/** Opening population counts use the original recorded person rows only. */
export interface OpeningPublicOwnerCoverageInput {
  startedAt: CoreInput["startedAt"];
  people: readonly Pick<
    CoreInput["people"][number],
    "id" | "placeId" | "countyId"
  >[];
}

function recordedCountyOwner(
  organization: OrganizationInput,
  startedAt: CoreInput["startedAt"],
  data: HistoricalCountyOwnerData,
): OpeningCountyOwnerProjection {
  const facts = organization.governmentFacts ?? {};
  const expected = openingHistoricalCountyOwnerFacts(
    {
      organizationId: organization.id,
      organizationStableKey: facts[`${factPrefix}organizationStableKey`] ?? "",
      worldId: facts[`${factPrefix}worldId`] ?? "",
      name: organization.name,
      classification: organization.classification,
      placeId: organization.placeId,
      startedAt,
    },
    data,
  );
  if (
    !expected.governmentFacts ||
    !expected.identitySource ||
    Object.entries(expected.governmentFacts).some(
      ([key, value]) => facts[key] !== value,
    )
  )
    return {
      gaps: [
        ...expected.gaps,
        `opening-public-owner:county-purchase-identity-unverified:${organization.id}`,
      ],
    };
  return expected;
}

function recordedCountyPlaceCoverage(
  organization: OrganizationInput,
  input: { startedAt: CoreInput["startedAt"]; placeId: string },
  data: HistoricalCountyOwnerData,
  expected: OpeningCountyOwnerProjection,
): OpeningCountyPlaceCoverageResult {
  if (!expected.governmentFacts || !expected.identitySource)
    return { gaps: expected.gaps };
  const facts = expected.governmentFacts,
    countyGeoid = facts[`${factPrefix}countyGeoid`]!,
    relationDate = PLACE_COUNTY_RELATIONS_META.geographyAsOf,
    geography = data.purchaseCoverageGeography;
  const validGeography =
    geography.corpusId === PLACE_COUNTY_RELATIONS_META.corpusId &&
    geography.corpusSha256 === PLACE_COUNTY_RELATIONS_META.corpusSha256 &&
    geography.observedAt === relationDate &&
    validDate(geography.releaseDate) &&
    nonblank(geography.documentationUrl) &&
    /^[a-f0-9]{64}$/.test(geography.artifactLockSha256);
  let basisRecordIds: readonly string[];
  if (input.placeId === organization.placeId) {
    basisRecordIds = [facts[`${factPrefix}recordId`]!];
  } else {
    const place = lifePlaceByJurisdictionId(input.placeId as EntityId);
    if (
      !place?.sourceGeoid ||
      !validGeography ||
      relationDate > input.startedAt ||
      !countyGeoidsForPlace(place.sourceGeoid).includes(countyGeoid)
    )
      return {
        gaps: [
          ...expected.gaps,
          `opening-public-owner:county-to-place-membership-unverified:${organization.id}:${input.placeId}`,
        ],
      };
    basisRecordIds = [
      facts[`${factPrefix}recordId`]!,
      `census-2020-place-county:${place.sourceGeoid}:${countyGeoid}`,
    ];
  }
  return {
    coverage: {
      placeId: input.placeId,
      basisRecordIds,
      identitySource: expected.identitySource,
      coverageSource: {
        tag: "ESTIMATED",
        asOf: input.startedAt,
        generationPriorVintage: `2017 Census county identity; Census county-part geography ${relationDate}, published ${geography.releaseDate}`,
        citation: `${expected.identitySource.citation} ${PLACE_COUNTY_RELATIONS_META.source}; geography as of ${relationDate}, publication ${geography.releaseDate}; ${geography.documentationUrl}; corpus SHA-256 ${PLACE_COUNTY_RELATIONS_META.corpusSha256}; source artifact-lock SHA-256 ${geography.artifactLockSha256}. ${OPENING_PUBLIC_OWNER_COVERAGE_STOPGAP}`,
        estimatedFrom: `Existing generated person countyIds and a recorded county-to-place relation bound the represented share of one place's opening public purchase pool. ${geography.releaseDate > input.startedAt ? "The later-published geography is a retrospective generation prior, not a date-available actor fact. " : ""}County residency/geography does not establish legal appropriation, supplier service area, actual demand, travel, delivery or a new stock. A county account keeps its canonical county place.`,
      },
    },
    gaps: expected.gaps,
  };
}

/**
 * Validate the recorded historical owner and served-place relation without
 * reading people. The dated witness proves geography, not a population count
 * or a new budget; a standing agreement retains its own original count.
 */
export function openingHistoricalCountyPlaceCoverage(
  organization: OrganizationInput,
  input: { startedAt: CoreInput["startedAt"]; placeId: string },
  data: HistoricalCountyOwnerData = DEFAULT_OPENING_PUBLIC_OWNER_DATA,
): OpeningCountyPlaceCoverageResult {
  return recordedCountyPlaceCoverage(
    organization,
    input,
    data,
    recordedCountyOwner(organization, input.startedAt, data),
  );
}

/** Bind original opening person countyIds to the independently owning place witness. */
export function openingHistoricalCountyPurchaseCoverage(
  organization: OrganizationInput,
  input: OpeningPublicOwnerCoverageInput,
  data: HistoricalCountyOwnerData = DEFAULT_OPENING_PUBLIC_OWNER_DATA,
): OpeningCountyPurchaseCoverageResult {
  const expected = recordedCountyOwner(organization, input.startedAt, data);
  if (!expected.governmentFacts || !expected.identitySource)
    return { rows: [], gaps: expected.gaps };
  const counts = new Map<string, number>();
  for (const person of input.people) {
    if (person.countyId !== organization.placeId) continue;
    counts.set(person.placeId, (counts.get(person.placeId) ?? zero) + one);
  }
  const gaps = new Set<string>(expected.gaps),
    rows: OpeningCountyPurchaseCoverage[] = [];
  for (const [placeId, representedResidentCount] of [...counts.entries()].sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    const witness = recordedCountyPlaceCoverage(
      organization,
      { startedAt: input.startedAt, placeId },
      data,
      expected,
    );
    for (const gap of witness.gaps) gaps.add(gap);
    if (witness.coverage)
      rows.push({ ...witness.coverage, representedResidentCount });
  }
  if (!rows.length)
    gaps.add(
      `opening-public-owner:no-recorded-county-residents-for-purchase:${organization.id}`,
    );
  return { rows, gaps: [...gaps].sort() };
}
