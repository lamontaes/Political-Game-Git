import { personName } from "../simulation";
import type { EntityId, World } from "../simulation";
import { municipalSeats } from "../simulation/municipal-public-work";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../simulation/life-places";
import { governmentUnitsForPlace } from "../simulation/government-units";
import {
  homeLocalGovernmentUnits,
  localGovernmentDisplayName,
} from "../simulation/nationwide-world/local-governments";
import {
  municipalGovernmentForLifePlace,
  primaryReading,
} from "../simulation/municipal-government";
import { stateExecutiveOffice } from "../simulation/nationwide-world/state-executives";
import { projectCongress } from "../simulation/living-world/congress";
import { organizationNameAt } from "../simulation/living-world/party-registry";
import type {
  ChamberView,
  CongressView,
  SeatView,
} from "../simulation/living-world/contract";
import { homeStateUsps } from "../simulation/nationwide-world/state-executives";
import { districtResidenceIntervals } from "../simulation/district-residence";
import { districtIdentityCatalog } from "../districts/catalog";
import {
  districtIdentityByRecordId,
  gazetteerChamberForOfficeChamberKey,
} from "../districts/query";
import { openingLifeLocation } from "./life-scene-flow";
import { legislativeRulePackForState } from "./new-game-geography";
import { currentPublicOfficeholders } from "./opening-officeholders";
import { proseDate } from "./prose-dates";

/**
 * The Politics hub's Government browser (UI DECISION FOLLOW-THROUGH).
 *
 * A read of public government for one place, never a grant of power: a
 * citizen may look at any branch without holding it. The default place is
 * where the character is now, which travel changes; the office they hold and
 * the contest they run stay with Your office and Campaigns. Every entry comes
 * from a record the World or an accepted rule pack already has. A branch with
 * no record says so; an office with no current holder record is not called a
 * vacancy; a county is never given an institution it does not have.
 */

export type GovernmentScope = "local" | "state" | "federal";
export type GovernmentBranch = "legislative" | "executive" | "judicial";

export const GOVERNMENT_SCOPES: readonly GovernmentScope[] = [
  "local",
  "state",
  "federal",
];

const SCOPE_LABELS: Readonly<Record<GovernmentScope, string>> = {
  local: "Local",
  state: "State",
  federal: "Federal",
};

const BRANCH_LABELS: Readonly<Record<GovernmentBranch, string>> = {
  legislative: "Legislative",
  executive: "Executive",
  judicial: "Judicial",
};

export type GovernmentSeatStatus = "member" | "vacancy" | "no-current-record";

/** One seat of a chamber, as the saved record states it today. */
export interface GovernmentSeatRow {
  readonly key: string;
  readonly seatLabel: string;
  readonly stateUsps: string | null;
  readonly status: GovernmentSeatStatus;
  readonly holderName: string | null;
  readonly holderPersonId: EntityId | null;
  /** For a recorded vacancy: since when, and the recorded reason. */
  readonly note: string | null;
}

export interface GovernmentSeatCounts {
  readonly seats: number;
  readonly members: number;
  readonly vacancies: number;
  readonly noCurrentRecord: number;
}

/**
 * How a chamber divides, and where those two divisions disagree.
 *
 * A chamber has two memberships and they are not the same fact. Party is who a
 * member says they belong to; caucus is who they sit and count with inside this
 * chamber. For most members the two agree and the caucus breakdown only repeats
 * the party bar. The members it does not agree for are the reading worth having
 * — an independent who counts with one of the two, a member of a party too
 * small to have its own caucus — and they are listed by name rather than left
 * to be inferred from a difference between two totals.
 *
 * Every line is derived from seat records on the read. Nothing is stored, and a
 * chamber whose save records no caucus at all says so and still shows its
 * parties.
 */
export interface ChamberStanding {
  readonly key: string;
  readonly label: string;
  readonly members: number;
}

/** One member whose caucus is not their party. Named, because that is the point. */
export interface ChamberCrossing {
  readonly key: string;
  readonly personId: EntityId;
  readonly name: string;
  readonly seatLabel: string;
  /** Null when the save records no party for them at all. */
  readonly partyLabel: string | null;
  readonly caucusLabel: string;
}

