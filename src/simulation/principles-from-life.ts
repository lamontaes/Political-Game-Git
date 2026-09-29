import { confidantsOf } from "./confidants";
import { ageOnDate } from "./dates";
import { eventIndexOf } from "./event-index";
import { recordsByStringField } from "./history-index";
import { personOwnsHome } from "./home-purchase";
import { lifePlaceByJurisdictionId } from "./life-places";
import {
  activeOrganizationParticipationsAt,
  activeWorkRelationshipsAt,
  householdMembershipsAt,
  organizationProfileAt,
  workRelationshipHistoryForPerson,
  workStatusHistory,
} from "./life-queries";
import { publicPartyAffiliation } from "./living-world/congress";
import {
  LIVING_WORLD_KEYS,
  livingWorldOrganizationId,
} from "./living-world/opening";
import { affiliationAt } from "./living-world/party-evolution";
import { TOWN_JOB_END_REASONS } from "./living-world/town-labor-market";
import { placePopulation } from "./nationwide-world/place-population";
import { personName } from "./people";
import { parentsOf } from "./people-family";
import { personTrait } from "./people-traits";
import { createFormationContext, recordPrinciples } from "./politics";
import type { PrincipleRecordInput } from "./history";
import type {
  BeliefConviction,
  EntityId,
  HistoricalEvent,
  PoliticalFlexibility,
  PrincipleRecord,
  PrincipleStance,
  World,
} from "./types";

/**
 * PRINCIPLES FROM A LIFE — where a person's political principles come from.
 *
 * lamontae, via Claude CTO, 2026-09-29 12:24 a.m.: each person's principles
 * form from their life (family and upbringing, faith, party and the people
 * around them, place, work and money, and events they lived through), and
 * they change with experience. The real spread of views by party, age, region
 * and faith is a check on the result, never dice.
 *
 * So there is no draw here. Each thing the World records about a person is a
 * pull toward or away from a principle; the pulls are added, and the person
 * holds the principle the way the sum leans, as firmly as it leans. Two
 * people with the same party land in different places when their parents,
 * the people they talk to, their work, their town or what happened to them
 * differ. A person nothing presses on holds nothing, which is most people on
 * most principles; nobody is filled in to look complete.
 *
 * Temperament does not pick a side (answered research
 * `where-a-persons-politics-comes-from`): it sets how readily a held
 * principle gives way.
 *
 * Every row this writes names what it was formed from, in its formation
 * note, and cites the events it read. Reading it again later, after the
 * person's life has changed, writes a new row over the old one; the old one
 * stays in the history.
 */

export const LIFE_PRINCIPLES_VERSION = "life-principles/v1";

/** How hard one thing in a life pulls. SET BY HAND on the game's scale. */
type PullWeight = 1 | 2 | 3;

export interface PrinciplePull {
  /** The catalog principle's own key, such as "limited-government". */
  readonly principle: string;
  readonly toward: "endorses" | "rejects";
  readonly weight: PullWeight;
  /** Plain words for the formation note: what in their life pulls. */
  readonly because: string;
  readonly eventIds?: readonly EntityId[];
}

/**
 * The principles each party publicly stands for, as a cue its own people
 * take. SET BY HAND: the direction of each is the side of the widest gap
 * between Republicans and Democrats in the Pew Research Center's surveys of
 * values (Partisan divides over values, 2024; views of government's role,
 * 2023 and 2024). A principle the parties do not divide on is left out. For
 * someone who only leans toward a party it is one slight pull, so the label
 * alone never makes a principle (D-093: the party does not decide for its
 * members). For someone who carries the party's name in public life it
 * weighs strongly: people active in politics hold their side's principles far
 * more consistently and firmly than the public does.
 */
const PARTY_CUES: Readonly<
  Record<
    "democratic" | "republican",
    readonly (readonly [string, "endorses" | "rejects"])[]
  >
> = {
  republican: [
    ["limited-government", "endorses"],
    ["property-rights", "endorses"],
    ["tradition", "endorses"],
    ["market-competition", "endorses"],
    ["public-safety", "endorses"],
    ["fiscal-restraint", "endorses"],
    ["collective-provision", "rejects"],
  ],
  democratic: [
    ["collective-provision", "endorses"],
    ["environmental-stewardship", "endorses"],
    ["worker-protection", "endorses"],
    ["equal-opportunity", "endorses"],
    ["limited-government", "rejects"],
  ],
};

