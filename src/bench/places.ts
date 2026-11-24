// "Go to": the town's places from its organizations and the art library,
// who works there, who's there now and what the player can do there.
import { personWorkOf } from "../core2/person-work";
import fundingData from "../core2/data/opening-income-funding.json" with { type: "json" };
import { ageOnDate } from "../core2/kernel/dates";
import { coreAPI, fillInPerson } from "../core2/state";
import { OFFICES_MODULE_ID, townSeats } from "../core2/modules/offices";
import { upcomingMeeting } from "../core2/modules/office-day";
import { workSpansOnDateV1 } from "../core2/work-spans-v1";
import { organizationName } from "../director/words";
import { backdropStaging } from "./staging";
import { backdropFor, homeOf, orgPlace, staffOf, peopleHere } from "./scene";
import { isOnShift } from "./shift";
import { hasBackdrop } from "./backdrop-places";
import type { PlayerPacketV1 } from "../core2/player-v1";
import type { CoreState } from "../core2/types";

// Engineering page size for the list, not a model value.
const LISTED = 40;
// Engineering sizes for a card's "who is there" line and the default hour.
const PRESENT_NAMED = 2;
const NOON = 12 * 60;

/**
 * The organization records that only move money (the retirement paying
 * accounts and the outside payment flow), named by the one data file that
 * makes them. They have no building and no staff, so they are not places a
 * player can go.
 */
export const PAYER_RECORD_CLASSIFICATIONS: ReadonlySet<string> = new Set([
  ...fundingData.eligiblePayerClassifications,
  fundingData.contributorClassification,
]);

/** And the state's offices, where an officeholder's work takes them. */
const STATE_OFFICES = new Set(["sector:state-government-office"]);
/** Schools, where a household with a child of school age has business. */
const SCHOOLS = new Set([
  "service:school",
  "service:public-school",
  "service:private-school",
]);
// Engineering count: the town's biggest workplaces listed after the places tied to the player.
const BIGGEST_LISTED = 9;
/** Compulsory schooling ends by 18 in most states; high school runs through 18. */
const SCHOOL_AGE_UNDER = 19;
/** The ways a place is tied to the player's work, closest first. */
const WORK_TIES = ["work", "family", "known"] as const;

/**
 * The town's pictured places the player has a reason to go: where they,
 * their household or their family work, the schools while someone at home is
 * of school age, where people they know work, where they can do something
 * right now, and the state's offices while they hold an office. Each says
 * why it is listed. A town office is not listed on being a civic office
 * alone (owner, Oct 26: "Why have to travel ... Public Works Department?");
 * the offices that take the player's filings are their own cards. Not every
 * organization with a picture (owner, Oct 13: "Why would you need to visit
 * the market?").
 */
/** The levels of a body that meets at its town's or county's own office. */
const LOCAL_BODIES = new Set([
  "city",
  "town",
  "village",
  "township",
  "borough",
  "county",
]);

/**
 * The town's and county's offices the player has business at, by the
 * government's name (the office record names it; its organization carries
 * the same name, and may sit in the town's own jurisdiction rather than the
 * census place the player lives in, as a New England town does), each with
 * the records that are the reasons: the seat they hold on its body ("seat"),
 * their own body meeting today ("ownMeeting"), or another body's meeting
 * today ("meeting").
 */