export interface ChamberStandings {
  readonly parties: readonly ChamberStanding[];
  readonly caucuses: readonly ChamberStanding[];
  readonly crossings: readonly ChamberCrossing[];
  /** Said plainly when the save records no caucus for any member here. */
  readonly caucusNote: string | null;
  /** Said plainly when every member's caucus matches their party. */
  readonly crossingNote: string | null;
}

/** A saved legislative record the measure card already opens. */
export interface GovernmentRecordLink {
  readonly key: string;
  readonly label: string;
  readonly measureId: EntityId;
}

export interface GovernmentEntry {
  readonly key: string;
  readonly title: string;
  readonly holderName: string | null;
  readonly holderPersonId: EntityId | null;
  readonly detail: string | null;
  /** Present for a chamber whose seats the save records. */
  readonly counts?: GovernmentSeatCounts;
  readonly roster?: readonly GovernmentSeatRow[];
  /** Present for a chamber: how it divides by party and by caucus. */
  readonly standings?: ChamberStandings;
  /** Said plainly when a body exists but no member roster is recorded. */
  readonly rosterNote?: string;
  readonly records?: readonly GovernmentRecordLink[];
}

/**
 * Who represents the character's home, seat by seat. Distinct from Here (where
 * the character is) and from Home (the place itself): these are the districts
 * the home lies in, each only when the save or an exact rule establishes it.
 */
export interface RepresentationRow {
  readonly key: string;
  readonly office: string;
  /** The district or seat, or null when it is not recorded for this home. */
  readonly district: string | null;
  readonly holders: readonly {
    readonly key: string;
    readonly status: GovernmentSeatStatus;
    readonly name: string | null;
    readonly personId: EntityId | null;
  }[];
  readonly note: string | null;
}

export interface GovernmentBranchView {
  readonly branch: GovernmentBranch;
  readonly label: string;
  readonly entries: readonly GovernmentEntry[];
  /** Plain statement when nothing is recorded for this branch here. */
  readonly absent: string | null;
}

export interface GovernmentPlaceRef {
  readonly jurisdictionId: EntityId | null;
  readonly label: string;
}

export interface GovernmentBrowserView {
  readonly here: GovernmentPlaceRef;
  readonly home: GovernmentPlaceRef;
  /** The place being browsed, and whether it is where the character is. */
  readonly browsing: GovernmentPlaceRef & {
    readonly isHere: boolean;
    readonly isHome: boolean;
  };
  readonly scope: GovernmentScope;
  readonly scopeLabel: string;
  /** "Nevada", "Alamo, Nevada", "United States" — what this scope governs. */
  readonly governs: string | null;
  readonly branches: readonly GovernmentBranchView[];
  /** Government identities without a recorded institution profile. */
  readonly localGovernments: readonly GovernmentEntry[];
  /**
   * Other general-purpose governments that serve this place (a county, for
   * instance), listed as the Census Bureau records them rather than forced
   * into a branch they may not have. Only known for the character's home.
   */
  readonly alsoGoverning: readonly GovernmentEntry[];
  /** The state the browsed place is in, for a chamber's delegation. */
  readonly browsingState: {
    readonly usps: string;
    readonly name: string;
  } | null;
  /** Null when the save names no home state to be represented in. */
  readonly representedBy: readonly RepresentationRow[] | null;
}

export interface GovernmentBrowserOptions {
  readonly scope?: GovernmentScope;
  /** An explicitly chosen place; null or absent browses "Here". */
  readonly jurisdictionId?: EntityId | null;
}

function placeLabel(jurisdictionId: EntityId | null): string | null {
  if (!jurisdictionId) return null;
  return lifePlaceByJurisdictionId(jurisdictionId)?.displayName ?? null;
}

function branch(
  key: GovernmentBranch,
  entries: readonly GovernmentEntry[],
  absent: string,
): GovernmentBranchView {
  return {
    branch: key,
    label: BRANCH_LABELS[key],
    entries,
    absent: entries.length > 0 ? null : absent,
  };
}

