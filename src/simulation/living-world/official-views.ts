import { ageOnDate } from "../dates";
import { createStableId } from "../ids";
import {
  OFFICIAL_VIEW_TRANSITION_KEY,
  officialViewReflectionKey,
  recordHeardExposure,
} from "../law-exposure";
import { OFFICIAL_VIEW_BASE_POINTS as BASE_POINTS } from "../official-view-reads";
import { joinLawInterestGroup } from "./law-interest-groups";
import {
  activePartnershipsAt,
  activeWorkRelationshipsAt,
  householdMembershipsAt,
} from "../life-queries";
import { SYNTHETIC_MIND_IDS } from "../mind-catalog";
import { latestPersonalityTendency } from "../queries";
import { SeededRng, pickDistinct } from "../rng";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  LawExposureRecord,
  OfficialViewReason,
  OfficialViewRecord,
  World,
} from "../types";
import { affiliationAt } from "./party-evolution";

/**
 * People credit or blame the officials behind a law that reached them
 * (spec 5, "Views of officials").
 *
 * A few days after a law reaches someone, they reflect on it: the executive
 * who signed it, and the legislators whose votes they know of. Each reflection
 * is one dated row with its reasons. A person's view of an official is the
 * sum of their rows, and it never fades on its own; only new evidence moves
 * it. Nothing here is shown as a number: readers turn it into votes and talk.
 *
 * The weights are the provisional ones Claude CTO approved on September 28,
 * 2026 (00:35 EDT), each labeled below. Their sources stay in the research
 * checkpoint, not on player screens.
 */

const V = "official-view";

export {
  OFFICIAL_VIEW_TRANSITION_KEY,
  scheduleOfficialViewReflection,
} from "../law-exposure";
export {
  assertOfficialViewIntegrity,
  netViewOnLaw,
  townSupportFromViews,
  viewOfOfficial,
} from "../official-view-reads";

// PLACEHOLDER, approved provisional: executives carry the blame for a visible
// law they signed; a legislator's single vote carries less.
const EXECUTIVE_VISIBILITY = 1;
const LEGISLATOR_VISIBILITY = 0.6;
// PLACEHOLDER, approved provisional: about 11 percent of people can recall
// their state legislator, so blame for one vote reaches only an informed
// minority of those it touched. A close news follower is likelier to know;
// the two rates below keep the population average at 11 percent when 22
// percent follow closely.
const KNOWS_VOTE_CLOSE_FOLLOWER = 0.3;
const KNOWS_VOTE_OTHERS = (0.11 - 0.22 * KNOWS_VOTE_CLOSE_FOLLOWER) / 0.78;
// PLACEHOLDER, approved provisional (Pew 2024): the share who follow local
// news very closely, by age: 9 percent at 18 to 29, 35 percent at 65 and
// older, 22 percent overall (used for the ages between).
const FOLLOWS_CLOSELY_YOUNG = 0.09;
const FOLLOWS_CLOSELY_MIDDLE = 0.22;
const FOLLOWS_CLOSELY_OLDER = 0.35;
// PLACEHOLDER, approved provisional: people have about 2 to 4 political
// discussion partners, and about half talk politics at least a few times a
// week. Each of up to three people someone knows hears about the law with
// even odds.
const DISCUSSION_PARTNERS = 3;
const TELLS_EACH = 0.5;
// PLACEHOLDER: what a friend went through moves a view less than one's own
// or a family member's.
const FRIEND_SHARE = 0.25;
// PLACEHOLDER: a family member's paycheck is felt at home, less than one's own.
const FAMILY_SHARE = 0.5;
// PLACEHOLDER, approved provisional: partisans are anchored. Blame for their
// own party's official, and credit for the other party's, count half.
const PARTY_ANCHOR = 0.5;
// PLACEHOLDER: a money effect whose size next to pay is unknown is felt at a
// quarter of full weight rather than guessed.
const UNMEASURED_WEIGHT = 0.25;

interface OfficialAct {
  readonly officialId: EntityId;
  readonly act: OfficialViewRecord["act"];
  readonly executive: boolean;
}