type CivicReason = {
  kind: "seat" | "ownMeeting" | "meeting";
  recordId: string;
};
function civicBusiness(
  core: CoreState,
  playerId: string,
): Map<string, CivicReason[]> {
  const api = coreAPI(core);
  const business = new Map<string, CivicReason[]>();
  const seats = townSeats(api).filter(({ office }) => {
    return !!office.governmentName && LOCAL_BODIES.has(office.level);
  });
  // The bodies the player sits on.
  const sitsOn = new Set<string>();
  for (const { office, seat, holder } of seats) {
    if (holder?.personId !== playerId) continue;
    sitsOn.add(office.id);
    const government = office.governmentName!.toLowerCase();
    const reasons = business.get(government) ?? [];
    reasons.push({ kind: "seat", recordId: seat.id });
    business.set(government, reasons);
  }
  // A body that meets today: for its own member, "your board meets today".
  const counted = new Set<string>();
  for (const { office } of seats) {
    if (counted.has(office.id) || office.seats <= 1) continue;
    counted.add(office.id);
    const meeting = upcomingMeeting(api, office.id);
    if (!meeting || meeting.date !== core.date) continue;
    const government = office.governmentName!.toLowerCase();
    const reasons = business.get(government) ?? [];
    reasons.push({
      kind: sitsOn.has(office.id) ? "ownMeeting" : "meeting",
      recordId: `${office.id}:${meeting.date}`,
    });
    business.set(government, reasons);
  }
  return business;
}

/**
 * Why a place is on Travel's list, each kind worded by its control label
 * (`travel.reasons` in src/bench/data/controls.json): a tie to the
 * player, civic business, or, for a place with no tie, one of the town's
 * biggest workplaces ("large").
 */
type PlaceReason = {
  kind:
    | CivicReason["kind"]
    | (typeof WORK_TIES)[number]
    | "study"
    | "studySelf"
    | "action"
    | "serve"
    | "member"
    | "large";
  recordId: string;
};

/** A party's office: listed for its members (play-join-a-party-has-no-scene-and-no-headquarters). */
const PARTY_OFFICE = "membership:political-party";