function holderEntry(
  world: World,
  officeKey: string,
  fallbackTitle: string,
): GovernmentEntry | null {
  const holder = currentPublicOfficeholders(world).find(
    (record) => record.officeKey === officeKey,
  );
  if (!holder) return null;
  return {
    key: `office:${officeKey}`,
    title: holder.title || fallbackTitle,
    holderName: holder.personName,
    holderPersonId: holder.personId,
    detail: null,
  };
}

function localBranches(
  world: World,
  place: ReturnType<typeof lifePlaceByJurisdictionId>,
): {
  governs: string | null;
  branches: GovernmentBranchView[];
  localGovernments: GovernmentEntry[];
} {
  if (!place || place.scope === "state") {
    return { governs: null, branches: [], localGovernments: [] };
  }
  const government = municipalGovernmentForLifePlace(place);
  const reading = government?.readings.length
    ? primaryReading(government)
    : null;
  const seats = government ? municipalSeats(world, government.key) : [];
  const branches: GovernmentBranchView[] = [];
  if (government && reading?.bodyName) {
    const roster: GovernmentSeatRow[] = seats
      .filter(
        (seat) => seat.role === "member" || seat.role === "presiding-member",
      )
      .map((seat) => ({
        key: `municipal-seat:${government.key}:${seat.personId}`,
        seatLabel: seat.seatLabel ?? "Member",
        stateUsps: null,
        status: "member",
        holderName: personName(world.people[seat.personId]!),
        holderPersonId: seat.personId,
        note: null,
      }));
    branches.push({
      branch: "legislative",
      label: reading.bodyName,
      entries: [
        {
          key: `local-body:${government.key}`,
          title: reading.bodyName,
          holderName: null,
          holderPersonId: null,
          detail: government.displayName,
          ...(roster.length
            ? { roster }
            : { rosterNote: "Member details are limited." }),
        },
      ],
      absent: null,
    });
  }
  // A form label alone does not establish an executive office. A mayor may
  // preside over the body; only an explicit separate-executive position belongs
  // here. Keep every office's saved holder separate.
  const executive: GovernmentEntry[] = [];
  if (
    government &&
    reading?.mayor?.structuralPosition === "SEPARATE_CHIEF_EXECUTIVE"
  ) {
    const mayor = seats.find((seat) => seat.role === "mayor");
    executive.push({
      key: `local-mayor:${government.key}`,
      title: reading.mayor.title,
      holderName: mayor ? personName(world.people[mayor.personId]!) : null,
      holderPersonId: mayor?.personId ?? null,
      detail: null,
    });
  }
  if (government && reading?.manager) {
    const manager = seats.find((seat) => seat.role === "professional-manager");
    executive.push({
      key: `local-executive:${government.key}`,
      title: reading.manager.title,
      holderName: manager ? personName(world.people[manager.personId]!) : null,
      holderPersonId: manager?.personId ?? null,
      detail: reading.manager.statedRole || null,
    });
  }
  if (executive.length) {
    branches.push({
      branch: "executive",
      label: executive.map((entry) => entry.title).join(" / "),
      entries: executive,
      absent: null,
    });
  }
  const localGovernments: GovernmentEntry[] = branches.length
    ? []
    : (place.sourceGeoid ? governmentUnitsForPlace(place.sourceGeoid) : []).map(
        (unit) => ({
          key: `unit:${unit.id}`,
          title: localGovernmentDisplayName(unit),
          holderName: null,
          holderPersonId: null,
          detail: "Government details are limited.",
        }),
      );
  return {
    governs: government?.displayName ?? place.displayName,
    branches,
    localGovernments,
  };
}

