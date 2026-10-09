import type {
  EntityId,
  IsoDate,
  LawExposureRecord,
  World,
} from "../simulation";
import { recordById, recordsByStringField } from "../simulation/history-index";
import { lawExposuresOf } from "../simulation/law-exposure";
import {
  activeOrganizationParticipationsAt,
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  householdMembershipsAt,
  organizationProfileAt,
} from "../simulation/life-queries";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../simulation/life-places";
import { projectPublicMatters } from "../simulation/living-world/developments";
import { NATIONAL_ELECTION_JURISDICTION } from "../simulation/national-election-geography";
import {
  currentStateExecutiveHolders,
  homeStateUsps,
  stateExecutiveOffice,
} from "../simulation/nationwide-world/state-executives";
import { storyMomentsOf } from "../simulation/story/moments";
import { storyHousemates, storyThreadsOf } from "../simulation/story/threads";
import { currentPublicOfficeholders } from "./opening-officeholders";
import {
  projectGovernmentBrowser,
  type GovernmentEntry,
} from "./politics-government";

/**
 * The one thing each stop of the opening says about the player's life
 * (owner-approved opening redesign, October 8, 2026, 10:25 p.m.; the story
 * director supplies it, the English engine words it, the opening shows it).
 *
 * The opening moves from the country down to the player in six stops. Each
 * stop's line ties that stop to this life, so for each stop the director
 * picks the record that touches the life most closely: a law that reached
 * the player, the seat that represents them, the family member who matters
 * most to them, the record that put them where day one starts. Every pick
 * names its source records, and a stop with nothing on record says so with
 * the reason instead of inventing a tie. Nothing here is a sentence.
 *
 * Pure: reads the world, never writes or advances time.
 */

export const OPENING_STOPS = [
  "country",
  "representatives",
  "state",
  "town",
  "home",
  "you",
] as const;
export type OpeningStop = (typeof OPENING_STOPS)[number];

/** Someone the stop's one thing is about, with what the record calls them. */
export interface OpeningPerson {
  readonly personId: EntityId;
  /** A record key, such as `us-president`, `us-senate`, `parent` or `sharedHome`. */
  readonly role: string;
}

export interface OpeningOneThing {
  readonly stop: OpeningStop;
  /** What kind of record the one thing is, so the line can be worded for it. */
  readonly kind:
    | "law-reached-you"
    | "represents-you"
    | "town-matter"
    | "in-office"
    | "family-member"
    | "why-you-are-here";
  readonly people: readonly OpeningPerson[];
  /** Plain values from the records, for the line's slots. */
  readonly facts: Readonly<Record<string, string>>;
  readonly sourceRecordIds: readonly EntityId[];
}

/** A stop with nothing on record that ties it to this life. */
export interface OpeningNothing {
  readonly stop: OpeningStop;
  readonly kind: "none";
  /** For developers and the coverage count; never shown. */
  readonly reason: string;
}

export type OpeningStopThing = OpeningOneThing | OpeningNothing;

/* -------------------------------------------------------------------------- */
/* Laws that reached the player                                                */
/* -------------------------------------------------------------------------- */

type LawLevel = "country" | "state" | "town";

/** Which government made the law: the starting law's place, or the measure's. */
function lawLevel(world: World, measureId: EntityId): LawLevel | null {
  const starting = /^starting-law:([^:]+):/.exec(measureId);
  if (starting) return starting[1] === "US" ? "country" : "state";
  const measure = recordById(
    world.history.legislativeMeasures ?? [],
    measureId,
  );
  if (!measure) return null;
  if (measure.jurisdictionId === NATIONAL_ELECTION_JURISDICTION.id)
    return "country";
  return stateJurisdictionIds().has(measure.jurisdictionId) ? "state" : "town";
}

/** The 56 states' and territories' own jurisdictions. */
let stateIds: ReadonlySet<EntityId> | null = null;
function stateJurisdictionIds(): ReadonlySet<EntityId> {
  stateIds ??= new Set(
    lifePlaceStateIdentities().flatMap((entry) => {
      const id = stateJurisdictionForKey(entry.jurisdictionKey)?.id;
      return id ? [id] : [];
    }),
  );
  return stateIds;
}

/** How closely a law reached the player: their own money first, then family, a friend, the news. */
const RELATION_ORDER: readonly LawExposureRecord["relation"][] = [
  "own",
  "family",
  "friend",
  "news",
];