export function officialViewReflectionHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== OFFICIAL_VIEW_TRANSITION_KEY)
    throw new Error("The official view handler received another transition.");
  const done = (
    next: World,
    reason: string,
  ): FutureTransitionHandlerResult => ({
    world: next,
    status: "resolved",
    reasonKey: `${V}:${reason}`,
    context: null,
    outcomeEventId: null,
  });
  const exposure = (world.history.lawExposures ?? []).find(
    (row) => officialViewReflectionKey(row) === dueItem.stableKey,
  );
  if (!exposure || !world.people[exposure.personId])
    return done(world, "exposure-not-present");
  if (
    world.control.kind === "person" &&
    world.control.personId === exposure.personId
  )
    return done(world, "controlled-person");
  let next = world;
  for (const act of officialsBehind(world, exposure.measureId)) {
    if (act.officialId === exposure.personId) continue;
    if (!act.executive && !knowsVote(world, exposure, act.officialId)) continue;
    const reasons = reasonsFor(world, exposure, act);
    if (reasons.length === 0) continue;
    next = append(next, {
      stableKey: `${V}:${exposure.id}:${act.officialId}`,
      personId: exposure.personId,
      officialId: act.officialId,
      measureId: exposure.measureId,
      act: act.act,
      exposureId: exposure.id,
      points: reasons.reduce((sum, reason) => sum + reason.points, 0),
      reasons,
    });
  }
  next = joinLawInterestGroup(next, exposure);
  if (exposure.relation === "own")
    for (const hearerId of hearersOf(world, exposure))
      next = recordHeardExposure(next, exposure, hearerId);
  return done(next, "reflected");
}

/** Who signed a law and how each simulated member voted on its passage. */
export function officialsBehind(
  world: World,
  measureId: EntityId,
): readonly OfficialAct[] {
  const acts: OfficialAct[] = [];
  for (const disposition of world.history.executiveDispositions ?? []) {
    if (disposition.measureId !== measureId || disposition.action !== "signed")
      continue;
    const signer = world.history.events
      .find((event) => event.involvedEntityIds.includes(disposition.id))
      ?.participants.find((row) => row.role === "focus:subject");
    if (signer && world.people[signer.personId])
      acts.push({
        officialId: signer.personId,
        act: "signed",
        executive: true,
      });
  }
  // A member's last passage or override vote on the law is the one they
  // answer for.
  const latest = new Map<EntityId, OfficialViewRecord["act"]>();
  for (const vote of world.history.legislativeVotes ?? []) {
    if (
      vote.measureId !== measureId ||
      (vote.purpose !== "floor-stage" && vote.purpose !== "veto-override")
    )
      continue;
    for (const row of vote.dispositions) {
      if (!row.personId || !world.people[row.personId]) continue;
      if (row.disposition === "yea") latest.set(row.personId, "voted-for");
      else if (row.disposition === "nay")
        latest.set(row.personId, "voted-against");
    }
  }
  for (const [officialId, act] of latest)
    if (!acts.some((row) => row.officialId === officialId))
      acts.push({ officialId, act, executive: false });
  return acts;
}

/** Whether this person learned how this legislator voted on the law. */
export function knowsVote(
  world: World,
  exposure: LawExposureRecord,
  officialId: EntityId,
): boolean {
  const rng = new SeededRng(world.seed).fork(
    `${V}:knows:${exposure.personId}:${exposure.measureId}:${officialId}`,
  );
  return (
    rng.next() <
    (followsNewsClosely(world, exposure.personId)
      ? KNOWS_VOTE_CLOSE_FOLLOWER
      : KNOWS_VOTE_OTHERS)
  );
}

/**
 * A person's news habit: whether they follow local news very closely. Seeded
 * once per person and shaped by age, so it holds across laws.
 * NOT MODELED: interests and temperament beyond age.
 */
export function followsNewsClosely(world: World, personId: EntityId): boolean {
  const person = world.people[personId];
  if (!person) return false;
  const age = ageOnDate(person.birthDate, world.currentDate);
  const share =
    age < 30
      ? FOLLOWS_CLOSELY_YOUNG
      : age >= 65
        ? FOLLOWS_CLOSELY_OLDER
        : FOLLOWS_CLOSELY_MIDDLE;
  return new SeededRng(world.seed).fork(`${V}:news:${personId}`).next() < share;
}

/**
 * The people someone knows, from the game's own records: the others in their
 * home who are not their partner (a partner already feels the law as family),
 * the people they work alongside, and anyone they have a recorded moment with.
 */
export function peopleKnownTo(
  world: World,
  personId: EntityId,
): readonly EntityId[] {
  const known = new Set<EntityId>();
  const partners = new Set(
    activePartnershipsAt(world, personId).flatMap((row) => row.personIds),
  );
  const homes = new Set(
    householdMembershipsAt(world, personId).map(
      (row) => row.membership.householdId,
    ),
  );
  for (const row of world.history.householdMemberships)
    if (
      homes.has(row.householdId) &&
      !partners.has(row.personId) &&
      world.people[row.personId] &&
      householdMembershipsAt(world, row.personId).some((active) =>
        homes.has(active.membership.householdId),
      )
    )
      known.add(row.personId);
  const workplaces = new Set(
    activeWorkRelationshipsAt(world, personId).flatMap((row) =>
      row.relationship.organizationId ? [row.relationship.organizationId] : [],
    ),
  );
  for (const row of world.history.workRelationships)
    if (
      row.organizationId &&
      workplaces.has(row.organizationId) &&
      world.people[row.personId] &&
      activeWorkRelationshipsAt(world, row.personId).some(
        (active) => active.relationship.organizationId === row.organizationId,
      )
    )
      known.add(row.personId);
  for (const row of world.history.relationshipInteractions)
    if (row.personIds.includes(personId))
      for (const other of row.personIds)
        if (world.people[other] && !partners.has(other)) known.add(other);
  known.delete(personId);
  return [...known].sort();
}