export function townPlaces(
  core: CoreState,
  playerId: string,
  packet?: PlayerPacketV1,
) {
  const player = core.people.get(playerId);
  if (!player) throw new Error("No such person.");
  const offers = packet?.kind === "choice" ? packet.offers : [];
  const minute = packet?.at.minuteOfDay ?? NOON;
  // Where the player, their household and their family work.
  const household = core.households.get(player.householdId)?.memberIds ?? [
    playerId,
  ];
  // By the one reader of what a person does (`personWorkOf`), which the card
  // and the journal tell too: their job's employer and each seat's own.
  const ownWork = new Set(
    [...household, ...player.familyIds].flatMap((id) => {
      const work = personWorkOf(core, id);
      return [
        work.job?.organizationId,
        ...work.offices.map((office) => office.organizationId),
      ].filter((org): org is string => !!org);
    }),
  );
  const ownJob = player.jobId
    ? core.jobs.get(player.jobId)?.organizationId
    : undefined;
  // Where they study: the town's schools while anyone at home is of school age.
  const studying = household.some((id) => {
    const birth = core.people.get(id)?.birthDate;
    return (
      birth !== undefined && ageOnDate(birth, core.date) < SCHOOL_AGE_UNDER
    );
  });
  const playerStudies =
    ageOnDate(player.birthDate, core.date) < SCHOOL_AGE_UNDER;
  // Where the player has political business by the records
  // (play-travel-in-a-village-lists-no-town-office): the town's or county's
  // office, while they hold a seat on its body or its body meets today.
  // An office listed only for being an office stays out (owner, Oct 26).
  const civic = civicBusiness(core, playerId);
  const official = coreAPI(core)
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .query("byPerson", [playerId])
    .some((row) => (row as { status?: string }).status === "serving");
  const rows = [...core.organizations.values()]
    .filter(
      (org) =>
        org.placeId === player.placeId || civic.has(org.name.toLowerCase()),
    )
    .flatMap((org) => {
      // A payer record (the town's retirement-income paying account) holds
      // money, not a building: never a place to go (owner, Nov 16:
      // "Grano, North Dakota retirement-income paying account" was listed).
      if (PAYER_RECORD_CLASSIFICATIONS.has(org.classification ?? "")) return [];
      const place = orgPlace(core, org.id);
      if (!place || !hasBackdrop(place)) return [];
      const { full, counted } = staffOf(core, org.id);
      const known = full.filter((id) => player.knownIds.has(id));
      const actions = offers
        .filter((offer) => offer.targetId === org.id)
        .map((offer) => offer.actionId);
      const reasons: PlaceReason[] = [
        // "You work here" only where the player works; a relative's
        // workplace says so.
        ...(ownWork.has(org.id)
          ? [
              {
                kind:
                  ownJob === org.id ? ("work" as const) : ("family" as const),
                recordId: org.id,
              },
            ]
          : []),
        ...(studying && SCHOOLS.has(org.classification ?? "")
          ? [
              {
                kind: playerStudies
                  ? ("studySelf" as const)
                  : ("study" as const),
                recordId: org.id,
              },
            ]
          : []),
        ...known.map((id) => ({ kind: "known" as const, recordId: id })),
        ...actions.map((actionId) => ({
          kind: "action" as const,
          recordId: actionId,
        })),
        ...(official && STATE_OFFICES.has(org.classification ?? "")
          ? [{ kind: "serve" as const, recordId: org.id }]
          : []),
        ...(civic.get(org.name.toLowerCase()) ?? []),
        // The office of a party the player belongs to (their membership record).
        ...(core.memberships.has(`${playerId}:${org.id}`) &&
        org.classification === PARTY_OFFICE
          ? [{ kind: "member" as const, recordId: org.id }]
          : []),
      ];
      // A place with no tie to the player is listed only as one of the
      // town's biggest workplaces, picked below from the records.
      // One work tie, the closest: you, then your family, then people you know.
      const closest = WORK_TIES.find((kind) =>
        reasons.some((r) => r.kind === kind),
      );
      const listed = reasons.filter(
        (r) =>
          !(WORK_TIES as readonly string[]).includes(r.kind) ||
          r.kind === closest,
      );
      // Who is at work there now, by their own work spans.
      const here = full
        .filter((id) => id !== playerId)
        .filter((id) => isOnShift(core, id, minute, org.id));
      return [
        {
          organizationId: org.id,
          kindOfWork: org.classification ?? "",
          name: organizationName(org),
          place,
          staff: full.length + counted.length,
          known: known.map((id) => {
            const row = core.people.get(id)!;
            return {
              personId: id,
              name: `${row.givenName} ${row.familyName}`,
            };
          }),
          // What the player can do there right now: the core's own offers.
          actions,
          reasons: listed,
          presentNames: here.slice(0, PRESENT_NAMED).map((id) => {
            const row = core.people.get(id)!;
            return `${row.givenName} ${row.familyName}`;
          }),
          presentCount: here.length,
          presentation: { imageUrl: backdropFor(core, place, minute).url },
        },
      ];
    });
  const byStaff = (a: (typeof rows)[number], b: (typeof rows)[number]) =>
    b.staff - a.staff || a.name.localeCompare(b.name);
  const tied = rows
    .filter((row) => row.reasons.length > 0)
    .sort(
      (a, b) =>
        b.known.length - a.known.length ||
        b.actions.length - a.actions.length ||
        Number(b.presentCount > 0) - Number(a.presentCount > 0) ||
        byStaff(a, b),
    );
  // Then the town's biggest workplaces across every kind of work: each kind's
  // largest employer first, then each kind's next, by headcount from the
  // organization and job records (owner, Nov 16: "places tied to you first,
  // then the town's biggest workplaces across every kind of work").
  const kinds = new Map<string, typeof rows>();
  for (const row of rows.filter((r) => r.reasons.length === 0).sort(byStaff))
    kinds.set(row.kindOfWork, [...(kinds.get(row.kindOfWork) ?? []), row]);
  const queues = [...kinds.values()].sort((a, b) => byStaff(a[0]!, b[0]!));
  const biggest: typeof rows = [];
  for (let round = 0; biggest.length < BIGGEST_LISTED; round += 1) {
    const next = queues.map((queue) => queue[round]).filter((r) => !!r);
    if (!next.length) break;
    for (const row of next)
      if (biggest.length < BIGGEST_LISTED)
        biggest.push({
          ...row,
          reasons: [{ kind: "large", recordId: row.organizationId }],
        });
  }
  return [...tied, ...biggest].slice(0, LISTED);
}