/** The share of a month's pay the law moved, when both are on record. */
function shareOfPay(exposure: LawExposureRecord): number {
  const amount = exposure.amount;
  const pay = exposure.monthlyPay;
  if (!amount || !pay || pay.minorUnits <= 0) return 0;
  if (amount.currency !== pay.currency) return 0;
  return Math.abs(amount.minorUnits) / pay.minorUnits;
}

/**
 * The law at this level that reached the player most closely: by how it
 * reached them, then by the share of their pay it moved, then the latest.
 */
function closestLaw(
  world: World,
  personId: EntityId,
  level: LawLevel,
): LawExposureRecord | null {
  const exposures = lawExposuresOf(world, personId).filter(
    (exposure) => lawLevel(world, exposure.measureId) === level,
  );
  return (
    [...exposures].sort(
      (left, right) =>
        RELATION_ORDER.indexOf(left.relation) -
          RELATION_ORDER.indexOf(right.relation) ||
        shareOfPay(right) - shareOfPay(left) ||
        right.sequence - left.sequence,
    )[0] ?? null
  );
}

function lawThing(
  stop: OpeningStop,
  exposure: LawExposureRecord,
  people: readonly OpeningPerson[],
): OpeningOneThing {
  const facts: Record<string, string> = {
    measureId: exposure.measureId,
    channel: exposure.channel,
    relation: exposure.relation,
    direction: exposure.direction,
  };
  if (exposure.amount)
    facts.amountMinorUnits = String(exposure.amount.minorUnits);
  if (exposure.amount) facts.currency = exposure.amount.currency;
  if (exposure.cadence) facts.cadence = exposure.cadence;
  if (exposure.viaPersonId) facts.viaPersonId = exposure.viaPersonId;
  return {
    stop,
    kind: "law-reached-you",
    people,
    facts,
    sourceRecordIds: [exposure.id, exposure.sourceRecordId],
  };
}

/* -------------------------------------------------------------------------- */
/* The stops                                                                   */
/* -------------------------------------------------------------------------- */

function officeholders(world: World, officeKeys: readonly string[]) {
  return currentPublicOfficeholders(world).filter((holder) =>
    officeKeys.includes(holder.officeKey),
  );
}

function country(world: World, personId: EntityId): OpeningStopThing {
  const people = officeholders(world, [
    "us-president",
    "us-vice-president",
  ]).map((holder) => ({ personId: holder.personId, role: holder.officeKey }));
  const law = closestLaw(world, personId, "country");
  if (law) return lawThing("country", law, people);
  // Without a federal law that reached them, the tie is who leads the country.
  const terms = officeholders(world, ["us-president", "us-vice-president"]);
  const president = terms.find((holder) => holder.officeKey === "us-president");
  if (president)
    return {
      stop: "country",
      kind: "in-office",
      people,
      facts: { office: president.officeKey, personId: president.personId },
      sourceRecordIds: terms.map((holder) => holder.termId),
    };
  return {
    stop: "country",
    kind: "none",
    reason:
      "No federal law has reached this life and no president is on record.",
  };
}

/** The seats that represent the player's home, at one level of government. */
function representationSeats(
  world: World,
  personId: EntityId,
  level: "federal" | "state",
) {
  const rows =
    projectGovernmentBrowser(world, personId, {}).representedBy ?? [];
  return rows
    .filter((row) => row.key.startsWith("us-") === (level === "federal"))
    .flatMap((row) =>
      row.holders.flatMap((holder) =>
        holder.personId && holder.status === "member"
          ? [{ row, personId: holder.personId }]
          : [],
      ),
    );
}

/**
 * The seat that represents the player most closely: the one whose term ends
 * first when the records say, since the player's vote reaches it soonest;
 * otherwise the seat elected by the player's own district before one elected
 * statewide, in the order the records list them.
 */
function representationThing(
  world: World,
  stop: OpeningStop,
  seats: ReturnType<typeof representationSeats>,
  extraPeople: readonly OpeningPerson[],
): OpeningOneThing {
  const terms = new Map(
    currentPublicOfficeholders(world).map((holder) => [
      holder.personId,
      holder,
    ]),
  );
  const ends = (id: EntityId): IsoDate | null =>
    terms.get(id)?.endExclusive ?? null;
  const first = [...seats].sort((left, right) => {
    const a = ends(left.personId);
    const b = ends(right.personId);
    if (a !== b) {
      if (a === null) return 1;
      if (b === null) return -1;
      return a < b ? -1 : 1;
    }
    return (
      Number(left.row.district === null) - Number(right.row.district === null)
    );
  })[0]!;
  const term = terms.get(first.personId);
  const facts: Record<string, string> = {
    office: first.row.key,
    personId: first.personId,
  };
  if (first.row.district) facts.district = first.row.district;
  if (term?.endExclusive) facts.termEnds = term.endExclusive;
  return {
    stop,
    kind: "represents-you",
    people: [
      ...extraPeople,
      ...seats.map((seat) => ({
        personId: seat.personId,
        role: seat.row.key,
      })),
    ],
    facts,
    sourceRecordIds: term ? [term.termId] : [],
  };
}