/** Whom a person tells about what a law did to them: seeded, at most three. */
function hearersOf(
  world: World,
  exposure: LawExposureRecord,
): readonly EntityId[] {
  // The player can hear it too; they just decide for themselves what it means.
  const known = peopleKnownTo(world, exposure.personId);
  const rng = new SeededRng(world.seed).fork(`${V}:tells:${exposure.id}`);
  const partners = pickDistinct(
    rng,
    known,
    Math.min(DISCUSSION_PARTNERS, known.length),
  );
  return partners.filter((personId) => rng.fork(personId).next() < TELLS_EACH);
}

function reasonsFor(
  world: World,
  exposure: LawExposureRecord,
  act: OfficialAct,
): readonly OfficialViewReason[] {
  // A cost blames whoever made it law and credits whoever voted against it; a
  // gain does the reverse.
  const made = act.act !== "voted-against";
  const sign = exposure.direction === "cost" ? (made ? -1 : 1) : made ? 1 : -1;
  const felt =
    felt01(exposure) *
    (act.executive ? EXECUTIVE_VISIBILITY : LEGISLATOR_VISIBILITY) *
    reactionLens(world, exposure.personId);
  const share =
    exposure.relation === "family"
      ? FAMILY_SHARE
      : exposure.relation === "friend"
        ? FRIEND_SHARE
        : 1;
  const own = Math.round(sign * BASE_POINTS * felt * share);
  if (own === 0) return [];
  const reasons: OfficialViewReason[] = [
    {
      kind: exposure.relation === "own" ? "personal" : exposure.relation,
      points: own,
    },
  ];
  const mine = affiliationAt(world, exposure.personId).partyOrganizationId;
  const theirs = affiliationAt(world, act.officialId).partyOrganizationId;
  if (mine !== null && theirs !== null) {
    const anchored =
      (mine === theirs && own < 0) || (mine !== theirs && own > 0);
    if (anchored) {
      const party = -Math.round(own * (1 - PARTY_ANCHOR));
      if (party !== 0) reasons.push({ kind: "party", points: party });
    }
  }
  return reasons;
}

/** How hard the law landed, 0 to 1: its money next to the person's pay. */
function felt01(exposure: LawExposureRecord): number {
  if (exposure.amount === null) return 0;
  const pay = exposure.monthlyPay?.minorUnits ?? 0;
  if (pay <= 0) return UNMEASURED_WEIGHT;
  // PLACEHOLDER: a law costing a tenth of a month's pay is felt fully; the
  // square root keeps small amounts noticeable.
  return Math.min(1, Math.sqrt((exposure.amount.minorUnits / pay) * 10));
}

/**
 * Personality is the lens, not the side: a reactive or combative person moves
 * further on the same law, a patient or conflict-averse one less.
 */
export function reactionLens(world: World, personId: EntityId): number {
  let factor = 1;
  const tempo = latestPersonalityTendency(
    world,
    personId,
    SYNTHETIC_MIND_IDS.tendencies.responseTempo,
  )?.expressionKey;
  // PLACEHOLDER multipliers.
  if (tempo === "reactive") factor *= 1.5;
  if (tempo === "patient") factor *= 0.75;
  const conflict = latestPersonalityTendency(
    world,
    personId,
    SYNTHETIC_MIND_IDS.tendencies.conflictApproach,
  )?.expressionKey;
  if (conflict === "combative") factor *= 1.25;
  if (conflict === "conflict-averse") factor *= 0.85;
  return factor;
}

function append(
  world: World,
  draft: Omit<OfficialViewRecord, "id" | "sequence" | "recordedAt">,
): World {
  const existing = world.history.officialViews ?? [];
  if (existing.some((row) => row.stableKey === draft.stableKey)) return world;
  const record: OfficialViewRecord = {
    ...draft,
    id: createStableId("official-view", `${world.id}:${draft.stableKey}`),
    sequence: world.history.nextSequence,
    recordedAt: world.currentDate,
  };
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      officialViews: [...existing, record],
    },
  };
}