function stateBranches(
  world: World,
  stateKey: string | null,
): { governs: string | null; branches: GovernmentBranchView[] } {
  const stateName = stateKey
    ? (stateJurisdictionForKey(stateKey)?.name ?? null)
    : null;
  const subject = stateName ?? "this place's state";
  if (!stateKey || !/^US-[A-Z]{2}$/.test(stateKey)) {
    const none = "No state government is recorded for this place.";
    return {
      governs: null,
      branches: [
        branch("legislative", [], none),
        branch("executive", [], none),
        branch("judicial", [], none),
      ],
    };
  }
  const pack = legislativeRulePackForState(stateKey);
  const records: GovernmentRecordLink[] = pack
    ? (world.history.legislativeMeasures ?? [])
        .filter((measure) => measure.rulePackId === pack.packId)
        .sort((left, right) => right.sequence - left.sequence)
        .slice(0, 10)
        .map((measure) => ({
          key: `measure:${measure.id}`,
          label: `${measure.designation} — ${measure.shortTitle}`,
          measureId: measure.id,
        }))
    : [];
  const legislative: GovernmentEntry[] = pack
    ? [
        {
          key: `legislature:${pack.packId}`,
          title: pack.displayName,
          holderName: null,
          holderPersonId: null,
          detail:
            records.length > 0
              ? "Recent bills on record open with their committee referrals, votes and presentment."
              : "No bills are on record for this legislature in this save.",
          records,
        },
        ...pack.chambers.map((chamber) => ({
          key: `chamber:${pack.packId}:${chamber.chamberKey}`,
          title: chamber.name,
          holderName: null,
          holderPersonId: null,
          detail: null,
          rosterNote:
            "No current record of this chamber's members is kept in this save.",
        })),
      ]
    : [];
  const office = stateExecutiveOffice(stateKey.slice(3));
  const executive: GovernmentEntry[] = [];
  if (office) {
    executive.push(
      holderEntry(world, office.officeKey, office.displayName) ?? {
        key: `office:${office.officeKey}`,
        title: office.displayName,
        holderName: null,
        holderPersonId: null,
        detail: "No current officeholder is recorded in this save.",
      },
    );
  }
  return {
    governs: stateName,
    branches: [
      branch(
        "legislative",
        legislative,
        `The game has not established ${subject}'s legislature.`,
      ),
      branch(
        "executive",
        executive,
        `The game has not established ${subject}'s executive office.`,
      ),
      branch(
        "judicial",
        [],
        `The game has not established ${subject}'s courts.`,
      ),
    ],
  };
}

function federalBranches(world: World): {
  governs: string | null;
  branches: GovernmentBranchView[];
} {
  const congress = projectCongress(world);
  const legislative: GovernmentEntry[] = congress
    ? [congress.senate, congress.house].map((chamber) => ({
        key: `chamber:${chamber.chamberKey}`,
        title: chamber.name,
        holderName: null,
        holderPersonId: null,
        detail: null,
        counts: {
          seats: chamber.totals.seats,
          members: chamber.totals.members,
          vacancies: chamber.totals.vacancies,
          noCurrentRecord: chamber.totals.noCurrentRecord,
        },
        roster: chamber.seats.map((seat) => seatRow(world, seat)),
        standings: chamberStandings(world, chamber),
      }))
    : [];
  const president = holderEntry(
    world,
    "us-president",
    "President of the United States",
  );
  const chiefJustice = holderEntry(
    world,
    "us-chief-justice",
    "Chief Justice of the United States",
  );
  return {
    governs: "United States",
    branches: [
      branch(
        "legislative",
        legislative,
        "Congress is not established in this save.",
      ),
      branch(
        "executive",
        president ? [president] : [],
        "No current President is recorded in this save.",
      ),
      branch(
        "judicial",
        chiefJustice ? [chiefJustice] : [],
        "No current Chief Justice is recorded in this save.",
      ),
    ],
  };
}

function stateNameFor(usps: string): string {
  return stateJurisdictionForKey(`US-${usps}`)?.name ?? usps;
}

/**
 * The party key behind a living-world organization, read from its own stable
 * key. A national party is `party:<key>`; a chamber caucus is
 * `caucus:<chamber>:<key>`. Comparing the two organization ids directly would
 * say every member crosses, because a party and a caucus are different
 * organizations even when they stand for the same party.
 */