/**
 * The minute spans one person is at work on a date, from their own work
 * records (the ones that decide who is there now); empty on a day off, and
 * null where the records hold no hours for them.
 */
export function workSpansOf(
  core: CoreState,
  personId: string,
  date: string,
): { startMinute: number; endMinute: number }[] | null {
  try {
    return workSpansOnDateV1(coreAPI(core), {
      controlledPersonId: personId,
      date,
    }).owners.flatMap((owner) => owner.spans);
  } catch {
    return null;
  }
}

/** Look in on a place: its picture at this hour and whoever is working there. */
export function visitPlace(
  core: CoreState,
  playerId: string,
  organizationId: string,
  minute: number,
  /** Someone the player came to see, there by `whereIs`: always in the room. */
  visitedId?: string,
) {
  const org = core.organizations.get(organizationId);
  const place = orgPlace(core, organizationId);
  if (!org || !place || !hasBackdrop(place))
    throw new Error("That place has no picture.");
  const { full, counted } = staffOf(core, organizationId);
  // Two-level world: staff still in the counts are met here, so they are
  // filled in (OPUS-CORE's fillInPerson), up to the room's spots.
  const room = (backdropStaging(place)?.spots.length ?? 1) - 1;
  const met = counted.slice(0, Math.max(room - full.length, 0));
  for (const id of met) fillInPerson(core, id);
  const onShift = [...full, ...met.filter((id) => core.people.has(id))]
    .filter((id) => isOnShift(core, id, minute, organizationId))
    .filter((id) => id !== playerId && id !== visitedId);
  // The one the player came to see stands first, so the room's spots never
  // leave them out.
  const present = [
    ...(visitedId && core.people.has(visitedId) ? [visitedId] : []),
    ...onShift,
  ];
  const ids = [playerId, ...present].map((id) => {
    const row = core.people.get(id)!;
    return {
      id,
      name: `${row.givenName} ${row.familyName}`,
      reason: id === playerId ? ("you" as const) : ("coworker" as const),
    };
  });
  const backdrop = backdropFor(core, place, minute);
  return {
    organizationId,
    name: organizationName(org),
    place,
    backdrop,
    names: Object.fromEntries(ids.map((row) => [row.id, row.name])),
    ...peopleHere(core, backdrop.file, ids),
  };
}

/**
 * The player at someone's home: the room as it stands at this minute, the
 * host and whoever lives there who is not out on a shift. The visit's
 * counterpart of `visitPlace`, with the same shape, so the screen draws both
 * with one renderer. The room is the household's daytime room whatever the
 * hour: a guest is not shown into a bedroom.
 */
export function visitHome(
  core: CoreState,
  playerId: string,
  hostId: string,
  minute: number,
) {
  const host = core.people.get(hostId);
  if (!host) throw new Error("No such person.");
  const place = homeOf(core, hostId, NOON);
  const members = (core.households.get(host.householdId)?.memberIds ?? [])
    .filter((id) => id !== playerId)
    .filter((id) => core.people.get(id)?.alive)
    .filter((id) => id === hostId || !isOnShift(core, id, minute));
  const ids = [
    {
      id: playerId,
      name: nameOf(core, playerId),
      reason: "you" as const,
    },
    ...members.map((id) => ({
      id,
      name: nameOf(core, id),
      reason: id === hostId ? ("act" as const) : ("household" as const),
    })),
  ];
  const backdrop = backdropFor(core, place, minute, hostId);
  return {
    hostId,
    name: nameOf(core, hostId),
    place,
    backdrop,
    names: Object.fromEntries(ids.map((row) => [row.id, row.name])),
    ...peopleHere(core, backdrop.file, ids),
  };
}

const nameOf = (core: CoreState, id: string) => {
  const row = core.people.get(id)!;
  return `${row.givenName} ${row.familyName}`;
};
