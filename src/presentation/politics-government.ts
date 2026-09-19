import type { EntityId, World } from "../simulation";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../simulation/life-places";
import { governmentUnitsForPlace } from "../simulation/government-units";
import { homeLocalGovernmentUnits } from "../simulation/nationwide-world/local-governments";
import {
  municipalGovernmentForLifePlace,
  primaryReading,
} from "../simulation/municipal-government";
import { stateExecutiveOffice } from "../simulation/nationwide-world/state-executives";
import { projectCongress } from "../simulation/living-world/congress";
import type {
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
  place: ReturnType<typeof lifePlaceByJurisdictionId>,
  name: string,
): { governs: string | null; branches: GovernmentBranchView[] } {
  if (!place || place.scope === "state") {
    const none = `No local government is recorded for ${name}.`;
    return {
      governs: null,
      branches: [
        branch("legislative", [], none),
        branch("executive", [], none),
        branch("judicial", [], none),
      ],
    };
  }
  const government = municipalGovernmentForLifePlace(place);
  let bodyName: string | null = null;
  let form: string | null = null;
  if (government) {
    try {
      const reading = primaryReading(government);
      bodyName = reading.bodyName;
      form = reading.form;
    } catch {
      /* a government with no reading carries no body or form to show */
    }
  }
  const legislative: GovernmentEntry[] = [];
  if (government && bodyName) {
    legislative.push({
      key: `local-body:${government.key}`,
      title: bodyName,
      holderName: null,
      holderPersonId: null,
      detail: government.displayName,
      rosterNote: "No current record of its members is kept in this save.",
    });
  } else {
    const units = place.sourceGeoid
      ? governmentUnitsForPlace(place.sourceGeoid)
      : [];
    for (const unit of units) {
      legislative.push({
        key: `unit:${unit.id}`,
        title: unit.name,
        holderName: null,
        holderPersonId: null,
        detail: "Local government listed by the Census Bureau",
      });
    }
  }
  const executive: GovernmentEntry[] =
    government && form
      ? [
          {
            key: `local-executive:${government.key}`,
            title: `${government.displayName} — ${formLabel(form)}`,
            holderName: null,
            holderPersonId: null,
            detail: "No current officeholder is recorded in this save.",
          },
        ]
      : [];
  return {
    governs: government?.displayName ?? place.displayName,
    branches: [
      branch(
        "legislative",
        legislative,
        `No local legislative body is recorded for ${name}.`,
      ),
      branch(
        "executive",
        executive,
        `No local executive office is recorded for ${name}.`,
      ),
      branch("judicial", [], `No local court is recorded for ${name}.`),
    ],
  };
}

const FORM_LABELS: Readonly<Record<string, string>> = {
  MAYOR_COUNCIL: "mayor and council",
  COUNCIL_MANAGER: "council with an appointed manager",
  COMMISSION_MANAGER: "commission with an appointed manager",
  CITY_MANAGER: "appointed city manager",
  TOWN_MEETING: "town meeting",
  URBAN_COUNTY_CONSOLIDATED: "consolidated city and county",
  CITY_COUNTY_CONSOLIDATED: "consolidated city and county",
  CONSOLIDATED_CITY_COUNTY: "consolidated city and county",
};

function formLabel(form: string): string {
  return FORM_LABELS[form] ?? form.toLowerCase().replace(/_/g, " ");
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
  const here: GovernmentPlaceRef = {
    jurisdictionId: hereId,
    label: location?.label ?? placeLabel(hereId) ?? "Where you are",
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
          title: unit.name,
          holderName: null,
          holderPersonId: null,
          detail: "County government listed by the Census Bureau",
        }))
      : [];
  const resolved =
    scope === "local"
      ? localBranches(browsingPlace, browsingName)
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