function partyKeyOf(
  world: World,
  organizationId: EntityId | null,
): string | null {
  if (!organizationId) return null;
  const organization = world.history.organizations.find(
    (candidate) => candidate.id === organizationId,
  );
  if (!organization) return null;
  const parts = organization.stableKey.split(":");
  const kind = parts.indexOf("party") >= 0 ? "party" : "caucus";
  const at = parts.indexOf(kind);
  if (at < 0) return null;
  // party:<key> and caucus:<chamber>:<key> both end with the key.
  return parts[parts.length - 1] ?? null;
}

function standingsFor(
  world: World,
  entries: readonly {
    readonly organizationId: EntityId | null;
    readonly members: number;
  }[],
  unnamed: string,
): readonly ChamberStanding[] {
  return entries.map((entry) => ({
    key: entry.organizationId ?? "none",
    label: entry.organizationId
      ? (organizationNameAt(world, entry.organizationId) ??
        "Another organization")
      : unnamed,
    members: entry.members,
  }));
}

/** How a chamber divides, and the members whose caucus is not their party. */
function chamberStandings(
  world: World,
  chamber: ChamberView,
): ChamberStandings {
  const parties = standingsFor(
    world,
    chamber.totals.byParty.map((entry) => ({
      organizationId: entry.partyOrganizationId,
      members: entry.members,
    })),
    "No recorded party",
  );
  const caucuses = standingsFor(
    world,
    chamber.totals.byCaucus.map((entry) => ({
      organizationId: entry.caucusOrganizationId,
      members: entry.members,
    })),
    "No recorded caucus",
  );
  const anyCaucusRecorded = chamber.totals.byCaucus.some(
    (entry) => entry.caucusOrganizationId !== null,
  );
  const crossings: ChamberCrossing[] = [];
  for (const seat of chamber.seats) {
    if (seat.occupant.kind !== "member") continue;
    const { member } = seat.occupant;
    const partyKey = partyKeyOf(world, member.partyOrganizationId);
    const caucusKey = partyKeyOf(world, member.caucusOrganizationId);
    if (caucusKey === null || caucusKey === partyKey) continue;
    crossings.push({
      key: seat.seatKey,
      personId: member.personId,
      name: member.personName,
      seatLabel: seatLabelFor(seat),
      partyLabel: member.partyOrganizationId
        ? (organizationNameAt(world, member.partyOrganizationId) ??
          "Another party")
        : null,
      caucusLabel:
        organizationNameAt(world, member.caucusOrganizationId as EntityId) ??
        "Another caucus",
    });
  }
  crossings.sort(
    (left, right) =>
      left.caucusLabel.localeCompare(right.caucusLabel) ||
      left.seatLabel.localeCompare(right.seatLabel),
  );
  return {
    parties,
    caucuses: anyCaucusRecorded ? caucuses : [],
    crossings,
    caucusNote: anyCaucusRecorded
      ? null
      : "No caucus is recorded for anyone in this chamber.",
    crossingNote:
      anyCaucusRecorded && crossings.length === 0
        ? "Every member here caucuses with their own party."
        : null,
  };
}

const SENATE_CLASS = ["", "I", "II", "III"] as const;

function seatLabelFor(seat: SeatView): string {
  const state = stateNameFor(seat.stateUsps);
  if (seat.senateClass !== null)
    return `${state}, Class ${SENATE_CLASS[seat.senateClass]} seat`;
  if (seat.district === null) return state;
  if (seat.district === "00") return `${state}, at large`;
  return `${state}, district ${Number(seat.district)}`;
}

/** The recorded reason a seat is vacant; the save's own words, never a guess. */
function vacancyNote(world: World, eventId: EntityId, since: string): string {
  const event = world.history.events.find((entry) => entry.id === eventId);
  const reason = event?.tags.includes("provenance:fictional-initial-vacancy")
    ? "It was already vacant when this world began."
    : "No reason is recorded.";
  return `Vacant since ${proseDate(since)}. ${reason}`;
}

function seatRow(world: World, seat: SeatView): GovernmentSeatRow {
  const occupant = seat.occupant;
  return {
    key: seat.seatKey,
    seatLabel: seatLabelFor(seat),
    stateUsps: seat.stateUsps,
    status: occupant.kind,
    holderName: occupant.kind === "member" ? occupant.member.personName : null,
    holderPersonId:
      occupant.kind === "member" ? occupant.member.personId : null,
    note:
      occupant.kind === "vacancy"
        ? vacancyNote(world, occupant.eventId, occupant.since)
        : null,
  };
}