/**
 * The years a person grew up in. SET BY HAND: the direction of each pull is
 * the side of the widest generational gap in the Pew Research Center's
 * surveys (The Generation Gap in American Politics, 2018; views of
 * government's role, 2024): people born by 1964 lean more toward tradition
 * and a smaller government, people born from 1981 more toward collective
 * provision and the environment. One slight pull each, never a principle on
 * its own.
 */
const COHORTS = {
  olderThrough: 1964,
  youngerFrom: 1981,
  older: [
    ["tradition", "endorses", "they came of age before 1985"],
    ["limited-government", "endorses", "they came of age before 1985"],
  ],
  younger: [
    ["environmental-stewardship", "endorses", "they came of age after 2000"],
    ["collective-provision", "endorses", "they came of age after 2000"],
  ],
} as const;

/**
 * Town sizes. The population is the Census Bureau's estimate for the town
 * (place-population.ts). SET BY HAND: under 10,000 is a small town and
 * 250,000 or more a big city, the rough breaks the Census and Pew use when
 * they compare rural, suburban and urban views.
 */
const SMALL_TOWN_BELOW = 10_000;
const BIG_CITY_FROM = 250_000;

/** Employers whose money is public, by the organization's classification. */
const PUBLIC_EMPLOYERS: readonly string[] = [
  "sector:government",
  "sector:federal-government-office",
  "sector:state-government-office",
  "sector:local-government-office",
  "service:municipal-government",
  "service:state-agency",
  "service:police",
  "service:fire",
  "service:school",
  "service:public-health",
  "service:court-workplace",
];
const SAFETY_EMPLOYERS: readonly string[] = ["service:police", "service:fire"];
const SAFETY_OCCUPATIONS: readonly string[] = [
  "profession:police-officer",
  "profession:firefighter",
  "occupation:dispatcher",
];

/**
 * SET BY HAND: the least net pull that makes a principle, and the pull at
 * which it is held moderately, strongly and as settled. One slight pull
 * alone makes nothing: a single cue is not yet a principle.
 */
const FORMS_FROM = 2;
const CONVICTION_FROM: readonly (readonly [number, BeliefConviction])[] = [
  [6, "settled"],
  [4, "strong"],
  [3, "moderate"],
  [2, "tentative"],
];
/**
 * SET BY HAND: pulled both ways, a person is torn when the weaker side is at
 * least half the stronger.
 */
const TORN_AT = 0.5;

const FLEXIBILITY_ORDER: readonly PoliticalFlexibility[] = [
  "open",
  "negotiable",
  "conditional",
  "firm",
];
const FLEXIBILITY_FOR: Readonly<
  Record<BeliefConviction, PoliticalFlexibility>
> = {
  tentative: "open",
  moderate: "negotiable",
  strong: "conditional",
  settled: "firm",
};

function principleKeyOf(stableKey: string): string {
  return stableKey.slice(stableKey.lastIndexOf(":") + 1);
}

function latestPrinciples(
  world: World,
  personId: EntityId,
): ReadonlyMap<EntityId, PrincipleRecord> {
  const latest = new Map<EntityId, PrincipleRecord>();
  for (const record of recordsByStringField(
    world.history.principles,
    "personId",
    personId,
  )) {
    if (record.formedAt > world.currentDate) continue;
    const prior = latest.get(record.principleId);
    if (!prior || prior.sequence < record.sequence)
      latest.set(record.principleId, record);
  }
  return latest;
}

/**
 * The stable-key prefix of the officeholder draw (governing/
 * officeholder-principles.ts). A seated officeholder's principles still come
 * from it: seated members have no recorded life yet (no home, family, work or
 * faith), so forming theirs from life would leave only the party. This file
 * leaves anyone the draw reached as the draw left them.
 */
const OFFICEHOLDER_DRAW = "officeholder-principles/v1:";

