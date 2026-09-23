import { ageOnDate, daysBetween } from "./dates";
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
import { recordRelationshipInteraction } from "./records";
import { readRelationshipStanding } from "./relationship-standing";
import { SeededRng } from "./rng";
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
 *   lives with, or is family to, has history with;
 * - neighborhood: an adult who lives in the same place.
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
 * PLACEHOLDER, NOT RESEARCH: how often introductions happen on their own, and
 * which setting they come from, are filed with ChatGPT as
 * `how-people-meet-new-people`. `INTRODUCTION_SPACING_DAYS` and the even draw
 * across settings stand in until that answer comes back.
 */

export const INTRODUCTION_EVENT = "life.introduction";
export const INTRODUCTION_KIND = "contact:introduced";

export type IntroductionSetting =
  "work" | "study" | "group" | "friend-of-friend" | "neighborhood";

export interface IntroductionCandidate {
  readonly personId: EntityId;
  readonly setting: IntroductionSetting;
  /** Who the introduction comes through, for a friend of a friend. */
  readonly viaPersonId: EntityId | null;
  /** The organization shared, for work, study and a group. */
  readonly organizationId: EntityId | null;
}

/** Placeholder pace for introductions that happen on their own. See header. */
const INTRODUCTION_SPACING_DAYS = 14;

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
  const add = (candidate: IntroductionCandidate) => {
    if (known.has(candidate.personId) || !alive(world, candidate.personId))
      return;
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
    for (const otherId of world.personOrder) {
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
    for (const otherId of world.personOrder) {
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

  if (adult) {
    const home = world.people[personId]!.homeJurisdictionId;
    for (const otherId of world.personOrder) {
      if (otherId === personId || !world.people[otherId]) continue;
      if (world.people[otherId]!.homeJurisdictionId !== home) continue;
      if (!isAdult(world, otherId)) continue;
      add({
        personId: otherId,
        setting: "neighborhood",
        viaPersonId: null,
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
    case "neighborhood":
      return "in the neighborhood";
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
 * one introduction. Deterministic from the world's seed, the person and the
 * date, so reloading never rerolls it.
 */
export function produceIntroduction(world: World, personId: EntityId): World {
  if (!alive(world, personId)) return world;
  const last = lastIntroductionOn(world, personId);
  if (
    last !== null &&
    daysBetween(last, world.currentDate) < INTRODUCTION_SPACING_DAYS
  )
    return world;
  const candidates = introductionCandidates(world, personId);
  if (candidates.length === 0) return world;
  const settings = [...new Set(candidates.map((entry) => entry.setting))];
  const rng = new SeededRng(
    `${world.seed}:introduction:${personId}:${world.currentDate}`,
  );
  const setting = settings[rng.integer(0, settings.length)]!;
  const inSetting = candidates.filter((entry) => entry.setting === setting);
  const chosen = inSetting[rng.integer(0, inSetting.length)]!;
  return recordIntroduction(world, {
    personId,
    otherPersonId: chosen.personId,
    setting,
    how: "happened",
  });
}

/**
 * The player goes and meets somebody in a setting they choose. Who they meet
 * is the world's: one of the real candidates there, drawn from the seed and
 * the day, so the same choice on the same day meets the same person.
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
  const rng = new SeededRng(
    `${world.seed}:meet:${personId}:${setting}:${viaPersonId ?? ""}:${world.currentDate}`,
  );
  const chosen = inSetting[rng.integer(0, inSetting.length)]!;
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
