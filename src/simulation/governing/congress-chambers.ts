import {
  CONGRESS_COMMITTEE_BY_DOMAIN,
  US_CONGRESS_PACK_ID,
  US_CONGRESS_RULE_PACK,
} from "../congress-rule-pack";
import {
  procedureOnlyBlueprint,
  type LegislativeBlueprint,
  type SeatedBody,
  type SeatedMember,
} from "../legislation-scenarios";
import { projectCongress } from "../living-world/congress";
import type { ChamberKey } from "../living-world/contract";
import { activePartyUnitsAt } from "../living-world/party-registry";
import { addDays } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import type {
  EntityId,
  IsoDate,
  LegislativeMeasureRecord,
  World,
} from "../types";

/**
 * Congress as a seated legislature: the real members the save already holds
 * in each House, and the way a federal bill finds its committee.
 *
 * Kept apart from the clock and the intake so the clock can read a Congress
 * chamber without importing the code that files Congress's bills.
 */

const CHAMBER_FOR_PACK: Readonly<Record<string, ChamberKey>> = {
  house: "us-house",
  senate: "us-senate",
};

export function isCongressMeasure(measure: LegislativeMeasureRecord): boolean {
  return measure.rulePackId === US_CONGRESS_PACK_ID;
}

/** Each national party's key, by its organization id, as of today. */
export function nationalPartyKeys(world: World): ReadonlyMap<EntityId, string> {
  return new Map(
    activePartyUnitsAt(world, world.currentDate, { level: "national" }).map(
      (unit) => [unit.organizationId, unit.partyKey] as const,
    ),
  );
}

/**
 * One House of Congress, seated with the people the save records in it
 * today. Vacant seats are not members; they lower the count, as a vacancy
 * does. Null for a save whose Congress was never seated.
 */
type SeatedCongress = { readonly body: SeatedBody; readonly seats: number };

// A world is immutable, so the chambers seated in it are too. One legislative
// step reads them several times over (who sits, each member's party, whether
// the chamber is seated at all); projecting Congress each time was most of the
// cost of a sitting.
const SEATED_BY_WORLD = new WeakMap<
  World,
  Map<string, SeatedCongress | null>
>();

// Seating held fixed for the length of one sitting. Taking a step on a bill
// records actions and votes; it never seats or unseats a member, so the
// chambers read at the start of a sitting are the chambers all day.
let pinnedSeating: Map<string, SeatedCongress | null> | null = null;

/** Runs `fn` with each House seated once, as it stands in `world`. */
export function withSittingSeating<T>(world: World, fn: () => T): T {
  const outer = pinnedSeating;
  pinnedSeating = new Map(
    ["house", "senate"].map((key) => [key, seatCongressChamber(world, key)]),
  );
  try {
    return fn();
  } finally {
    pinnedSeating = outer;
  }
}

export function seatedCongressChamber(
  world: World,
  chamberKey: string,
): SeatedCongress | null {
  if (pinnedSeating?.has(chamberKey)) return pinnedSeating.get(chamberKey)!;
  let cached = SEATED_BY_WORLD.get(world);
  if (!cached) {
    cached = new Map();
    SEATED_BY_WORLD.set(world, cached);
  }
  if (cached.has(chamberKey)) return cached.get(chamberKey)!;
  const seated = seatCongressChamber(world, chamberKey);
  cached.set(chamberKey, seated);
  return seated;
}

function seatCongressChamber(
  world: World,
  chamberKey: string,
): SeatedCongress | null {
  const congressChamber = CHAMBER_FOR_PACK[chamberKey];
  if (!congressChamber) return null;
  const congress = projectCongress(world);
  if (!congress) return null;
  const view =
    congressChamber === "us-house" ? congress.house : congress.senate;
  const parties = nationalPartyKeys(world);
  const members: SeatedMember[] = [];
  for (const seat of view.seats) {
    if (seat.occupant.kind !== "member") continue;
    const member = seat.occupant.member;
    const partyKey = member.partyOrganizationId
      ? (parties.get(member.partyOrganizationId) ?? null)
      : null;
    members.push({
      memberKey: `${US_CONGRESS_PACK_ID}:${chamberKey}:${seat.seatKey}`,
      name: member.personName,
      personId: member.personId,
      caucusLabel: partyKey
        ? `${partyKey.charAt(0).toUpperCase()}${partyKey.slice(1)}`
        : "No party",
      partyKey,
    });
  }
  const chamberRule = US_CONGRESS_RULE_PACK.chambers.find(
    (entry) => entry.chamberKey === chamberKey,
  )!;
  return {
    seats: view.seats.length,
    body: { chamberKey, chamberName: chamberRule.name, members },
  };
}