const VICTIM_EVENTS = new WeakMap<
  readonly HistoricalEvent[],
  ReadonlyMap<EntityId, readonly EntityId[]>
>();

/** The crimes each person was the victim of, indexed once per history. */
function crimesAgainst(world: World, personId: EntityId): readonly EntityId[] {
  const events = world.history.events;
  let index = VICTIM_EVENTS.get(events);
  if (!index) {
    const built = new Map<EntityId, EntityId[]>();
    for (const event of eventIndexOf(events).values())
      for (const participant of event.participants)
        if (
          participant.role === "impact:crime-victim" &&
          participant.personId
        ) {
          const list = built.get(participant.personId) ?? [];
          list.push(event.id);
          built.set(participant.personId, list);
        }
    VICTIM_EVENTS.set(events, built);
    index = built;
  }
  return (index.get(personId) ?? []).filter(
    (id) =>
      (eventIndexOf(events).get(id)?.occurredAt ?? "") <= world.currentDate,
  );
}

function partyKey(
  world: World,
  personId: EntityId,
): "democratic" | "republican" | null {
  const organizationId = publicPartyAffiliation(world, personId);
  if (!organizationId) return null;
  for (const party of ["democratic", "republican"] as const)
    if (
      organizationId ===
      livingWorldOrganizationId(world, LIVING_WORLD_KEYS.nationalParty(party))
    )
      return party;
  return null;
}

/**
 * Whether this person carries their party's name in public life: seated in a
 * legislature under it, or an officer of the party. SET BY HAND from the
 * finding that people active in politics hold their side's principles far
 * more consistently than the public does (Converse, 1964; Zaller, 1992).
 */
function carriesPartyName(world: World, personId: EntityId): boolean {
  if (affiliationAt(world, personId).source === "seat-roll") return true;
  if (
    activeWorkRelationshipsAt(world, personId).some((job) =>
      PUBLIC_LIFE_OCCUPATIONS.includes(job.role.occupationClassification ?? ""),
    )
  )
    return true;
  return activeOrganizationParticipationsAt(world, personId).some(
    (entry) =>
      entry.participation.kind.startsWith("leadership:party") ||
      entry.participation.kind === "membership:party-committee",
  );
}

const PUBLIC_LIFE_OCCUPATIONS: readonly string[] = [
  "service:elected-legislator",
  "occupation:elected-official",
];

function heldBy(
  held: ReadonlyMap<EntityId, PrincipleRecord>,
  world: World,
): ReadonlyMap<string, PrincipleStance> {
  const byKey = new Map<string, PrincipleStance>();
  for (const [principleId, record] of held) {
    const principle = world.policyCatalog.principles[principleId];
    if (principle)
      byKey.set(principleKeyOf(principle.stableKey), record.stance);
  }
  return byKey;
}

/**
 * Everything in this person's recorded life that pulls on a principle. Pure:
 * it reads the World and writes nothing.
 */