function representatives(world: World, personId: EntityId): OpeningStopThing {
  const seats = representationSeats(world, personId, "federal");
  if (seats.length === 0)
    return {
      stop: "representatives",
      kind: "none",
      reason: "No member of Congress is on record for this home.",
    };
  return representationThing(world, "representatives", seats, []);
}

function state(world: World, personId: EntityId): OpeningStopThing {
  const usps = homeStateUsps(world, personId);
  const office = usps ? stateExecutiveOffice(usps) : null;
  const people = currentStateExecutiveHolders(world)
    .filter((holder) => holder.officeKey === office?.officeKey)
    .map((holder) => ({ personId: holder.personId, role: holder.officeKey }));
  const law = closestLaw(world, personId, "state");
  if (law) return lawThing("state", law, people);
  // Without a state law that reached them, the tie is the player's own
  // legislators: the seats their district elects.
  const seats = representationSeats(world, personId, "state");
  if (seats.length > 0)
    return representationThing(world, "state", seats, people);
  return {
    stop: "state",
    kind: "none",
    reason:
      "No state law has reached this life and no state legislator is on record for this home.",
  };
}

/** Who heads a town, first to last: its mayor, the member who presides, the members. */
const TOWN_ROLE_ORDER: readonly string[] = [
  "leader:municipal-mayor",
  "leader:municipal-presiding-member",
  "leader:municipal-member",
];

/**
 * The people seated in the town's government now, each with the role and the
 * seat record that says so, its head first.
 */
function townSeats(world: World, entries: readonly GovernmentEntry[]) {
  const ids = new Set<EntityId>();
  for (const entry of entries) {
    if (entry.holderPersonId) ids.add(entry.holderPersonId);
    for (const seat of entry.roster ?? [])
      if (seat.holderPersonId) ids.add(seat.holderPersonId);
  }
  const rank = (role: string) => {
    const index = TOWN_ROLE_ORDER.indexOf(role);
    return index === -1 ? TOWN_ROLE_ORDER.length : index;
  };
  return [...ids]
    .flatMap((id) => {
      const seat = activeOrganizationParticipationsAt(world, id).find((entry) =>
        entry.state.roleKind?.startsWith("leader:municipal"),
      );
      return seat?.state.roleKind
        ? [
            {
              personId: id,
              role: seat.state.roleKind,
              participationId: seat.participation.id,
            },
          ]
        : [];
    })
    .sort((left, right) => rank(left.role) - rank(right.role));
}

/** The town's open business, or a town law that reached the player. */
function town(world: World, personId: EntityId): OpeningStopThing {
  const law = closestLaw(world, personId, "town");
  if (law) return lawThing("town", law, []);
  // The same open local business the town's opening reads (opening-story.ts).
  const matter = projectPublicMatters(world)
    .filter((entry) => entry.family === "local-matter" && !entry.concluded)
    .at(-1);
  if (matter)
    return {
      stop: "town",
      kind: "town-matter",
      people: [],
      facts: { matterId: matter.matterId, stage: matter.stage },
      sourceRecordIds: [matter.latestEventId],
    };
  // Without either, the tie is the government of the place the player lives,
  // and who holds its seats now.
  const view = projectGovernmentBrowser(world, personId, { scope: "local" });
  const seated = townSeats(world, [
    ...view.branches.flatMap((branch) => branch.entries),
    ...view.localGovernments,
  ]);
  const head = seated[0];
  if (head)
    return {
      stop: "town",
      kind: "in-office",
      people: seated.map((seat) => ({
        personId: seat.personId,
        role: seat.role,
      })),
      facts: {
        ...(view.governs ? { government: view.governs } : {}),
        office: head.role,
        personId: head.personId,
      },
      sourceRecordIds: seated.map((seat) => seat.participationId),
    };
  // A place with no government of its own is run by the county that serves
  // it, as the Census Bureau's government records list it.
  const county = view.alsoGoverning[0];
  if (county)
    return {
      stop: "town",
      kind: "in-office",
      people: [],
      facts: {
        government: county.title,
        governmentKey: county.key,
        ...(view.governs ? { servesPlace: view.governs } : {}),
      },
      sourceRecordIds: [],
    };
  return {
    stop: "town",
    kind: "none",
    reason:
      "No town law, open town business, town officeholder or serving county is on record for this home.",
  };
}

