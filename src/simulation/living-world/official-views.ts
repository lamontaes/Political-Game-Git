import { addDays } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { createStableId } from "../ids";
import { SYNTHETIC_MIND_IDS } from "../mind-catalog";
import { latestPersonalityTendency } from "../queries";
import { SeededRng } from "../rng";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
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

export const OFFICIAL_VIEW_TRANSITION_KEY = "people:official-view-reflection";

const V = "official-view";

// PLACEHOLDER: "reflection happens within days" (spec 5); three days.
const REFLECTION_DAYS = 3;
// PLACEHOLDER: the points one fully felt law moves a view.
const BASE_POINTS = 20;
// PLACEHOLDER, approved provisional: executives carry the blame for a visible
// law they signed; a legislator's single vote carries less.
const EXECUTIVE_VISIBILITY = 1;
const LEGISLATOR_VISIBILITY = 0.6;
// PLACEHOLDER, approved provisional: about 11 percent of people can recall
// their state legislator, so blame for one vote reaches only an informed
// minority of those it touched.
const KNOWS_LEGISLATOR_VOTE = 0.11;
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

function reflectionKey(exposure: LawExposureRecord): string {
  return `${V}:reflect:${exposure.id}`;
}

/** Schedules the reflection on one exposure. The player decides their own mind. */
export function scheduleOfficialViewReflection(
  world: World,
  exposure: LawExposureRecord,
): World {
  if (exposure.direction === "none") return world;
  if (
    world.control.kind === "person" &&
    world.control.personId === exposure.personId
  )
    return world;
  const stableKey = reflectionKey(exposure);
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: addDays(world.currentDate, REFLECTION_DAYS),
    transitionKey: OFFICIAL_VIEW_TRANSITION_KEY,
    // The exposure itself is named in the key; due items reference people.
    entityIds: [exposure.personId],
    jurisdictionId: null,
    provenance: { kind: "initialization", reference: `${V}:reflect` },
  });
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
    (row) => reflectionKey(row) === dueItem.stableKey,
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
  return done(next, "reflected");
}

/** A person's standing view of an official: the sum of every reflection. */
export function viewOfOfficial(
  world: World,
  personId: EntityId,
  officialId: EntityId,
): { readonly points: number; readonly rows: readonly OfficialViewRecord[] } {
  const rows = (world.history.officialViews ?? []).filter(
    (row) => row.personId === personId && row.officialId === officialId,
  );
  return { points: rows.reduce((sum, row) => sum + row.points, 0), rows };
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
  return rng.next() < KNOWS_LEGISLATOR_VOTE;
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
    lens(world, exposure.personId);
  const own = Math.round(
    sign *
      BASE_POINTS *
      felt *
      (exposure.relation === "family" ? FAMILY_SHARE : 1),
  );
  if (own === 0) return [];
  const reasons: OfficialViewReason[] = [
    {
      kind: exposure.relation === "family" ? "family" : "personal",
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
function lens(world: World, personId: EntityId): number {
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

/**
 * Saved views must reconcile: real people, an exposure of this person to this
 * law that came first, and points that are the sum of their reasons.
 */
export function assertOfficialViewIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const exposures = new Map(
    (world.history.lawExposures ?? []).map((row) => [row.id, row]),
  );
  const keys = new Set<string>();
  for (const row of world.history.officialViews ?? []) {
    if (ids.has(row.id)) throw new Error(`Duplicate entity ID: ${row.id}`);
    ids.add(row.id);
    if (keys.has(row.stableKey))
      throw new Error("Duplicate official view identity.");
    keys.add(row.stableKey);
    if (!world.people[row.personId] || !world.people[row.officialId])
      throw new Error("An official view names a person not in the world.");
    const exposure = exposures.get(row.exposureId);
    if (
      !exposure ||
      exposure.personId !== row.personId ||
      exposure.measureId !== row.measureId ||
      exposure.sequence >= row.sequence
    )
      throw new Error("An official view must follow its law exposure.");
    if (
      row.reasons.length === 0 ||
      row.points !== row.reasons.reduce((sum, reason) => sum + reason.points, 0)
    )
      throw new Error("An official view's points are the sum of its reasons.");
  }
}

// PLACEHOLDER, approved provisional: an election weighs recent exposures more.
// No half-life was found, so a view formed in the half year before the vote
// counts half again as much.
const RECENT_DAYS = 183;
const RECENT_WEIGHT = 1.5;
// PLACEHOLDER: the most a town's views can raise or cut a candidate's support.
const MAX_SUPPORT_SHIFT = 0.5;

/**
 * What a town's residents think of a candidate, as a multiplier on their
 * support in a town count: 1 when nobody has reflected on anything they did.
 * The sum of residents' views, recent ones weighted more, is spread over every
 * grown resident the game has written for the town, so a view held by a few
 * moves the count a little and one held by many moves it a lot.
 */
export function townSupportFromViews(
  world: World,
  town: EntityId,
  candidateId: EntityId,
  electionDate: IsoDate,
): number {
  let residents = 0;
  const inTown = new Set<EntityId>();
  for (const personId of world.personOrder) {
    const person = world.people[personId];
    if (!person || person.homeJurisdictionId !== town) continue;
    inTown.add(personId);
    residents += 1;
  }
  if (residents === 0) return 1;
  const recentFrom = addDays(electionDate, -RECENT_DAYS);
  let weighted = 0;
  for (const row of world.history.officialViews ?? []) {
    if (row.officialId !== candidateId || !inTown.has(row.personId)) continue;
    if (row.recordedAt > electionDate) continue;
    weighted += row.points * (row.recordedAt >= recentFrom ? RECENT_WEIGHT : 1);
  }
  const shift = weighted / (residents * BASE_POINTS);
  return 1 + Math.max(-MAX_SUPPORT_SHIFT, Math.min(MAX_SUPPORT_SHIFT, shift));
}

/**
 * What the people a law reached made of one official's part in it: the net
 * points of every view of this official formed about this law.
 */
export function netViewOnLaw(
  world: World,
  officialId: EntityId,
  measureId: EntityId,
): number {
  let net = 0;
  for (const row of world.history.officialViews ?? [])
    if (row.officialId === officialId && row.measureId === measureId)
      net += row.points;
  return net;
}