export function principlePullsOf(
  world: World,
  personId: EntityId,
  /** Principles formed in this same pass and not yet written, by person. */
  pending: ReadonlyMap<
    EntityId,
    ReadonlyMap<string, PrincipleStance>
  > = new Map(),
): readonly PrinciplePull[] {
  const holds = (otherId: EntityId) =>
    pending.get(otherId) ?? heldBy(latestPrinciples(world, otherId), world);
  const person = world.people[personId];
  if (!person) return [];
  const pulls: PrinciplePull[] = [];

  // Family and upbringing: what their parents held, living or not.
  const parents = parentsOf(world, personId);
  for (const parentId of parents) {
    const name = personName(world.people[parentId]!);
    for (const [principle, stance] of holds(parentId))
      if (stance !== "conflicted")
        pulls.push({
          principle,
          toward: stance,
          weight: 2,
          because: `grew up with ${name}, who ${stance === "endorses" ? "held" : "rejected"} it`,
        });
  }

  // The people around them: what the people they confide in hold.
  const around = new Map<string, { endorses: number; rejects: number }>();
  for (const otherId of confidantsOf(world, personId)) {
    if (parents.includes(otherId)) continue;
    for (const [principle, stance] of holds(otherId)) {
      if (stance === "conflicted") continue;
      const count = around.get(principle) ?? { endorses: 0, rejects: 0 };
      count[stance] += 1;
      around.set(principle, count);
    }
  }
  for (const [principle, count] of around)
    for (const toward of ["endorses", "rejects"] as const)
      if (count[toward] > 0)
        pulls.push({
          principle,
          toward,
          weight: count[toward] >= 2 ? 2 : 1,
          because:
            count[toward] >= 2
              ? `${count[toward]} of the people they talk to ${toward === "endorses" ? "hold" : "reject"} it`
              : `someone they talk to ${toward === "endorses" ? "holds" : "rejects"} it`,
        });

  // Party: the principles their party stands for, as a cue. Someone who
  // carries the party's name in public life, as a seated member or a party
  // officer, takes that cue harder than someone who only leans that way.
  const party = partyKey(world, personId);
  const publicLife = party !== null && carriesPartyName(world, personId);
  if (party)
    for (const [principle, toward] of PARTY_CUES[party])
      pulls.push({
        principle,
        toward,
        weight: publicLife ? 3 : 1,
        because: publicLife
          ? `they serve under the ${party === "democratic" ? "Democrats'" : "Republicans'"} name, and the party stands for it`
          : `their party, the ${party === "democratic" ? "Democrats" : "Republicans"}, stands for it`,
      });

  // The times they grew up in.
  const born = Number(person.birthDate.slice(0, 4));
  for (const [principle, toward, because] of born <= COHORTS.olderThrough
    ? COHORTS.older
    : born >= COHORTS.youngerFrom
      ? COHORTS.younger
      : [])
    pulls.push({ principle, toward, weight: 1, because });

  // Faith and the other bodies they belong to.
  const memberships = activeOrganizationParticipationsAt(world, personId).map(
    (entry) => entry.participation.kind,
  );
  if (memberships.includes("membership:congregation"))
    pulls.push({
      principle: "tradition",
      toward: "endorses",
      weight: 2,
      because: "they belong to a congregation",
    });
  if (memberships.includes("membership:labor-union"))
    pulls.push({
      principle: "worker-protection",
      toward: "endorses",
      weight: 2,
      because: "they belong to a union",
    });

  // Place: the size of the town they live in.
  const home = householdMembershipsAt(world, personId)[0]?.location
    ?.jurisdictionId;
  const geoid = home ? lifePlaceByJurisdictionId(home)?.sourceGeoid : null;
  const population = geoid ? placePopulation(geoid) : null;
  if (population !== null && population < SMALL_TOWN_BELOW) {
    pulls.push({
      principle: "local-control",
      toward: "endorses",
      weight: 1,
      because: "they live in a small town",
    });
    pulls.push({
      principle: "tradition",
      toward: "endorses",
      weight: 1,
      because: "they live in a small town",
    });
  } else if (population !== null && population >= BIG_CITY_FROM)
    pulls.push({
      principle: "collective-provision",
      toward: "endorses",
      weight: 1,
      because: "they live in a big city",
    });

  // Work and money.
  for (const job of activeWorkRelationshipsAt(world, personId)) {
    const classification = job.relationship.organizationId
      ? organizationProfileAt(world, job.relationship.organizationId)
          ?.classification
      : undefined;
    const occupation = job.role.occupationClassification;
    if (classification && PUBLIC_EMPLOYERS.includes(classification))
      pulls.push({
        principle: "collective-provision",
        toward: "endorses",
        weight: 1,
        because: "they work in public service",
      });
    if (
      (classification && SAFETY_EMPLOYERS.includes(classification)) ||
      (occupation !== null && SAFETY_OCCUPATIONS.includes(occupation))
    )
      pulls.push({
        principle: "public-safety",
        toward: "endorses",
        weight: 2,
        because: "their work is keeping people safe",
      });
    if (occupation === "profession:union-representative")
      pulls.push({
        principle: "worker-protection",
        toward: "endorses",
        weight: 2,
        because: "they represent workers for a living",
      });
    if (job.relationship.economicRisk === "person-borne") {
      pulls.push({
        principle: "property-rights",
        toward: "endorses",
        weight: 2,
        because: "they carry the risk of their own business",
      });
      pulls.push({
        principle: "market-competition",
        toward: "endorses",
        weight: 1,
        because: "they carry the risk of their own business",
      });
    } else if (
      job.relationship.compensation === "paid" &&
      job.relationship.authority === "directed"
    )
      pulls.push({
        principle: "worker-protection",
        toward: "endorses",
        weight: 1,
        because: "they work for wages under someone else",
      });
  }
  if (personOwnsHome(world, personId))
    pulls.push({
      principle: "property-rights",
      toward: "endorses",
      weight: 1,
      because: "their household owns its home",
    });

  // What they lived through.
  const lostJob = workRelationshipHistoryForPerson(world, personId).some(
    (relationship) =>
      workStatusHistory(world, relationship.id).some(
        (status) =>
          status.status === "ended" &&
          (status.reason === TOWN_JOB_END_REASONS.laidOff ||
            status.reason === TOWN_JOB_END_REASONS.businessClosed),
      ),
  );
  if (lostJob) {
    pulls.push({
      principle: "worker-protection",
      toward: "endorses",
      weight: 2,
      because: "they lost a job they did not choose to leave",
    });
    pulls.push({
      principle: "collective-provision",
      toward: "endorses",
      weight: 1,
      because: "they lost a job they did not choose to leave",
    });
  }
  const crimes = crimesAgainst(world, personId);
  if (crimes.length > 0)
    pulls.push({
      principle: "public-safety",
      toward: "endorses",
      weight: 2,
      because: "a crime was committed against them",
      eventIds: crimes,
    });

  return pulls;
}

