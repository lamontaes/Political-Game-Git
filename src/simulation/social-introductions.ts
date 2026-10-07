import { ageOnDate, daysBetween } from "./dates";
import { countyGeoidsForPlace } from "./government-units";
import {
  activeOrganizationParticipationsAt,
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  organizationProfileAt,
} from "./life-queries";
import { personName } from "./people";
import { studyPeers } from "./people-study";
import { personTrait } from "./people-traits";
import { recordRelationshipInteraction } from "./records";
import { readRelationshipStanding } from "./relationship-standing";
import type { EntityId, IsoDate, World } from "./types";
import { recordWorldEvent } from "./world";

/**
 * How somebody comes to know somebody new (the owner, 2026-09-22 7:39 p.m.
 * Eastern: "there needs to be a way to expand your social circle").
 *
 * Measured before this existed: a 24-year-old in Houma or Reno knew the two
 * people they lived with on day one and the same two after six months.
 *
 * Every introduction is to a real person who already shares a setting with
 * the player in the world's own records. Nobody is invented to be met, and
 * nothing here creates a person. The settings are:
 *
 * - work: somebody with an active job at the same employer;
 * - study: somebody enrolled in the same program;
 * - group: somebody taking part in the same organization (a congregation, a
 *   club, a chapter), as the world records participation;
 * - friend-of-friend: somebody a person the player already gets on with, or
 *   lives with, or is family to, has history with.
 *
 * Living in the same town is deliberately not a setting. ChatGPT's answer to
 * `how-people-meet-new-people` (2026-09-23) is that a shared setting makes a
 * candidate and a town is not a shared setting; neighbors are people in the
 * same building or nearby homes. The world records a household's town and
 * nothing finer, so there is no honest way yet to say who lives nearby, and
 * nobody is offered as a neighbor until residence geography exists.
 *
 * The owner ruled both ways in (2026-09-23): new people come into a life as
 * time passes, and the player can go and meet somebody by choice. Both write
 * the same record through `recordIntroduction`.
 *
 * A first meeting makes two people acquainted and moves none of the five
 * lines. DEPTH1 (`what-moves-a-relationship`) is explicit that contact alone
 * does not build standing; warmth and the rest come later from what the two
 * of them actually do. So it is recorded as maintained contact, which the
 * standing reader counts as being in touch and nothing more.
 *
 * CALIBRATION, NOT RESEARCH: ChatGPT's answer to `how-people-meet-new-people`
 * found no annual acquaintance count or per-interaction chance to use, and
 * says any number here must be a labeled calibration. `INTRODUCTION_BASE_SPACING_DAYS`
 * and the even draw across settings are that calibration. The pace is not one
 * number for everybody: it follows the person's own sociability (see
 * `introductionSpacingDays`), so an outgoing person falls into talk with new
 * people sooner and a reserved one later. BG-69 measured the old single
 * fourteen-day pace at three or four introductions in 56 days for every life.
 */

export const INTRODUCTION_EVENT = "life.introduction";
export const INTRODUCTION_KIND = "contact:introduced";

export type IntroductionSetting =
  "work" | "study" | "group" | "friend-of-friend";

export interface IntroductionCandidate {
  readonly personId: EntityId;
  readonly setting: IntroductionSetting;
  /** Who the introduction comes through, for a friend of a friend. */
  readonly viaPersonId: EntityId | null;
  /** The organization shared, for work, study and a group. */
  readonly organizationId: EntityId | null;
}

/**
 * Calibration pace, in days, for somebody of middling sociability meeting
 * somebody new on their own. See the header.
 */
const INTRODUCTION_BASE_SPACING_DAYS = 4;

/**
 * Days this person leaves between meeting new people on their own.
 *
 * A smooth scale in the person's sociability, no step and no draw: every two
 * points of sociability halve the spacing, so the very sociable meet somebody
 * about every two days and the very reserved about every eight, with everyone
 * between on the same curve.
 */
export function introductionSpacingDays(
  world: World,
  personId: EntityId,
): number {
  const sociability = personTrait(world, personId, "sociability").value;
  return Math.max(
    1,
    Math.round(INTRODUCTION_BASE_SPACING_DAYS * 2 ** (-sociability / 2)),
  );
}

const ADULT_AGE = 18;