function seatHolder(seat: SeatView) {
  const occupant = seat.occupant;
  return {
    key: seat.seatKey,
    status: occupant.kind,
    name: occupant.kind === "member" ? occupant.member.personName : null,
    personId: occupant.kind === "member" ? occupant.member.personId : null,
  };
}

function representedBy(
  world: World,
  personId: EntityId,
  congress: CongressView | null,
): readonly RepresentationRow[] | null {
  const usps = homeStateUsps(world, personId);
  if (!usps) return null;
  const state = stateNameFor(usps);
  const catalog = districtIdentityCatalog();
  const open = districtResidenceIntervals(world).filter(
    (interval) =>
      interval.personId === personId &&
      interval.endedOn === null &&
      interval.startedOn <= world.currentDate &&
      interval.binding.stateUsps === usps,
  );
  const recorded = (chamber: string) =>
    open.find((interval) => interval.binding.chamber === chamber) ?? null;
  const rows: RepresentationRow[] = [];

  const houseSeats =
    congress?.house.seats.filter((seat) => seat.stateUsps === usps) ?? [];
  const houseInterval = recorded("congressional");
  const houseCode = houseInterval
    ? districtIdentityByRecordId(catalog, houseInterval.binding.recordId)
        ?.districtCode
    : undefined;
  // A state with one at-large seat is represented by it wherever the home is.
  const houseSeat = houseInterval
    ? houseSeats.find((seat) => seat.district === houseCode)
    : houseSeats.length === 1 && houseSeats[0]!.district === "00"
      ? houseSeats[0]
      : undefined;
  rows.push({
    key: "us-house",
    office: "U.S. House",
    district: houseSeat ? seatLabelFor(houseSeat) : null,
    holders: houseSeat ? [seatHolder(houseSeat)] : [],
    note: houseSeat
      ? null
      : `Your congressional district in ${state} is not recorded for your home.`,
  });

  const senateSeats =
    congress?.senate.seats.filter((seat) => seat.stateUsps === usps) ?? [];
  rows.push({
    key: "us-senate",
    office: "U.S. Senate",
    district: state,
    holders: senateSeats.map(seatHolder),
    note:
      senateSeats.length > 0
        ? null
        : "No record of the Senate's membership is kept in this save.",
  });

  const pack = legislativeRulePackForState(`US-${usps}`);
  for (const chamber of pack?.chambers ?? []) {
    const gazetteer = gazetteerChamberForOfficeChamberKey(chamber.chamberKey);
    const interval = gazetteer ? recorded(gazetteer) : null;
    const identity = interval
      ? districtIdentityByRecordId(catalog, interval.binding.recordId)
      : null;
    rows.push({
      key: `state:${chamber.chamberKey}`,
      office: chamber.name,
      district: identity
        ? (identity.sourceName ?? `District ${identity.districtCode}`)
        : null,
      holders: [],
      note: identity
        ? "No current record of who holds this seat."
        : "Your district for this chamber is not recorded for your home.",
    });
  }
  return rows;
}

