/** Court and seat queries and bounded writers; no work runs on the Day clock. */

import { currentFederalTenure } from "../federal-tenures";
import { recoverProsecutionsAfterBenchChange } from "../justice/prosecution";
import { chiefExecutiveJurisdiction } from "../nationwide-world/government-jurisdiction";
import { ensureStateJurisdictionForKey } from "../nationwide-world/state-executives";
import type { EntityId, IsoDate, World } from "../types";
import { assertWorldIntegrity } from "../world";
import { FEDERAL_COURTS_PROJECTION } from "./generated/federal-courts";
import { FEDERAL_SEAT_COUNT_ROWS } from "./generated/federal-seat-counts";
import { JUDICIAL_SELECTION_PROFILES } from "./generated/selection-profiles";
import type { JudicialSelectionProfile, ReportedField } from "./profiles";
import type {
  JudicialCourt,
  JudicialCourtRules,
  JudiciaryState,
  JudicialSharedSeatAllocation,
  JudicialSeat,
  JudicialSeatTenure,
  JudicialSelectionProvenance,
} from "./types";
import { judicialSeatId } from "./types";

export interface FederalCourtProjection {
  readonly courtId: string;
  readonly courtKind: "court-of-appeals" | "district-court";
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

export interface FederalSeatCountProjection {
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

export interface JudicialSeatCountBaseline {
  readonly count: number;
  readonly basis: "sourced" | "game-profile";
  readonly referenceId: string;
}

export interface FederalSeatCountJoin {
  readonly directCourtCounts: Readonly<
    Record<string, JudicialSeatCountBaseline>
  >;
  readonly fixedTermRules: Readonly<
    Record<
      string,
      {
        readonly termYears: number;
        readonly holdsUntilSuccessorQualified: boolean;
        readonly referenceId: string;
      }
    >
  >;
  readonly sharedAllocations: readonly {
    readonly allocationRecordId: string;
    readonly servedCourtIds: readonly string[];
    readonly seatCount: number;
    readonly referenceId: string;
  }[];
  readonly courtsWithoutStatutoryCount: readonly string[];
}

function federalDistrictForLabel(label: string): FederalCourtProjection {
  const [jurisdictionName, designation] = label.split(": ");
  const matches = FEDERAL_COURTS_PROJECTION.filter(
    (court) =>
      court.courtKind === "district-court" &&
      (court.courtName === label ||
        (court.jurisdictionName === jurisdictionName &&
          (designation === undefined ||
            court.courtName.includes(
              `${designation} District of ${jurisdictionName}`,
            )))),
  );
  if (matches.length !== 1)
    throw new Error(
      `Federal seat label has ${matches.length} district matches: ${label}`,
    );
  return matches[0]!;
}

/** Exact label join: three Title 28 joint rows remain one shared seat pool each. */
export function joinFederalSeatCounts(): FederalSeatCountJoin {
  const directCourtCounts: Record<string, JudicialSeatCountBaseline> = {};
  const fixedTermRules: Record<
    string,
    FederalSeatCountJoin["fixedTermRules"][string]
  > = {};
  const sharedAllocations: FederalSeatCountJoin["sharedAllocations"][number][] =
    [];
  for (const row of FEDERAL_SEAT_COUNT_ROWS) {
    const referenceId = `${row.artifactId}:row:${row.row}:${row.citation}`;
    if (row.allocation === "joint-districts") {
      if (row.kind !== "district" || row.districtLabels.length < 2)
        throw new Error(
          `Invalid joint federal seat row: ${row.publishedLabel}`,
        );
      const servedCourtIds = row.districtLabels.map(
        (label) => federalDistrictForLabel(label).courtId,
      );
      if (new Set(servedCourtIds).size !== servedCourtIds.length)
        throw new Error(`Duplicate joint district in ${row.publishedLabel}`);
      sharedAllocations.push({
        allocationRecordId: `${row.artifactId}:joint-row:${row.row}`,
        servedCourtIds,
        seatCount: row.authorizedSeats,
        referenceId,
      });
      continue;
    }
    const courtId =
      row.kind === "supreme"
        ? "us-supreme-court"
        : row.kind === "circuit"
          ? FEDERAL_COURTS_PROJECTION.find(
              (court) =>
                court.courtKind === "court-of-appeals" &&
                court.circuitDesignation === row.publishedLabel,
            )?.courtId
          : federalDistrictForLabel(row.districtLabels[0] ?? row.publishedLabel)
              .courtId;
    if (!courtId || directCourtCounts[courtId])
      throw new Error(
        `Ambiguous federal seat count row: ${row.publishedLabel}`,
      );
    directCourtCounts[courtId] = {
      count: row.authorizedSeats,
      basis: "sourced",
      referenceId,
    };
    if (row.termYears !== undefined) {
      if (
        !Number.isSafeInteger(row.termYears) ||
        row.termYears < 1 ||
        row.holdsUntilSuccessorQualified === undefined
      )
        throw new Error(`Invalid fixed term in ${row.publishedLabel}`);
      fixedTermRules[courtId] = {
        termYears: row.termYears,
        holdsUntilSuccessorQualified: row.holdsUntilSuccessorQualified,
        referenceId,
      };
    }
  }
  const courtsWithoutStatutoryCount = [
    "us-supreme-court",
    ...FEDERAL_COURTS_PROJECTION.map((court) => court.courtId),
  ].filter((courtId) => !directCourtCounts[courtId]);
  return {
    directCourtCounts,
    fixedTermRules,
    sharedAllocations,
    courtsWithoutStatutoryCount,
  };
}

// RECORDED GAME PROFILES: the admitted jurisdiction catalog supplies these six
// territory identities. Each profile stays distinct from sourced court rows.
const TERRITORY_LOCAL_COURTS = [
  [
    "US-DC",
    "dc-court-of-appeals",
    "District of Columbia Court of Appeals",
    "local-highest",
    null,
  ],
  [
    "US-DC",
    "dc-superior-court",
    "Superior Court of the District of Columbia",
    "local-general-trial",
    "dc-court-of-appeals",
  ],
  [
    "US-PR",
    "pr-supreme-court",
    "Supreme Court of Puerto Rico",
    "local-highest",
    null,
  ],
  [
    "US-PR",
    "pr-court-of-first-instance",
    "Puerto Rico Court of First Instance",
    "local-general-trial",
    "pr-supreme-court",
  ],
  ["US-GU", "gu-supreme-court", "Supreme Court of Guam", "local-highest", null],
  [
    "US-GU",
    "gu-superior-court",
    "Superior Court of Guam",
    "local-general-trial",
    "gu-supreme-court",
  ],
  [
    "US-MP",
    "mp-supreme-court",
    "Supreme Court of the Northern Mariana Islands",
    "local-highest",
    null,
  ],
  [
    "US-MP",
    "mp-superior-court",
    "Superior Court of the Northern Mariana Islands",
    "local-general-trial",
    "mp-supreme-court",
  ],
  [
    "US-VI",
    "vi-supreme-court",
    "Supreme Court of the Virgin Islands",
    "local-highest",
    null,
  ],
  [
    "US-VI",
    "vi-superior-court",
    "Superior Court of the Virgin Islands",
    "local-general-trial",
    "vi-supreme-court",
  ],
  [
    "US-AS",
    "as-high-court",
    "High Court of American Samoa",
    "local-highest",
    null,
  ],
  [
    "US-AS",
    "as-high-court-trial",
    "High Court of American Samoa, Trial Division",
    "local-general-trial",
    "as-high-court",
  ],
] as const;

const EXTRA_JURISDICTION_NAMES: Readonly<Record<string, string>> = {
  "District of Columbia": "US-DC",
  Guam: "US-GU",
  "Northern Mariana Islands": "US-MP",
  "Puerto Rico": "US-PR",
  "Virgin Islands": "US-VI",
};

function knownRule<T>(
  value: T,
  basis: "sourced" | "game-profile",
  referenceId: string,
) {
  return { state: "known" as const, value, basis, referenceId };
}

function reportedNumber(
  field: ReportedField<number> | undefined,
  recordId: string,
): JudicialCourtRules["termYears"] {
  return field?.state === "KNOWN" && Number.isFinite(field.value)
    ? knownRule(field.value!, "sourced", recordId)
    : {
        state: "unknown",
        reason:
          field?.reason ?? `92L does not establish this value for ${recordId}.`,
      };
}

function initialRules(
  courtId: string,
  level: JudicialCourt["level"],
  selection: JudicialSelectionProfile | null,
  countBaselines: Readonly<Record<string, JudicialSeatCountBaseline>>,
  fixedTermRules: FederalSeatCountJoin["fixedTermRules"] = {},
): JudicialCourtRules {
  const baseline = countBaselines[courtId];
  // ESTIMATED FROM COMPARABLE COURTS IN THE GAME: nine seats for the recorded
  // federal supreme court, five for territory highest courts, three for
  // appellate/intermediate courts, and one for trial courts. This applies only
  // when that court has no verified count and remains marked as a game profile.
  const gameSize =
    level === "federal-supreme"
      ? 9
      : level === "local-highest"
        ? 5
        : level === "federal-appellate" || level === "local-intermediate"
          ? 3
          : 1;
  const seatCount = baseline ?? {
    count: gameSize,
    basis: "game-profile" as const,
    referenceId: "judiciary-opening-size-game-profile/v1",
  };
  if (!Number.isSafeInteger(seatCount.count) || seatCount.count < 1)
    throw new Error(`Invalid opening judicial seat count for ${courtId}.`);
  const tenure = selection?.tenure.value;
  const retirement = selection?.mandatoryRetirement.value;
  const fixedTerm = fixedTermRules[courtId];
  return {
    authorizedSeats: knownRule(
      seatCount.count,
      seatCount.basis,
      seatCount.referenceId,
    ),
    termYears: fixedTerm
      ? knownRule(fixedTerm.termYears, "sourced", fixedTerm.referenceId)
      : tenure?.kind === "GOOD_BEHAVIOR"
        ? knownRule(null, "sourced", selection!.recordId)
        : reportedNumber(
            tenure?.termLengthYears,
            selection?.recordId ?? courtId,
          ),
    ...(fixedTerm
      ? {
          termHoldsUntilSuccessorQualified: knownRule(
            fixedTerm.holdsUntilSuccessorQualified,
            "sourced",
            fixedTerm.referenceId,
          ),
        }
      : {}),
    mandatoryRetirementAge:
      retirement?.established === false
        ? knownRule(null, "sourced", selection!.recordId)
        : reportedNumber(retirement?.age, selection?.recordId ?? courtId),
    caseJurisdiction: {
      state: "unknown",
      reason: "The admitted court identity does not establish case categories.",
    },
    selectionRecordId: selection?.recordId ?? null,
    // RECORDED GAME PROFILE: the federal supreme court's size changes through
    // statute; the reference ID records the assignment that admitted this rule.
    amendmentRoute:
      level === "federal-supreme"
        ? knownRule(
            "statute",
            "game-profile",
            "assignments-6-judiciary/part-a-4",
          )
        : {
            state: "unknown",
            reason:
              "The admitted court record does not identify the court-size amendment route.",
          },
  };
}

/**
 * Build court identities once at Begin. State trial rows stay office-family-only
 * until real circuit or district units are admitted; no county is invented.
 */
export function buildOpeningCourtCatalog(
  world: World,
  seatCounts: Readonly<Record<string, JudicialSeatCountBaseline>> = {},
): World {
  if (world.judiciary) return world;
  const federalSeats = joinFederalSeatCounts();
  const resolvedSeatCounts = {
    ...federalSeats.directCourtCounts,
    ...seatCounts,
  };
  const stateProfiles = JUDICIAL_SELECTION_PROFILES.filter(
    (profile) =>
      profile.jurisdictionId !== "us-fed" &&
      profile.officeExists.state === "KNOWN" &&
      profile.officeExists.value === true &&
      profile.courtName.state === "KNOWN" &&
      !!profile.courtName.value,
  );
  const byJurisdictionName = new Map(
    stateProfiles.map((profile) => [
      profile.jurisdictionName.replace(/^(State|Commonwealth) of /, ""),
      profile.jurisdictionId,
    ]),
  );
  let next = world;
  const jurisdictionKeys = new Set([
    ...stateProfiles.map(
      (profile) => `US-${profile.jurisdictionId.slice(3).toUpperCase()}`,
    ),
    ...TERRITORY_LOCAL_COURTS.map((court) => court[0]),
  ]);
  for (const key of jurisdictionKeys)
    next = ensureStateJurisdictionForKey(next, key);
  const courts: Record<string, JudicialCourt> = {};
  const add = (court: JudicialCourt) => {
    if (courts[court.courtId])
      throw new Error(`Duplicate judicial court: ${court.courtId}`);
    courts[court.courtId] = court;
  };
  const jurisdictionId = (key: string): EntityId => {
    const jurisdiction = chiefExecutiveJurisdiction(key.slice(3));
    if (!jurisdiction || !next.jurisdictions[jurisdiction.id])
      throw new Error(`Missing judicial jurisdiction identity: ${key}`);
    return jurisdiction.id;
  };
  add({
    courtId: "us-supreme-court",
    jurisdictionId: null,
    name: "Supreme Court of the United States",
    level: "federal-supreme",
    parentCourtId: null,
    sourceRecordId: null,
    identityBasis: "game-profile",
    geographyDetail: "exact-court",
    createdAt: world.currentDate,
    rules: initialRules(
      "us-supreme-court",
      "federal-supreme",
      JUDICIAL_SELECTION_PROFILES.find(
        (profile) => profile.recordId === "us-fed:highest_court",
      ) ?? null,
      resolvedSeatCounts,
      federalSeats.fixedTermRules,
    ),
  });
  for (const source of FEDERAL_COURTS_PROJECTION) {
    const level =
      source.courtKind === "court-of-appeals"
        ? "federal-appellate"
        : "federal-district";
    const sourceKey = source.jurisdictionName
      ? (byJurisdictionName.get(source.jurisdictionName) ?? null)
      : null;
    const key = source.jurisdictionName
      ? sourceKey
        ? `US-${sourceKey.slice(3).toUpperCase()}`
        : (EXTRA_JURISDICTION_NAMES[source.jurisdictionName] ?? null)
      : null;
    add({
      courtId: source.courtId,
      jurisdictionId: key ? jurisdictionId(key) : null,
      name: source.courtName,
      level,
      parentCourtId:
        level === "federal-appellate" ? "us-supreme-court" : source.circuitId,
      sourceRecordId: source.courtId,
      identityBasis: "sourced",
      geographyDetail: "exact-court",
      createdAt: world.currentDate,
      rules: initialRules(
        source.courtId,
        level,
        JUDICIAL_SELECTION_PROFILES.find(
          (profile) =>
            profile.recordId ===
            (level === "federal-appellate"
              ? "us-fed:intermediate_appellate"
              : "us-fed:general_trial"),
        ) ?? null,
        resolvedSeatCounts,
        federalSeats.fixedTermRules,
      ),
    });
  }
  for (const profile of stateProfiles) {
    const key = `US-${profile.jurisdictionId.slice(3).toUpperCase()}`;
    const family = profile.officeFamily;
    const level: JudicialCourt["level"] = family.startsWith("highest_court")
      ? "local-highest"
      : family === "intermediate_appellate"
        ? "local-intermediate"
        : family === "chancery_equity"
          ? "local-chancery"
          : "local-general-trial";
    const appellate = stateProfiles.find(
      (row) =>
        row.jurisdictionId === profile.jurisdictionId &&
        row.officeFamily === "intermediate_appellate",
    );
    const highCourts = stateProfiles.filter(
      (row) =>
        row.jurisdictionId === profile.jurisdictionId &&
        row.officeFamily.startsWith("highest_court"),
    );
    const parentCourtId =
      level === "local-highest"
        ? null
        : level === "local-intermediate"
          ? highCourts.length === 1
            ? highCourts[0]!.recordId
            : null
          : (appellate?.recordId ??
            (highCourts.length === 1 ? highCourts[0]!.recordId : null));
    add({
      courtId: profile.recordId,
      jurisdictionId: jurisdictionId(key),
      name: profile.courtName.value!,
      level,
      parentCourtId,
      sourceRecordId: profile.recordId,
      identityBasis: "sourced",
      geographyDetail:
        level === "local-general-trial" ? "office-family-only" : "exact-court",
      createdAt: world.currentDate,
      rules: initialRules(profile.recordId, level, profile, resolvedSeatCounts),
    });
  }
  for (const [
    key,
    courtId,
    name,
    level,
    parentCourtId,
  ] of TERRITORY_LOCAL_COURTS) {
    add({
      courtId,
      jurisdictionId: jurisdictionId(key),
      name,
      level,
      parentCourtId,
      sourceRecordId: null,
      identityBasis: "game-profile",
      geographyDetail:
        level === "local-general-trial" ? "office-family-only" : "exact-court",
      createdAt: world.currentDate,
      rules: initialRules(courtId, level, null, resolvedSeatCounts),
    });
  }
  const seats: Record<string, JudicialSeat> = {};
  const courtRuleVersions = Object.values(courts).map((court) => {
    const count = court.rules.authorizedSeats;
    for (
      let ordinal = 1;
      count.state === "known" && ordinal <= count.value;
      ordinal += 1
    ) {
      const seatId = judicialSeatId(court.courtId, ordinal);
      seats[seatId] = {
        seatId,
        courtId: court.courtId,
        ordinal,
        servesCourtIds: [court.courtId],
        allocationRecordId: null,
        createdAt: world.currentDate,
        retiredAt: null,
        linkedOfficeId:
          court.courtId === "us-supreme-court" && ordinal === 1
            ? "us-chief-justice"
            : null,
      };
    }
    return {
      recordId: `judicial-rule:initial:${court.courtId}`,
      courtId: court.courtId,
      effectiveAt: world.currentDate,
      provisionId: null,
      rules: court.rules,
    };
  });
  const sharedSeatAllocations: JudicialSharedSeatAllocation[] =
    federalSeats.sharedAllocations.map((allocation) => {
      for (let ordinal = 1; ordinal <= allocation.seatCount; ordinal += 1) {
        const seatId = judicialSeatId(
          `judicial-allocation:${allocation.allocationRecordId}`,
          ordinal,
        );
        if (seats[seatId])
          throw new Error(`Duplicate joint judicial seat: ${seatId}`);
        seats[seatId] = {
          seatId,
          courtId: allocation.servedCourtIds[0]!,
          ordinal,
          servesCourtIds: allocation.servedCourtIds,
          allocationRecordId: allocation.allocationRecordId,
          createdAt: world.currentDate,
          retiredAt: null,
          linkedOfficeId: null,
        };
      }
      return {
        allocationRecordId: allocation.allocationRecordId,
        servedCourtIds: allocation.servedCourtIds,
        authorizedSeats: knownRule(
          allocation.seatCount,
          "sourced",
          allocation.referenceId,
        ),
        effectiveAt: world.currentDate,
      };
    });
  next = {
    ...next,
    judiciary: {
      ...EMPTY_JUDICIARY,
      courts,
      seats,
      sharedSeatAllocations,
      courtRuleVersions,
    },
  };
  assertWorldIntegrity(next);
  return next;
}

export const EMPTY_JUDICIARY: JudiciaryState = {
  courts: {},
  seats: {},
  sharedSeatAllocations: [],
  courtRuleVersions: [],
  seatTenures: [],
  selections: [],
  selectionStages: [],
  retentionContests: [],
  retentionResults: [],
  professionalQualifications: [],
  philosophies: [],
};

export function effectiveCourtRulesAt(
  world: World,
  courtId: string,
  asOf: IsoDate = world.currentDate,
): { readonly recordId: string; readonly rules: JudicialCourtRules } | null {
  const version = [...(world.judiciary?.courtRuleVersions ?? [])]
    .reverse()
    .find((entry) => entry.courtId === courtId && entry.effectiveAt <= asOf);
  return version ? { recordId: version.recordId, rules: version.rules } : null;
}

export function courtById(world: World, courtId: string): JudicialCourt | null {
  return world.judiciary?.courts[courtId] ?? null;
}

export function courtsForJurisdiction(
  world: World,
  jurisdictionId: EntityId | null,
): readonly JudicialCourt[] {
  return Object.values(world.judiciary?.courts ?? {}).filter(
    (court) => court.jurisdictionId === jurisdictionId,
  );
}

export function seatsForCourt(
  world: World,
  courtId: string,
  asOf: IsoDate = world.currentDate,
): readonly JudicialSeat[] {
  return Object.values(world.judiciary?.seats ?? {})
    .filter(
      (seat) =>
        (seat.servesCourtIds?.includes(courtId) ?? seat.courtId === courtId) &&
        seat.createdAt <= asOf &&
        (seat.retiredAt === null || seat.retiredAt > asOf),
    )
    .sort((a, b) => a.ordinal - b.ordinal);
}

export interface JudicialSeatHolder {
  readonly seatId: string;
  readonly personId: EntityId;
  readonly startedAt: IsoDate;
  readonly tenureId: string;
  readonly provenance: "judiciary" | "federal-chief-justice";
}

/** The Chief Justice is read from its already canonical federal tenure. */
export function seatHolderAt(
  world: World,
  seatId: string,
  asOf: IsoDate = world.currentDate,
): JudicialSeatHolder | null {
  const seat = world.judiciary?.seats[seatId];
  if (
    !seat ||
    seat.createdAt > asOf ||
    (seat.retiredAt && seat.retiredAt <= asOf)
  )
    return null;
  if (seat.linkedOfficeId) {
    const tenure = currentFederalTenure(world, seat.linkedOfficeId, asOf);
    return tenure
      ? {
          seatId,
          personId: tenure.personId,
          startedAt: tenure.startedAt,
          tenureId: tenure.event.id,
          provenance: "federal-chief-justice",
        }
      : null;
  }
  const holdover =
    world.judiciary?.courts[seat.courtId]?.rules
      .termHoldsUntilSuccessorQualified;
  const holdsUntilSuccessor =
    holdover?.state === "known" && holdover.value === true;
  const tenure = [...(world.judiciary?.seatTenures ?? [])]
    .reverse()
    .find(
      (entry) =>
        entry.seatId === seatId &&
        entry.startedAt <= asOf &&
        (entry.endedAt === null || asOf < entry.endedAt) &&
        (entry.termEndsAt === null ||
          asOf < entry.termEndsAt ||
          holdsUntilSuccessor),
    );
  if (!tenure) return null;
  if (
    world.history.personDeaths.some(
      (death) => death.personId === tenure.personId && death.diedAt <= asOf,
    )
  )
    return null;
  return {
    seatId,
    personId: tenure.personId,
    startedAt: tenure.startedAt,
    tenureId: tenure.tenureId,
    provenance: "judiciary",
  };
}

export function vacantSeatsAt(
  world: World,
  courtId: string,
  asOf: IsoDate = world.currentDate,
): readonly JudicialSeat[] {
  return seatsForCourt(world, courtId, asOf).filter(
    (seat) => !seatHolderAt(world, seat.seatId, asOf),
  );
}

function requireCourt(world: World, courtId: string): JudicialCourt {
  const court = courtById(world, courtId);
  if (!court) throw new Error(`Unknown judicial court: ${courtId}`);
  return court;
}

function requireSeat(world: World, seatId: string): JudicialSeat {
  const seat = world.judiciary?.seats[seatId];
  if (!seat) throw new Error(`Unknown judicial seat: ${seatId}`);
  return seat;
}

function saveJudiciary(world: World, judiciary: JudiciaryState): World {
  const next = { ...world, judiciary };
  assertWorldIntegrity(next);
  return next;
}

/** Initial court creation or an enacted new court; seat allocation is explicit. */
export function addJudicialCourt(world: World, court: JudicialCourt): World {
  if (courtById(world, court.courtId))
    throw new Error(`Judicial court already exists: ${court.courtId}`);
  const count = court.rules.authorizedSeats;
  if (
    count.state === "known" &&
    (!Number.isSafeInteger(count.value) || count.value < 0)
  )
    throw new Error(
      "Authorized judicial seat count must be a nonnegative integer.",
    );
  const seats = { ...(world.judiciary?.seats ?? {}) };
  for (
    let ordinal = 1;
    count.state === "known" && ordinal <= count.value;
    ordinal += 1
  ) {
    const seatId = judicialSeatId(court.courtId, ordinal);
    seats[seatId] = {
      seatId,
      courtId: court.courtId,
      ordinal,
      servesCourtIds: [court.courtId],
      allocationRecordId: null,
      createdAt: court.createdAt,
      retiredAt: null,
      linkedOfficeId:
        court.level === "federal-supreme" && ordinal === 1
          ? "us-chief-justice"
          : null,
    };
  }
  const previous = world.judiciary ?? EMPTY_JUDICIARY;
  return saveJudiciary(world, {
    ...previous,
    courts: { ...previous.courts, [court.courtId]: court },
    seats,
    courtRuleVersions: [
      ...previous.courtRuleVersions,
      {
        recordId: `judicial-rule:initial:${court.courtId}`,
        courtId: court.courtId,
        effectiveAt: court.createdAt,
        provisionId: null,
        rules: court.rules,
      },
    ],
  });
}

/** One canonical seat pool shared by the listed courts; no duplicate tenures. */
export function addJointJudicialSeatAllocation(
  world: World,
  input: JudicialSharedSeatAllocation,
): World {
  const previous = world.judiciary ?? EMPTY_JUDICIARY;
  if (
    previous.sharedSeatAllocations.some(
      (allocation) =>
        allocation.allocationRecordId === input.allocationRecordId,
    )
  )
    return world;
  if (input.effectiveAt > world.currentDate)
    throw new Error(
      "A future joint judicial allocation needs a scheduled transition.",
    );
  const count = input.authorizedSeats;
  if (
    count.state !== "known" ||
    !Number.isSafeInteger(count.value) ||
    count.value < 1
  )
    throw new Error(
      "A joint judicial allocation needs a positive known seat count.",
    );
  if (
    input.servedCourtIds.length < 2 ||
    new Set(input.servedCourtIds).size !== input.servedCourtIds.length
  )
    throw new Error(
      "A joint judicial allocation needs distinct member courts.",
    );
  for (const courtId of input.servedCourtIds) requireCourt(world, courtId);
  const courtId = input.servedCourtIds[0]!;
  const seats = { ...previous.seats };
  for (let ordinal = 1; ordinal <= count.value; ordinal += 1) {
    const seatId = judicialSeatId(
      `judicial-allocation:${input.allocationRecordId}`,
      ordinal,
    );
    if (seats[seatId])
      throw new Error(`Joint judicial seat already exists: ${seatId}`);
    seats[seatId] = {
      seatId,
      courtId,
      ordinal,
      servesCourtIds: [...input.servedCourtIds],
      allocationRecordId: input.allocationRecordId,
      createdAt: input.effectiveAt,
      retiredAt: null,
      linkedOfficeId: null,
    };
  }
  return saveJudiciary(world, {
    ...previous,
    seats,
    sharedSeatAllocations: [
      ...previous.sharedSeatAllocations,
      {
        ...input,
        servedCourtIds: [...input.servedCourtIds],
      },
    ],
  });
}

/** A changed statute or constitution creates vacancies, never automatic nominees. */
export function changeJudicialCourtRules(
  world: World,
  input: {
    readonly courtId: string;
    readonly effectiveAt: IsoDate;
    readonly provisionId: EntityId;
    readonly rules: JudicialCourtRules;
  },
): World {
  const court = requireCourt(world, input.courtId);
  if (input.effectiveAt > world.currentDate)
    throw new Error(
      "A future judicial rule needs a scheduled effective transition.",
    );
  if (input.rules.authorizedSeats.state !== "known")
    throw new Error("An enacted court-size change needs a known seat count.");
  const count = input.rules.authorizedSeats.value;
  if (!Number.isSafeInteger(count) || count < 0)
    throw new Error(
      "Authorized judicial seat count must be a nonnegative integer.",
    );
  const previous = world.judiciary ?? EMPTY_JUDICIARY;
  const recordId = `judicial-rule:${input.provisionId}:${input.courtId}`;
  if (previous.courtRuleVersions.some((record) => record.recordId === recordId))
    return world;
  const seats = { ...previous.seats };
  const existing = Object.values(seats).filter(
    (seat) => seat.courtId === court.courtId && !seat.allocationRecordId,
  );
  const largestOrdinal = Math.max(0, ...existing.map((seat) => seat.ordinal));
  let activeCount = existing.filter((seat) => seat.retiredAt === null).length;
  let ordinal = largestOrdinal;
  while (activeCount < count) {
    ordinal += 1;
    const seatId = judicialSeatId(court.courtId, ordinal);
    seats[seatId] = {
      seatId,
      courtId: court.courtId,
      ordinal,
      servesCourtIds: [court.courtId],
      allocationRecordId: null,
      createdAt: input.effectiveAt,
      retiredAt: null,
      linkedOfficeId: null,
    };
    activeCount += 1;
  }
  if (activeCount > count) {
    for (const seat of existing
      .filter((entry) => entry.retiredAt === null)
      .sort((a, b) => b.ordinal - a.ordinal)) {
      if (activeCount <= count) break;
      if (seatHolderAt(world, seat.seatId, input.effectiveAt)) continue;
      seats[seat.seatId] = { ...seat, retiredAt: input.effectiveAt };
      activeCount -= 1;
    }
  }
  return saveJudiciary(world, {
    ...previous,
    courts: {
      ...previous.courts,
      [court.courtId]: { ...court, rules: input.rules },
    },
    seats,
    courtRuleVersions: [
      ...previous.courtRuleVersions,
      {
        recordId,
        courtId: court.courtId,
        effectiveAt: input.effectiveAt,
        provisionId: input.provisionId,
        rules: input.rules,
      },
    ],
  });
}

export function seatJudge(
  world: World,
  input: {
    readonly seatId: string;
    readonly personId: EntityId;
    readonly startedAt: IsoDate;
    readonly selection: JudicialSelectionProvenance;
    readonly termEndsAt: IsoDate | null;
    readonly retentionDueAt: IsoDate | null;
  },
): World {
  const seat = requireSeat(world, input.seatId);
  if (seat.linkedOfficeId)
    throw new Error(
      "The Chief Justice seat follows canonical federal office tenure.",
    );
  if (
    seat.retiredAt !== null ||
    input.startedAt < seat.createdAt ||
    input.startedAt > world.currentDate
  )
    throw new Error("Judicial seat is unavailable at the requested date.");
  if (!world.people[input.personId])
    throw new Error(`Unknown judicial nominee: ${input.personId}`);
  if (seatHolderAt(world, seat.seatId, input.startedAt))
    throw new Error(`Judicial seat already held: ${seat.seatId}`);
  if (
    world.history.personDeaths.some(
      (death) =>
        death.personId === input.personId && death.diedAt <= input.startedAt,
    )
  )
    throw new Error("A deceased person cannot take a judicial seat.");
  const previous = world.judiciary ?? EMPTY_JUDICIARY;
  const tenureId = `judicial-tenure:${input.seatId}:${input.startedAt}:${input.personId}`;
  if (previous.seatTenures.some((tenure) => tenure.tenureId === tenureId))
    throw new Error(`Judicial tenure already exists: ${tenureId}`);
  const tenure: JudicialSeatTenure = {
    tenureId,
    seatId: input.seatId,
    personId: input.personId,
    startedAt: input.startedAt,
    endedAt: null,
    endReason: null,
    selection: input.selection,
    termEndsAt: input.termEndsAt,
    retentionDueAt: input.retentionDueAt,
  };
  const seated = saveJudiciary(world, {
    ...previous,
    seatTenures: [...previous.seatTenures, tenure],
  });
  return requireCourt(seated, seat.courtId).level === "local-general-trial"
    ? recoverProsecutionsAfterBenchChange(seated, seat.courtId, tenure.tenureId)
    : seated;
}

export function vacateJudicialSeat(
  world: World,
  input: {
    readonly seatId: string;
    readonly vacatedAt: IsoDate;
    readonly reason: NonNullable<JudicialSeatTenure["endReason"]>;
  },
): World {
  const seat = requireSeat(world, input.seatId);
  if (seat.linkedOfficeId)
    throw new Error(
      "The Chief Justice vacancy follows canonical federal office tenure.",
    );
  if (input.vacatedAt > world.currentDate)
    throw new Error("A future vacancy needs a scheduled transition.");
  const previous = world.judiciary ?? EMPTY_JUDICIARY;
  const currentTenure = [...previous.seatTenures]
    .reverse()
    .find(
      (entry) =>
        entry.seatId === input.seatId &&
        entry.startedAt <= input.vacatedAt &&
        (entry.endedAt === null || entry.endedAt > input.vacatedAt),
    );
  if (!currentTenure)
    throw new Error(`Judicial seat is already vacant: ${input.seatId}`);
  const court = requireCourt(world, seat.courtId);
  const capacity = court.rules.authorizedSeats;
  const activeCount = seatsForCourt(world, court.courtId).filter(
    (active) => !active.allocationRecordId,
  ).length;
  const retiring =
    !seat.allocationRecordId &&
    capacity.state === "known" &&
    activeCount > capacity.value;
  return saveJudiciary(world, {
    ...previous,
    seats: retiring
      ? {
          ...previous.seats,
          [seat.seatId]: { ...seat, retiredAt: input.vacatedAt },
        }
      : previous.seats,
    seatTenures: previous.seatTenures.map((tenure) =>
      tenure.tenureId === currentTenure.tenureId
        ? { ...tenure, endedAt: input.vacatedAt, endReason: input.reason }
        : tenure,
    ),
  });
}