export interface FormedPrinciple {
  readonly principle: string;
  readonly stance: PrincipleStance;
  readonly conviction: BeliefConviction;
  readonly flexibility: PoliticalFlexibility;
  readonly pulls: readonly PrinciplePull[];
}

/**
 * What the pulls add up to, principle by principle. A principle nothing
 * pulls on, or pulls on only slightly, is not held.
 */
export function principlesFromPulls(
  world: World,
  personId: EntityId,
  pulls: readonly PrinciplePull[],
): readonly FormedPrinciple[] {
  const byPrinciple = new Map<string, PrinciplePull[]>();
  for (const pull of pulls) {
    const list = byPrinciple.get(pull.principle) ?? [];
    list.push(pull);
    byPrinciple.set(pull.principle, list);
  }
  // Temperament: a combative person holds on harder, one who avoids a fight
  // gives way more readily. It never picks the side.
  const conflict = personTrait(world, personId, "conflict").value;
  const shift = conflict >= 1 ? 1 : conflict <= -1 ? -1 : 0;
  const formed: FormedPrinciple[] = [];
  for (const [principle, list] of [...byPrinciple].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const endorse = sum(list, "endorses");
    const reject = sum(list, "rejects");
    const stronger = Math.max(endorse, reject);
    if (stronger < FORMS_FROM) continue;
    const weaker = Math.min(endorse, reject);
    const torn = weaker > 0 && weaker >= stronger * TORN_AT;
    const net = stronger - weaker;
    if (!torn && net < FORMS_FROM) continue;
    const conviction: BeliefConviction = torn
      ? "tentative"
      : CONVICTION_FROM.find(([from]) => net >= from)![1];
    const base = FLEXIBILITY_ORDER.indexOf(FLEXIBILITY_FOR[conviction]);
    const flexibility =
      FLEXIBILITY_ORDER[
        Math.max(0, Math.min(FLEXIBILITY_ORDER.length - 1, base + shift))
      ]!;
    formed.push({
      principle,
      stance: torn ? "conflicted" : endorse > reject ? "endorses" : "rejects",
      conviction,
      flexibility,
      pulls: list,
    });
  }
  return formed;
}

function sum(
  pulls: readonly PrinciplePull[],
  toward: "endorses" | "rejects",
): number {
  return pulls
    .filter((pull) => pull.toward === toward)
    .reduce((total, pull) => total + pull.weight, 0);
}

function note(formed: FormedPrinciple): string {
  const reasons = formed.pulls.map(
    (pull) =>
      `${pull.toward === "endorses" ? "for" : "against"}: ${pull.because}`,
  );
  return `Formed from their life (${LIFE_PRINCIPLES_VERSION}): ${reasons.join("; ")}.`;
}

