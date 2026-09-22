import type { OrientationHolderDisplay } from "./municipal-orientation-holder";
import type { EntityId } from "../simulation";
import { proseDate } from "./prose-dates";
import type {
  ChamberView,
  PartyView,
  SeatView,
  WorldOrientation,
} from "./world-orientation-contract";

/**
 * The four-step introduction to the world a life starts in.
 *
 * A pure reading of W's saved orientation projection: White House, Congress,
 * the home state, then the place itself. Every name, party, count and date on
 * these panels comes from that one projection, so the panels cannot disagree
 * with the person cards, News or Congress itself. Where the projection has
 * nothing — an old save without a congressional snapshot, a place with no
 * recorded government — the step says less rather than filling the gap.
 *
 * Opening, stepping back, skipping or reopening these panels is interface
 * navigation. None of it moves the player, meets anyone, or writes to the
 * World.
 */

export type OrientationStepKey =
  "executive" | "congress" | "state" | "locality";

export const ORIENTATION_STEP_ORDER: readonly OrientationStepKey[] = [
  "executive",
  "congress",
  "state",
  "locality",
];

export interface OrientationPerson {
  readonly personId: EntityId;
  readonly name: string;
  readonly title: string;
  /** Party name, or null when the record shows no public party affiliation. */
  readonly party: string | null;
  /** Short public facts, each one read from the record. */
  readonly facts: readonly string[];
}

export interface OrientationPartyCount {
  readonly partyOrganizationId: EntityId | null;
  /** True for members with no recorded party: style it, don't color it. */
  readonly noParty: boolean;
  readonly label: string;
  readonly members: number;
  /**
   * Fixed color slot for this party: its position in the save's permanent
   * party color order, never its rank in a chamber, so a party keeps its color between the
   * Senate and the House and when counts change. Members with no party take
   * the slot after the listed parties.
   */
  readonly slot: number;
}

export interface OrientationRosterRow {
  readonly seatKey: string;
  readonly seatLabel: string;
  readonly status: SeatView["occupant"]["kind"];
  readonly person: OrientationPerson | null;
}

export interface OrientationChamber {
  readonly chamberKey: ChamberView["chamberKey"];
  readonly title: string;
  readonly name: string;
  readonly seats: number;
  readonly members: number;
  readonly vacancies: number;
  readonly unrecorded: number;
  readonly parties: readonly OrientationPartyCount[];
  readonly roster: readonly OrientationRosterRow[];
}

export interface OrientationStep {
  readonly key: OrientationStepKey;
  readonly title: string;
  /** One short summary line; the rest is expandable. */
  readonly summary: string;
  readonly people: readonly OrientationPerson[];
  readonly chambers: readonly OrientationChamber[];
}

export interface OrientationView {
  readonly dateLabel: string;
  readonly steps: readonly OrientationStep[];
}

export function projectOrientationView(
  orientation: WorldOrientation,
  stateName: (usps: string) => string | null,
): OrientationView {
  const parties = new Map(
    orientation.parties.map((party) => [party.organizationId, party]),
  );
  const slots = new Map<EntityId | null, number>(
    (
      orientation.partyColorOrder ??
      orientation.parties.map((party) => party.organizationId)
    ).map((organizationId, index) => [organizationId, index]),
  );
  return {
    dateLabel: proseDate(orientation.asOf),
    steps: [
      executiveStep(orientation, parties),
      congressStep(orientation, parties, slots, stateName),
      stateStep(orientation, parties, stateName),
      localityStep(orientation, parties),
    ],
  };
}

function executiveStep(
  orientation: WorldOrientation,
  parties: ReadonlyMap<EntityId, PartyView>,
): OrientationStep {
  const president = orientation.executive.find(
    (holder) => holder.officeKey === "us-president",
  );
  return {
    key: "executive",
    title: "The White House",
    summary: president
      ? `${president.personName} is ${president.title}.`
      : "No president is recorded in this world.",
    people: orientation.executive.map((holder) => personFor(holder, parties)),
    chambers: [],
  };
}

