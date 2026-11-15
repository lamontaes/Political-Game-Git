// "Go to": the town's places from its organizations and the art library,
// who works there, who's there now and what the player can do there.
import { personWorkOf } from "../core2/person-work";
import { ageOnDate } from "../core2/kernel/dates";
import { coreAPI, fillInPerson } from "../core2/state";
import { OFFICES_MODULE_ID, townSeats } from "../core2/modules/offices";
import { upcomingMeeting } from "../core2/modules/office-day";
import { COVERAGE_MODULE_ID } from "../core2/modules/coverage";
import { JOBS_MODULE_ID } from "../core2/modules/jobs";
import { HOUSING_MODULE_ID } from "../core2/modules/housing";
import { medicalBillOf } from "../core2/medical-bills";
import { workSpansOnDateV1 } from "../core2/work-spans-v1";
import { organizationName } from "../director/words";
import { backdropStaging } from "./staging";
import { backdropFor, orgPlace, staffOf, peopleHere } from "./scene";
import { isOnShift } from "./shift";
import { hasBackdrop } from "./backdrop-places";
import type { PlayerPacketV1 } from "../core2/player-v1";
import type { CoreState } from "../core2/types";

// Engineering page size for the list, not a model value.
const LISTED = 40;
// Engineering sizes for a card's "who is there" line and the default hour.
const PRESENT_NAMED = 2;
const NOON = 12 * 60;

/** And the state's offices, where an officeholder's work takes them. */
const STATE_OFFICES = new Set(["sector:state-government-office"]);
/** Schools, where a household with a child of school age has business. */
const SCHOOLS = new Set([
  "service:school",
  "service:public-school",
  "service:private-school",
]);
/**
 * Places anyone may walk into: where a player with no job, school or friends
 * still has somewhere to go. Listed after the places the player has a reason
 * for, so Travel always lists somewhere (owner, Oct 27: "Travel always lists
 * where the player can go, with what is open now").
 */
const PUBLIC_PLACES = new Set([
  "diner",
  "diner-counter",
  "coffee-shop",
  "tavern",
  "grocery-store",
  "general-store",
  "store",
  "gas-station-store",
  "hardware-store-interior",
  "pharmacy-counter",
  "barbershop",
  "public-library",
  "post-office",
  "church-sanctuary",
  "church-exterior",
  "park",
  "farmers-market",
]);
// Engineering count: public places listed when the player's own reasons are few.
const PUBLIC_FILL = 9;
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