function alive(world: World, personId: EntityId): boolean {
  return (
    !!world.people[personId] &&
    !world.history.personDeaths.some(
      (death) =>
        death.personId === personId && death.diedAt <= world.currentDate,
    )
  );
}

function isAdult(world: World, personId: EntityId): boolean {
  return (
    ageOnDate(world.people[personId]!.birthDate, world.currentDate) >= ADULT_AGE
  );
}

/** Everybody this person already knows in any recorded way. */
function alreadyKnown(world: World, personId: EntityId): Set<EntityId> {
  const cutoff = currentLifeCutoff(world);
  const known = new Set<EntityId>([personId]);
  for (const interaction of world.history.relationshipInteractions) {
    if (!interaction.personIds.includes(personId)) continue;
    for (const id of interaction.personIds) known.add(id);
  }
  const households = new Set(
    householdMembershipsAt(world, personId, cutoff).map(
      (entry) => entry.household.id,
    ),
  );
  for (const record of world.history.householdMemberships) {
    if (households.has(record.householdId)) known.add(record.personId);
  }
  for (const kin of kinshipRelationshipsAt(world, personId, cutoff)) {
    for (const id of kin.personIds) known.add(id);
  }
  return known;
}

/** People this person gets on with, lives with, or is family to. */
function closeCircle(world: World, personId: EntityId): readonly EntityId[] {
  const cutoff = currentLifeCutoff(world);
  const circle = new Set<EntityId>();
  const households = new Set(
    householdMembershipsAt(world, personId, cutoff).map(
      (entry) => entry.household.id,
    ),
  );
  for (const record of world.history.householdMemberships) {
    if (households.has(record.householdId)) circle.add(record.personId);
  }
  for (const kin of kinshipRelationshipsAt(world, personId, cutoff)) {
    for (const id of kin.personIds) circle.add(id);
  }
  for (const interaction of world.history.relationshipInteractions) {
    if (!interaction.personIds.includes(personId)) continue;
    const other = interaction.personIds.find((id) => id !== personId)!;
    if (circle.has(other)) continue;
    const warmth = readRelationshipStanding(world, personId, other).readings
      .warmth;
    if (
      !warmth.adverse &&
      (warmth.band === "marked" || warmth.band === "strong")
    )
      circle.add(other);
  }
  circle.delete(personId);
  return [...circle].filter((id) => alive(world, id));
}

/**
 * Who counts as near enough to be introduced (owner, 2026-09-26): people who
 * live in this person's own city or county, and the important people
 * everywhere — governors, state legislators, members of Congress, and state
 * and federal executives. Everybody else who lives somewhere else is not
 * somebody this person meets.
 */
const IMPORTANT_WORK_KINDS: ReadonlySet<string> = new Set([
  "employment:legislative-member",
  "employment:executive-office",
  "employment:executive-officeholder",
  "employment:vice-presidential-officeholder",
  "employment:state-agency-director",
]);

function geoidOfJurisdiction(
  world: World,
  jurisdictionId: EntityId,
): { readonly kind: "place" | "county"; readonly geoid: string } | null {
  const slug = world.jurisdictions[jurisdictionId]?.slug ?? "";
  const match = /^us-(place|county)-(\d+)$/.exec(slug);
  return match
    ? { kind: match[1] as "place" | "county", geoid: match[2]! }
    : null;
}

function nearnessFor(
  world: World,
  personId: EntityId,
  cutoff: ReturnType<typeof currentLifeCutoff>,
): (otherId: EntityId) => boolean {
  const homeId = world.people[personId]!.homeJurisdictionId;
  const home = geoidOfJurisdiction(world, homeId);
  const homeCounties = new Set(
    home?.kind === "county"
      ? [home.geoid]
      : home
        ? countyGeoidsForPlace(home.geoid)
        : [],
  );
  const nearPlaces = new Map<EntityId, boolean>([[homeId, true]]);
  const nearPlace = (jurisdictionId: EntityId): boolean => {
    let answer = nearPlaces.get(jurisdictionId);
    if (answer === undefined) {
      const place = geoidOfJurisdiction(world, jurisdictionId);
      answer =
        !!place &&
        (place.kind === "county"
          ? homeCounties.has(place.geoid)
          : countyGeoidsForPlace(place.geoid).some((county) =>
              homeCounties.has(county),
            ));
      nearPlaces.set(jurisdictionId, answer);
    }
    return answer;
  };
  return (otherId) => {
    const other = world.people[otherId];
    if (!other) return false;
    if (nearPlace(other.homeJurisdictionId)) return true;
    return activeWorkRelationshipsAt(world, otherId, cutoff).some((entry) =>
      IMPORTANT_WORK_KINDS.has(entry.relationship.kind),
    );
  };
}