/**
 * The procedure a Congress bill runs under. Congress has no written bills in
 * the authored bank: every federal bill is filed by a member in play, so the
 * blueprint carries procedure only and no vote counts at all.
 */
export function congressBlueprint(world: World): LegislativeBlueprint {
  return procedureOnlyBlueprint({
    scenarioKey: `institution:${US_CONGRESS_PACK_ID}`,
    pack: US_CONGRESS_RULE_PACK,
    context: {
      jurisdiction: NATIONAL_ELECTION_JURISDICTION,
      initialMoment: world.currentMoment,
      creationSummary: "Legislative work in the Congress of the United States.",
      goalScope: "United States",
      householdLocationLabel: "Washington, D.C.",
    },
    governorRationale:
      "The President decides a bill on the desk; no disposition is written in advance.",
  });
}

/**
 * The federal issue a Congress bill is about.
 *
 * TEMPORARY: read from the bill's stable key, which the intake writes as
 * `congress-intake/v1:<issue key>:…`. The Legislation thread is adding a
 * field for the policy question a bill answers; this switches to it then.
 */
export function federalIssueOfMeasure(
  measure: LegislativeMeasureRecord,
): string | null {
  const match = /^congress-intake\/v1:([a-z-]+\.[a-z-]+):/.exec(
    measure.stableKey,
  );
  return match ? match[1]! : null;
}

/**
 * The committee a Congress bill is referred to, by its policy field. Null
 * for a bill that is not a Congress bill or names no field, so the caller
 * keeps its own default.
 */
export function congressReferralCommittee(
  measure: LegislativeMeasureRecord,
  chamberKey: string,
): string | null {
  if (!isCongressMeasure(measure)) return null;
  const issue = federalIssueOfMeasure(measure);
  const domain = issue?.split(".")[0];
  const entry = domain ? CONGRESS_COMMITTEE_BY_DOMAIN[domain] : undefined;
  if (!entry) return null;
  return chamberKey === "house"
    ? entry.house
    : chamberKey === "senate"
      ? entry.senate
      : null;
}

export const COSPONSOR_EVENT = "legislation.measure-cosponsored" as const;

/** The members who signed on to a bill after its sponsor filed it. */
export function measureCosponsors(
  world: World,
  measureId: EntityId,
): readonly EntityId[] {
  const ids: EntityId[] = [];
  for (const event of world.history.events) {
    if (
      event.type !== COSPONSOR_EVENT ||
      !event.involvedEntityIds.includes(measureId)
    )
      continue;
    for (const participant of event.participants)
      if (participant.role === "agency:cosponsor")
        ids.push(participant.personId);
  }
  return ids;
}

/* ------------------------------------------------------------------ *
 * Sittings
 * ------------------------------------------------------------------ */

export const CONGRESS_SITTING_TRANSITION = "congress:sitting" as const;
const CONGRESS_SITTING_VERSION = "congress-sitting/v1";

/**
 * PLACEHOLDER (the game's calendar, not Congress's): Congress takes up its
 * bills on Tuesdays and Thursdays. Every open bill takes its next step at a
 * sitting, together, rather than each bill keeping a date of its own; with a
 * few dozen bills open at once that is the difference between a handful of
 * clock stops a month and several dozen.
 */
const SITTING_WEEKDAYS: readonly number[] = [2, 4];

function weekday(date: IsoDate): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function nextCongressSitting(after: IsoDate): IsoDate {
  let date = addDays(after, 1);
  while (!SITTING_WEEKDAYS.includes(weekday(date))) date = addDays(date, 1);
  return date;
}

/** Puts Congress's next sitting on the calendar, once. */
export function scheduleCongressSitting(world: World): World {
  const dueAt = nextCongressSitting(world.currentDate);
  const stableKey = `${CONGRESS_SITTING_VERSION}:${dueAt}`;
  if (world.history.futureDueItems.some((due) => due.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(ensureNationalElectionJurisdiction(world), {
    stableKey,
    dueAt,
    transitionKey: CONGRESS_SITTING_TRANSITION,
    entityIds: [NATIONAL_ELECTION_JURISDICTION.id],
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    provenance: {
      kind: "authored",
      note: "congress-sitting/v1: Congress takes up its open bills on Tuesdays and Thursdays. The game's calendar, not Congress's.",
    },
  });
}