/** A record that is a reason to go somewhere: its kind and the record's id. */
type Reason = {
  kind: "patient" | "patientSelf" | "relativeLives";
  recordId: string;
};
/** Reasons that list a place on their own; an opening only orders the fill. */
const FILL_ONLY = new Set(["hiring"]);

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
  const api = coreAPI(core);
  // The household's latest medical bill: the provider it paid, for each member billed.
  const treatedAt = new Map<string, Reason[]>();
  const bill = api.state.modules.has(COVERAGE_MODULE_ID)
    ? medicalBillOf(api, COVERAGE_MODULE_ID, player.householdId)
    : undefined;
  if (bill?.sellerId)
    for (const member of bill.members)
      if (member.billMinor > 0 && household.includes(member.personId)) {
        const kind =
          member.personId === playerId
            ? ("patientSelf" as const)
            : ("patient" as const);
        const list = treatedAt.get(bill.sellerId) ?? [];
        if (!list.some((r) => r.kind === kind))
          list.push({ kind, recordId: bill.id });
        treatedAt.set(bill.sellerId, list);
      }
  // The institutions that house a relative's room (a nursing home).
  const housedAt = new Map<string, Reason[]>();
  if (api.state.modules.has(HOUSING_MODULE_ID)) {
    const dwellings = api.moduleState(HOUSING_MODULE_ID).table("dwellings");
    for (const id of player.familyIds) {
      const home = core.people.get(id)?.householdId;
      const row = home
        ? (dwellings.get(`dwelling:${home}`) as
            { id: string; institutionId?: string } | undefined)
        : undefined;
      if (row?.institutionId && !housedAt.has(row.institutionId))
        housedAt.set(row.institutionId, [
          { kind: "relativeLives", recordId: row.id },
        ]);
    }
  }
  // An employer's first opening standing open, from the jobs engine.
  const positions = api.state.modules.has(JOBS_MODULE_ID)
    ? api.moduleState(JOBS_MODULE_ID).table("positions")
    : undefined;
  const hiring = (orgId: string) =>
    (
      positions?.query("byEmployerStatus", [orgId, "open"])[0] as
        { id: string } | undefined
    )?.id;
  return (
    [...core.organizations.values()]
      .filter(
        (org) =>
          org.placeId === player.placeId || civic.has(org.name.toLowerCase()),
      )
      .flatMap((org) => {
        const place = orgPlace(core, org.id);
        if (!place || !hasBackdrop(place)) return [];
        const { full, counted } = staffOf(core, org.id);
        const known = full.filter((id) => player.knownIds.has(id));
        const actions = offers
          .filter((offer) => offer.targetId === org.id)
          .map((offer) => offer.actionId);
        const reasons = [
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
          // Where someone at home was treated: the household's latest medical bill paid this provider.
          ...(treatedAt.get(org.id) ?? []),
          // Where a relative lives: the institution that houses their room.
          ...(housedAt.get(org.id) ?? []),
          // Hiring: an opening of the jobs engine stands open there.
          ...(hiring(org.id)
            ? [{ kind: "hiring" as const, recordId: hiring(org.id)! }]
            : []),
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
        const open = PUBLIC_PLACES.has(place);
        // A business is a place of its kind (a clinic, a factory, an inn),
        // listed by the one-per-kind fill when it has no reason of its own.
        const kind = core.finance.businesses.get(org.id)?.kindId;
        if (!reasons.length && !open && !kind) return [];
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
            name: organizationName(org),
            place,
            ...(kind ? { kind } : {}),
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
      })
      .sort(
        (a, b) =>
          Number(listedFor(b)) - Number(listedFor(a)) ||
          b.known.length - a.known.length ||
          b.actions.length - a.actions.length ||
          Number(b.presentCount > 0) - Number(a.presentCount > 0) ||
          b.staff - a.staff ||
          a.name.localeCompare(b.name),
      )
      // Every place with a reason, then one place of each kind (a business's
      // kind, else its room) before a second of any, until the list has some.
      .map((row, at, all) => ({ row, turn: kindTurn(row, at, all) }))
      .sort((a, b) => a.turn - b.turn)
      .map(({ row }) => row)
      .filter(
        (row, at, all) =>
          listedFor(row) ||
          at < Math.max(PUBLIC_FILL, all.filter(listedFor).length),
      )
      .slice(0, LISTED)
  );
}

/** Whether a place is listed for a reason of its own (an opening alone only orders the fill). */
function listedFor(row: { reasons: readonly { kind: string }[] }): boolean {
  return row.reasons.some((r) => !FILL_ONLY.has(r.kind));
}

/**
 * A place's turn in the fill: places listed for a reason first, in order;
 * then the first place of each kind, then the second of each, and so on,
 * each round in the list's order. Ties keep the order (the sort is stable).
 */
function kindTurn(
  row: { reasons: readonly { kind: string }[]; kind?: string; place: string },
  at: number,
  all: readonly {
    reasons: readonly { kind: string }[];
    kind?: string;
    place: string;
  }[],
): number {
  if (listedFor(row)) return -1;
  const key = row.kind ?? row.place;
  return all
    .slice(0, at)
    .filter((other) => !listedFor(other) && (other.kind ?? other.place) === key)
    .length;
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
  const present = [...full, ...met.filter((id) => core.people.has(id))]
    .filter((id) => isOnShift(core, id, minute, organizationId))
    .filter((id) => id !== playerId);
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