/**
 * Everybody with any record at one of these organizations, in the World's
 * person order: the only people who could share one of them now.
 */
const PEOPLE_BY_ORGANIZATION = new WeakMap<
  object,
  ReadonlyMap<EntityId | null, readonly EntityId[]>
>();
const PERSON_POSITION = new WeakMap<object, ReadonlyMap<EntityId, number>>();

function peopleRecordedAt(
  world: World,
  records: readonly {
    readonly personId: EntityId;
    readonly organizationId: EntityId | null;
  }[],
  organizations: ReadonlySet<EntityId | null>,
): readonly EntityId[] {
  let byOrganization = PEOPLE_BY_ORGANIZATION.get(records);
  if (!byOrganization) {
    // A job with no employer on record is keyed as null, as the per-person
    // comparison this replaces matched it.
    const built = new Map<EntityId | null, EntityId[]>();
    for (const record of records) {
      const list = built.get(record.organizationId);
      if (list) list.push(record.personId);
      else built.set(record.organizationId, [record.personId]);
    }
    byOrganization = built;
    PEOPLE_BY_ORGANIZATION.set(records, byOrganization);
  }
  let position = PERSON_POSITION.get(world.personOrder);
  if (!position) {
    position = new Map(world.personOrder.map((id, index) => [id, index]));
    PERSON_POSITION.set(world.personOrder, position);
  }
  const people = new Set<EntityId>();
  for (const organizationId of organizations) {
    for (const id of byOrganization.get(organizationId) ?? []) people.add(id);
  }
  return [...people]
    .filter((id) => position.has(id))
    .sort((left, right) => position.get(left)! - position.get(right)!);
}

/**
 * Everybody this person could be introduced to now, by setting.
 *
 * Read only. A person may appear under more than one setting; each is a real
 * way they could meet. Adults meet adults outside work and study, and a child
 * is introduced only through school or their own family's circle.
 */