/**
 * Forms, or re-forms, the principles of these people from their recorded
 * lives. A person's parents are formed first, so what a child grew up with
 * exists to be read; the people they talk to are read as they stand. A row
 * is written only where the result differs from what the person last held
 * from their life, so reading an unchanged life again writes nothing. The
 * controlled character is never formed: they hold only what they choose.
 */
export function formPrinciplesFromLife(
  world: World,
  personIds: readonly EntityId[],
): World {
  const catalog = world.policyCatalog;
  const idForKey = new Map<string, EntityId>();
  for (const principleId of catalog.principleOrder)
    idForKey.set(
      principleKeyOf(catalog.principles[principleId]!.stableKey),
      principleId,
    );
  if (idForKey.size === 0) return world;
  const controlled =
    world.control.kind === "person" ? world.control.personId : null;
  const rows: PrincipleRecordInput[] = [];
  const pending = new Map<EntityId, ReadonlyMap<string, PrincipleStance>>();
  const done = new Set<EntityId>();
  const visit = (personId: EntityId, depth: number): void => {
    if (done.has(personId) || !world.people[personId]) return;
    done.add(personId);
    if (!formsPrinciplesAt(world, personId)) return;
    // Parents first, so what a child grew up with exists to be read.
    if (depth < 3)
      for (const parentId of parentsOf(world, personId))
        visit(parentId, depth + 1);
    if (personId === controlled) return;
    const before = latestRows(world, personId);
    if (
      [...before.values()].some((row) =>
        row.stableKey.startsWith(OFFICEHOLDER_DRAW),
      )
    )
      return;
    const formed = principlesFromPulls(
      world,
      personId,
      principlePullsOf(world, personId, pending),
    );
    const holds = new Map(heldBy(latestPrinciples(world, personId), world));
    for (const principle of formed) {
      const principleId = idForKey.get(principle.principle);
      if (!principleId) continue;
      const prior = before.get(principleId);
      // A principle another writer gave them (a choice, a conversation) is
      // theirs as it stands; their life does not overwrite it.
      if (prior && !prior.stableKey.startsWith(`${LIFE_PRINCIPLES_VERSION}:`))
        continue;
      holds.set(principle.principle, principle.stance);
      if (
        prior?.stableKey.startsWith(`${LIFE_PRINCIPLES_VERSION}:`) &&
        prior.stance === principle.stance &&
        prior.conviction === principle.conviction &&
        prior.flexibility === principle.flexibility
      )
        continue;
      rows.push({
        stableKey: `${LIFE_PRINCIPLES_VERSION}:${personId}:${principle.principle}:${world.currentDate}:${world.history.nextSequence}`,
        personId,
        principleId,
        formedAt: world.currentDate,
        stance: principle.stance,
        conviction: principle.conviction,
        flexibility: principle.flexibility,
        qualification: null,
        formation: createFormationContext("experience:life", {
          relevantEventIds: [
            ...new Set(principle.pulls.flatMap((pull) => pull.eventIds ?? [])),
          ].sort(),
          note: note(principle),
        }),
        supersedesPrincipleRecordId: prior?.id ?? null,
      });
    }
    pending.set(personId, holds);
  };
  for (const personId of new Set(personIds)) visit(personId, 0);
  // Written together: every row is checked, and the World once.
  return recordPrinciples(world, rows);
}

/** The latest row for each principle this person holds, from any writer. */
function latestRows(
  world: World,
  personId: EntityId,
): ReadonlyMap<EntityId, PrincipleRecord> {
  const latest = new Map<EntityId, PrincipleRecord>();
  for (const record of recordsByStringField(
    world.history.principles,
    "personId",
    personId,
  )) {
    const prior = latest.get(record.principleId);
    if (!prior || prior.sequence < record.sequence)
      latest.set(record.principleId, record);
  }
  return latest;
}

/** The adult age from which a person's principles are read. */
export function formsPrinciplesAt(world: World, personId: EntityId): boolean {
  const person = world.people[personId];
  return !!person && ageOnDate(person.birthDate, world.currentDate) >= 18;
}