function congressStep(
  orientation: WorldOrientation,
  parties: ReadonlyMap<EntityId, PartyView>,
  slots: ReadonlyMap<EntityId | null, number>,
  stateName: (usps: string) => string | null,
): OrientationStep {
  const congress = orientation.congress;
  if (!congress) {
    return {
      key: "congress",
      title: "Congress",
      summary: "This life's records do not include the membership of Congress.",
      people: [],
      chambers: [],
    };
  }
  const chambers = [congress.senate, congress.house].map((chamber) =>
    chamberFor(chamber, parties, slots, stateName),
  );
  return {
    key: "congress",
    title: "Congress",
    summary: chambers.map(chamberSummary).join(" "),
    people: [],
    chambers,
  };
}

function chamberFor(
  chamber: ChamberView,
  parties: ReadonlyMap<EntityId, PartyView>,
  slots: ReadonlyMap<EntityId | null, number>,
  stateName: (usps: string) => string | null,
): OrientationChamber {
  return {
    chamberKey: chamber.chamberKey,
    title: chamber.chamberKey === "us-senate" ? "Senate" : "House",
    name: chamber.name,
    seats: chamber.totals.seats,
    members: chamber.totals.members,
    vacancies: chamber.totals.vacancies,
    unrecorded: chamber.totals.noCurrentRecord,
    parties: [...chamber.totals.byParty]
      .map((entry) => ({
        partyOrganizationId: entry.partyOrganizationId,
        noParty: entry.partyOrganizationId === null,
        label: entry.partyOrganizationId
          ? (parties.get(entry.partyOrganizationId)?.name ?? "Another party")
          : "No party",
        members: entry.members,
        slot:
          (entry.partyOrganizationId
            ? slots.get(entry.partyOrganizationId)
            : undefined) ?? slots.size,
      }))
      .sort(
        (left, right) =>
          right.members - left.members || left.label.localeCompare(right.label),
      ),
    roster: chamber.seats.map((seat) => ({
      seatKey: seat.seatKey,
      seatLabel: seatLabel(seat, stateName),
      status: seat.occupant.kind,
      person:
        seat.occupant.kind === "member"
          ? personFor(seat.occupant.member, parties)
          : null,
    })),
  };
}