/**
 * The family member who matters most to the player now, by the story
 * director's thread importance, with the latest moment between them if one
 * is on record.
 */
function home(world: World, personId: EntityId): OpeningStopThing {
  const family = storyThreadsOf(world, personId).filter(
    (thread) => thread.tieKind !== null,
  );
  const top = family[0];
  if (!top)
    return {
      stop: "home",
      kind: "none",
      reason: "No family or housemate is on record for this life.",
    };
  const moment = storyMomentsOf(world, personId)
    .filter((entry) => entry.counterpartPersonIds.includes(top.otherPersonId))
    .at(-1);
  const facts: Record<string, string> = {
    personId: top.otherPersonId,
    tie: top.tieKind!,
  };
  const work = activeWorkRelationshipsAt(world, top.otherPersonId)[0];
  const employer = work?.relationship.organizationId
    ? organizationProfileAt(
        world,
        work.relationship.organizationId,
        currentLifeCutoff(world),
      )?.name
    : undefined;
  if (work) facts.role = work.role.title;
  if (employer) facts.employer = employer;
  if (moment) facts.momentKind = moment.kindKey;
  return {
    stop: "home",
    kind: "family-member",
    // The stop shows the whole family, the one who matters most first.
    people: family.map((thread) => ({
      personId: thread.otherPersonId,
      role: thread.tieKind!,
    })),
    facts,
    sourceRecordIds: [
      ...(work ? [work.relationship.id] : []),
      ...(moment ? [moment.id, moment.sourceRecordId] : []),
    ],
  };
}

/**
 * Why the player is where day one starts: the record that put them there,
 * and the job or the home behind it.
 */
function you(world: World, personId: EntityId): OpeningStopThing {
  const arrival = recordsByStringField(
    world.history.events,
    "type",
    "life.scene.arrived",
  )
    .filter(
      (event) =>
        event.occurredAt === world.currentDate &&
        event.participants.some((entry) => entry.personId === personId),
    )
    .at(-1);
  if (!arrival)
    return {
      stop: "you",
      kind: "none",
      reason: "No record says where this life's first day starts.",
    };
  const workTag = arrival.tags.find((tag) => tag.startsWith("work:"));
  const facts: Record<string, string> = {
    setting: arrival.context.location?.setting ?? "",
    place: arrival.context.location?.label ?? "",
  };
  const sources: EntityId[] = [arrival.id];
  // At work, the job whose shift it is; at home, the job the arrival record
  // checked and found no shift for, if the player has one.
  const shiftId = workTag?.slice("work:".length);
  const job = activeWorkRelationshipsAt(world, personId).find((entry) =>
    shiftId
      ? entry.relationship.id === shiftId
      : arrival.involvedEntityIds.includes(entry.relationship.id),
  );
  if (job) {
    facts.because = shiftId ? "scheduled-shift" : "no-shift-now";
    facts.role = job.role.title;
    // A job the world began with carries no earlier start, so it says nothing
    // about how long the player has worked there.
    if (job.relationship.startedAt < world.currentDate)
      facts.workingSince = job.relationship.startedAt;
    const employer = job.relationship.organizationId
      ? organizationProfileAt(
          world,
          job.relationship.organizationId,
          currentLifeCutoff(world),
        )?.name
      : undefined;
    if (employer) facts.employer = employer;
    sources.push(job.relationship.id);
  }
  const housemates: OpeningPerson[] = [];
  if (!workTag) {
    const membership = householdMembershipsAt(world, personId)[0];
    if (membership) {
      sources.push(membership.membership.id);
      for (const id of storyHousemates(world, personId))
        housemates.push({ personId: id, role: "sharedHome" });
    }
  }
  return {
    stop: "you",
    kind: "why-you-are-here",
    people: housemates,
    facts: Object.fromEntries(
      Object.entries(facts).filter(([, value]) => value !== ""),
    ),
    sourceRecordIds: sources,
  };
}

const STOP_READERS: Readonly<
  Record<OpeningStop, (world: World, personId: EntityId) => OpeningStopThing>
> = { country, representatives, state, town, home, you };

/** The one thing for each of the six stops, in order. */
export function openingOneThings(
  world: World,
  personId: EntityId,
): readonly OpeningStopThing[] {
  return OPENING_STOPS.map((stop) => STOP_READERS[stop](world, personId));
}