export function projectGovernmentBrowser(
  world: World,
  personId: EntityId,
  options: GovernmentBrowserOptions = {},
): GovernmentBrowserView {
  const person = world.people[personId];
  const homeId = person?.homeJurisdictionId ?? null;
  const location = openingLifeLocation(world, personId);
  const hereId = location?.jurisdictionId ?? homeId;
  // The place's own name first: a scene location's label names a setting
  // ("Home"), not where it is, and "Here: Home" names neither.
  const here: GovernmentPlaceRef = {
    jurisdictionId: hereId,
    label: placeLabel(hereId) ?? location?.label ?? "Where you are",
  };
  const home: GovernmentPlaceRef = {
    jurisdictionId: homeId,
    label: placeLabel(homeId) ?? "Home",
  };
  const browsingId = options.jurisdictionId ?? hereId;
  const browsingPlace = browsingId
    ? lifePlaceByJurisdictionId(browsingId)
    : null;
  const browsingName =
    browsingPlace?.displayName ??
    (browsingId === hereId ? here.label : "this place");
  const scope = options.scope ?? "local";
  const browsingStateKey =
    browsingPlace?.stateJurisdictionKey ??
    (browsingPlace?.scope === "state" ? browsingPlace.key : null);
  const browsingUsps =
    browsingStateKey && /^US-[A-Z]{2}$/.test(browsingStateKey)
      ? browsingStateKey.slice(3)
      : null;
  const alsoGoverning: GovernmentEntry[] =
    scope === "local" && browsingId !== null && browsingId === homeId
      ? homeLocalGovernmentUnits(world, personId).counties.map((unit) => ({
          key: `county:${unit.id}`,
          title: localGovernmentDisplayName(unit),
          holderName: null,
          holderPersonId: null,
          detail: null,
        }))
      : [];
  const local = scope === "local" ? localBranches(world, browsingPlace) : null;
  const resolved = local
    ? local
    : scope === "state"
      ? stateBranches(world, browsingStateKey)
      : federalBranches(world);
  return {
    here,
    home,
    browsing: {
      jurisdictionId: browsingId,
      label: browsingName,
      isHere: browsingId === hereId,
      isHome: browsingId === homeId,
    },
    scope,
    scopeLabel: SCOPE_LABELS[scope],
    governs: resolved.governs,
    branches: resolved.branches,
    localGovernments: local?.localGovernments ?? [],
    alsoGoverning,
    browsingState: browsingUsps
      ? { usps: browsingUsps, name: stateNameFor(browsingUsps) }
      : null,
    representedBy: representedBy(world, personId, projectCongress(world)),
  };
}

export type GovernmentPlace = "here" | "home";

export interface IssuesPlace {
  /** The jurisdiction whose public finances are shown, or null if none can be. */
  readonly jurisdictionId: EntityId | null;
  /** "Here: Alamo, Nevada" — which place the Issues tab is showing. */
  readonly label: string;
  /** Plain words when the view could not follow the Government selection. */
  readonly note: string | null;
}

/**
 * The place Issues and budget shows: the one selected in Government (Here by
 * default, or Home), at State scope that place's state. Public finances are
 * only shown for a jurisdiction this save records; anything else says so.
 */
export function issuesPlaceForSelection(
  world: World,
  personId: EntityId,
  selection: {
    readonly place: GovernmentPlace;
    readonly scope: GovernmentScope;
  },
): IssuesPlace {
  const base = projectGovernmentBrowser(world, personId);
  const homeDiffers =
    base.home.jurisdictionId !== null &&
    base.home.jurisdictionId !== base.here.jurisdictionId;
  const chosen = selection.place === "home" && homeDiffers ? "home" : "here";
  const ref = chosen === "home" ? base.home : base.here;
  const prefix = chosen === "home" ? "Home" : "Here";
  const place = ref.jurisdictionId
    ? lifePlaceByJurisdictionId(ref.jurisdictionId)
    : null;
  let jurisdictionId = ref.jurisdictionId;
  let label = `${prefix}: ${ref.label}`;
  let note: string | null = null;
  if (selection.scope === "state") {
    const stateKey =
      place?.stateJurisdictionKey ??
      (place?.scope === "state" ? place.key : null);
    const state = stateKey ? stateJurisdictionForKey(stateKey) : null;
    if (state && world.jurisdictions[state.id]) {
      jurisdictionId = state.id;
      label = `${prefix}: the state of ${state.name}`;
    } else {
      note = `No state public finance record is kept for ${ref.label}; showing the place itself.`;
    }
  } else if (selection.scope === "federal") {
    note =
      "Federal public finances are not part of this game yet; showing the place selected in Government.";
  }
  if (!jurisdictionId || !world.jurisdictions[jurisdictionId]) {
    return {
      jurisdictionId: null,
      label,
      note: `No public finance record is kept for ${ref.label} in this save.`,
    };
  }
  return { jurisdictionId, label, note };
}

export function governmentScopeLabel(scope: GovernmentScope): string {
  return SCOPE_LABELS[scope];
}