export function introductionCandidates(
  world: World,
  personId: EntityId,
): readonly IntroductionCandidate[] {
  if (!alive(world, personId)) return [];
  const cutoff = currentLifeCutoff(world);
  const known = alreadyKnown(world, personId);
  const adult = isAdult(world, personId);
  const candidates: IntroductionCandidate[] = [];
  const seen = new Set<string>();
  const near = nearnessFor(world, personId, cutoff);
  const add = (candidate: IntroductionCandidate) => {
    if (known.has(candidate.personId) || !alive(world, candidate.personId))
      return;
    if (!near(candidate.personId)) return;
    const key = `${candidate.setting}:${candidate.personId}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(candidate);
  };
  const sameAgeBand = (otherId: EntityId) => isAdult(world, otherId) === adult;

  const employers = new Set(
    activeWorkRelationshipsAt(world, personId, cutoff).map(
      (entry) => entry.relationship.organizationId,
    ),
  );
  if (employers.size > 0) {
    // Only people with a record at one of these employers can share one, so
    // the search starts from the employer rather than from everybody.
    for (const otherId of peopleRecordedAt(
      world,
      world.history.workRelationships,
      employers,
    )) {
      if (otherId === personId) continue;
      const shared = activeWorkRelationshipsAt(world, otherId, cutoff).find(
        (entry) => employers.has(entry.relationship.organizationId),
      );
      if (shared)
        add({
          personId: otherId,
          setting: "work",
          viaPersonId: null,
          organizationId: shared.relationship.organizationId,
        });
    }
  }

  for (const peer of studyPeers(world, personId)) {
    add({
      personId: peer.personId,
      setting: "study",
      viaPersonId: null,
      organizationId: peer.organizationId,
    });
  }

  const groups = new Set(
    activeOrganizationParticipationsAt(world, personId, cutoff).map(
      (entry) => entry.participation.organizationId,
    ),
  );
  if (groups.size > 0) {
    for (const otherId of peopleRecordedAt(
      world,
      world.history.organizationParticipations,
      groups,
    )) {
      if (otherId === personId || !sameAgeBand(otherId)) continue;
      const shared = activeOrganizationParticipationsAt(
        world,
        otherId,
        cutoff,
      ).find((entry) => groups.has(entry.participation.organizationId));
      if (shared)
        add({
          personId: otherId,
          setting: "group",
          viaPersonId: null,
          organizationId: shared.participation.organizationId,
        });
    }
  }

  for (const friendId of closeCircle(world, personId)) {
    for (const interaction of relationshipHistoryOf(world, friendId)) {
      const otherId = interaction.personIds.find((id) => id !== friendId)!;
      if (otherId === personId || !sameAgeBand(otherId)) continue;
      add({
        personId: otherId,
        setting: "friend-of-friend",
        viaPersonId: friendId,
        organizationId: null,
      });
    }
  }

  return candidates;
}

function relationshipHistoryOf(world: World, personId: EntityId) {
  return world.history.relationshipInteractions.filter(
    (interaction) =>
      interaction.personIds.includes(personId) &&
      interaction.significance !== "minor",
  );
}

/** How the setting reads in a sentence about the meeting. */
export function introductionSettingPhrase(
  world: World,
  candidate: IntroductionCandidate,
): string {
  switch (candidate.setting) {
    case "work":
      return "through work";
    case "study":
      return "on the same program";
    case "group": {
      const name = candidate.organizationId
        ? organizationProfileAt(world, candidate.organizationId)?.name
        : null;
      return name ? `through ${name}` : "through a group you are both in";
    }
    case "friend-of-friend":
      return `through ${world.people[candidate.viaPersonId!]!.givenName}`;
  }
}

export interface RecordIntroductionInput {
  readonly personId: EntityId;
  readonly otherPersonId: EntityId;
  readonly setting: IntroductionSetting;
  /** Whether the player went and met them, or it came about on its own. */
  readonly how: "chosen" | "happened";
}

/**
 * Record two people meeting. Refused unless the other person is, right now, a
 * real candidate in that setting, so nothing can be met that the world does
 * not support.
 */
export function recordIntroduction(
  world: World,
  input: RecordIntroductionInput,
): World {
  const candidate = introductionCandidates(world, input.personId).find(
    (entry) =>
      entry.personId === input.otherPersonId && entry.setting === input.setting,
  );
  if (!candidate) {
    throw new Error("These two people do not share that setting now.");
  }
  const player = world.people[input.personId]!;
  const other = world.people[input.otherPersonId]!;
  const stableKey = `introduction:${input.personId}:${input.otherPersonId}`;
  if (world.history.events.some((event) => event.stableKey === stableKey)) {
    return world;
  }
  const phrase = introductionSettingPhrase(world, candidate);
  const summary = `${personName(player)} met ${personName(other)} ${phrase}.`;
  let next = recordWorldEvent(world, {
    stableKey,
    type: INTRODUCTION_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: player.homeJurisdictionId,
    involvedEntityIds: [
      input.personId,
      input.otherPersonId,
      ...(candidate.viaPersonId ? [candidate.viaPersonId] : []),
    ],
    participants: [
      {
        personId: input.personId,
        role: input.how === "chosen" ? "agency:actor" : "presence:participant",
        detail: "Met somebody new",
      },
      {
        personId: input.otherPersonId,
        role: "presence:participant",
        detail: "Met somebody new",
      },
      ...(candidate.viaPersonId
        ? [
            {
              personId: candidate.viaPersonId,
              role: "agency:introducer" as const,
              detail: "Introduced them",
            },
          ]
        : []),
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      `introduction.setting:${candidate.setting}`,
      `introduction.how:${input.how}`,
    ],
    summary,
    context: {
      location: null,
      socialContext: `Two people meeting ${phrase}.`,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const eventId = next.history.events.at(-1)!.id;
  next = recordRelationshipInteraction(next, {
    stableKey: `${stableKey}:interaction`,
    personIds: [input.personId, input.otherPersonId],
    eventId,
    occurredAt: next.currentDate,
    kind: INTRODUCTION_KIND,
    // Acquainted, and nothing more: see the header.
    change: "maintained",
    significance: "meaningful",
    summary,
    tags: [`introduction.setting:${candidate.setting}`],
  });
  return next;
}

/**
 * Whom this person meets first among `from`: somebody who turns up in more of
 * the settings they share (the same employer and the same congregation, say)
 * is met sooner, and between two equally placed, the one nearest their age,
 * since people of an age fall into talk more easily (McPherson, Smith-Lovin
 * and Cook, "Birds of a Feather", Annual Review of Sociology, 2001). Nothing
 * is drawn: the next day's meeting is the next person, because a person met
 * is no longer a candidate.
 */
function mostLikelyToMeet(
  world: World,
  personId: EntityId,
  from: readonly IntroductionCandidate[],
  all: readonly IntroductionCandidate[],
): IntroductionCandidate {
  const settingsShared = new Map<EntityId, number>();
  for (const entry of all)
    settingsShared.set(
      entry.personId,
      (settingsShared.get(entry.personId) ?? 0) + 1,
    );
  const today = world.currentDate;
  const age = ageOnDate(world.people[personId]!.birthDate, today);
  const gap = (id: EntityId) =>
    Math.abs(ageOnDate(world.people[id]!.birthDate, today) - age);
  return [...from].sort(
    (a, b) =>
      (settingsShared.get(b.personId) ?? 0) -
        (settingsShared.get(a.personId) ?? 0) ||
      gap(a.personId) - gap(b.personId) ||
      a.personId.localeCompare(b.personId) ||
      a.setting.localeCompare(b.setting),
  )[0]!;
}

/** The last day this person met somebody new, if ever. */
function lastIntroductionOn(world: World, personId: EntityId): IsoDate | null {
  return (
    world.history.events
      .filter(
        (event) =>
          event.type === INTRODUCTION_EVENT &&
          event.involvedEntityIds.includes(personId),
      )
      .at(-1)?.occurredAt ?? null
  );
}

/**
 * Somebody new comes into this person's life as time passes, when the
 * placeholder pace allows. Called once per day of passing time; writes at most
 * one introduction, to the candidate `mostLikelyToMeet` puts first, so
 * reloading never changes it.
 */
export function produceIntroduction(world: World, personId: EntityId): World {
  if (!alive(world, personId)) return world;
  const last = lastIntroductionOn(world, personId);
  if (
    last !== null &&
    daysBetween(last, world.currentDate) <
      introductionSpacingDays(world, personId)
  )
    return world;
  const candidates = introductionCandidates(world, personId);
  if (candidates.length === 0) return world;
  const chosen = mostLikelyToMeet(world, personId, candidates, candidates);
  return recordIntroduction(world, {
    personId,
    otherPersonId: chosen.personId,
    setting: chosen.setting,
    how: "happened",
  });
}

/**
 * The player goes and meets somebody in a setting they choose. Who they meet
 * is the world's: the real candidate there `mostLikelyToMeet` puts first, so
 * the same choice on the same day meets the same person.
 */
export function meetSomebodyNew(
  world: World,
  personId: EntityId,
  setting: IntroductionSetting,
  viaPersonId: EntityId | null = null,
): World {
  const inSetting = introductionCandidates(world, personId).filter(
    (entry) =>
      entry.setting === setting &&
      (viaPersonId === null || entry.viaPersonId === viaPersonId),
  );
  if (inSetting.length === 0) {
    throw new Error("There is nobody new to meet there right now.");
  }
  const chosen = mostLikelyToMeet(
    world,
    personId,
    inSetting,
    introductionCandidates(world, personId),
  );
  return recordIntroduction(world, {
    personId,
    otherPersonId: chosen.personId,
    setting,
    how: "chosen",
  });
}

/** Everyone this person has met through an introduction, for tests and views. */
export function introducedPeople(
  world: World,
  personId: EntityId,
): readonly EntityId[] {
  return relationshipHistoryFor(world, personId);
}

function relationshipHistoryFor(world: World, personId: EntityId) {
  return world.history.relationshipInteractions
    .filter(
      (interaction) =>
        interaction.kind === INTRODUCTION_KIND &&
        interaction.personIds.includes(personId),
    )
    .map((interaction) => interaction.personIds.find((id) => id !== personId)!);
}