function countPhrase(count: number, one: string, many: string): string | null {
  if (count <= 0) return null;
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

function chamberSummary(chamber: OrientationChamber): string {
  const parts = [
    ...chamber.parties
      .filter((entry) => entry.members > 0)
      .map((entry) => `${entry.members} ${entry.label}`),
    countPhrase(chamber.vacancies, "vacant seat", "vacant seats"),
    countPhrase(
      chamber.unrecorded,
      "seat with no recorded holder",
      "seats with no recorded holder",
    ),
  ].filter((part): part is string => part !== null);
  return `${chamber.title}: ${parts.join(", ")}.`;
}

/** Census congressional code for the DC delegate and PR commissioner. */
const NON_VOTING_DISTRICT = "98";

/** Places with a House seat code that are not states and have no governor. */
const NON_STATE_NAMES: Readonly<Record<string, string>> = {
  DC: "District of Columbia",
  PR: "Puerto Rico",
};

function placeName(
  usps: string,
  stateName: (usps: string) => string | null,
): string {
  return stateName(usps) ?? NON_STATE_NAMES[usps] ?? usps;
}

function seatLabel(
  seat: SeatView,
  stateName: (usps: string) => string | null,
): string {
  const state = placeName(seat.stateUsps, stateName);
  if (seat.district === null) return state;
  if (seat.district === NON_VOTING_DISTRICT) {
    return seat.stateUsps === "PR"
      ? `${state}, Resident Commissioner`
      : `${state}, Delegate`;
  }
  if (seat.district === "00") return `${state}, at large`;
  return `${state}, district ${Number(seat.district)}`;
}

function stateStep(
  orientation: WorldOrientation,
  parties: ReadonlyMap<EntityId, PartyView>,
  stateName: (usps: string) => string | null,
): OrientationStep {
  const home = orientation.homeState;
  if (home?.stateUsps === "DC") {
    return districtOfColumbiaStep(orientation, parties);
  }
  const name = home ? placeName(home.stateUsps, stateName) : null;
  const governor = home?.governor ?? null;
  return {
    key: "state",
    title: name ?? "Your state",
    summary: governor
      ? `${governor.personName} is ${governor.title}.`
      : name
        ? `No governor is recorded for ${name}.`
        : "This life's records do not name a home state.",
    people: governor ? [personFor(governor, parties)] : [],
    chambers: [],
  };
}

/**
 * The District is not a state and has no governor. It is governed by its Mayor
 * and Council and sends a Delegate to the House; this step names whoever the
 * records hold for those offices and says plainly when they hold nobody.
 */
function districtOfColumbiaStep(
  orientation: WorldOrientation,
  parties: ReadonlyMap<EntityId, PartyView>,
): OrientationStep {
  const localHolders = (orientation.locality?.governments ?? []).flatMap(
    (government) => government.holders,
  );
  const delegates = (orientation.congress?.house.seats ?? []).flatMap((seat) =>
    seat.stateUsps === "DC" &&
    (seat.district === NON_VOTING_DISTRICT || seat.district === "00") &&
    seat.occupant.kind === "member"
      ? [seat.occupant.member]
      : [],
  );
  const mayor = localHolders.find((holder) =>
    "source" in holder
      ? holder.source.role === "mayor"
      : /mayor/i.test(holder.title),
  );
  const council = localHolders.filter((holder) =>
    "source" in holder
      ? holder.source.role === "member" ||
        holder.source.role === "presiding-member"
      : /council/i.test(holder.title),
  );
  const delegate = delegates[0] ?? null;
  const parts = [
    "The District of Columbia is not a state and has no governor. A Mayor and the Council of the District of Columbia govern it, and it elects a Delegate to the U.S. House of Representatives.",
    mayor
      ? `${mayor.personName} is ${mayor.title}.`
      : "No current record names the Mayor.",
    council.length > 0
      ? `The records name ${joinNames(council.map((holder) => holder.personName))} on the Council.`
      : "No current record names the members of the Council.",
    delegate
      ? `${delegate.personName} is the Delegate to the U.S. House.`
      : "No current record names the Delegate to the U.S. House.",
  ];
  return {
    key: "state",
    title: "District of Columbia",
    summary: parts.join(" "),
    people: [
      ...(mayor ? [mayor] : []),
      ...council,
      ...(delegate ? [delegate] : []),
    ].map((holder) => personFor(holder, parties)),
    chambers: [],
  };
}

function localityStep(
  orientation: WorldOrientation,
  parties: ReadonlyMap<EntityId, PartyView>,
): OrientationStep {
  const locality = orientation.locality;
  const place = locality?.name ?? null;
  const governments = locality?.governments ?? [];
  const names = governments.map((government) => government.name);
  return {
    key: "locality",
    title: place ?? "Where you live",
    summary:
      names.length === 0
        ? place
          ? `No local government is recorded for ${place}.`
          : "This life's records do not name a local government."
        : place
          ? `${place} is served by ${joinNames(names)}.`
          : `You are served by ${joinNames(names)}.`,
    // Only holders the record names; an office with nobody recorded shows nobody.
    people: governments.flatMap((government) =>
      government.holders.map((holder) => personFor(holder, parties)),
    ),
    chambers: [],
  };
}

function personFor(
  holder: OrientationHolderDisplay,
  parties: ReadonlyMap<EntityId, PartyView>,
): OrientationPerson {
  const facts: string[] = [];
  if (holder.serviceSince)
    facts.push(`In office since ${proseDate(holder.serviceSince)}`);
  if (holder.endExclusive)
    facts.push(`Term runs until ${proseDate(holder.endExclusive)}`);
  if (holder.residenceLabel) facts.push(`Lives in ${holder.residenceLabel}`);
  return {
    personId: holder.personId,
    name: holder.personName,
    title: holder.title,
    party: holder.partyOrganizationId
      ? (parties.get(holder.partyOrganizationId)?.name ?? null)
      : null,
    facts,
  };
}

function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}
