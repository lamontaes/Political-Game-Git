/**
 * Why a resident leaves town (A135, CTO ruling (j), October 1, 2026).
 *
 * Moving away is a decision, so no draw decides it. A resident leaves only
 * when a recorded cause pushes them past their own bar, and they go to that
 * cause's recorded place, never a drawn destination.
 *
 * The causes read from the record, each a sliding strength from 0 to 1:
 *
 * - a job offer elsewhere (`work:job-offer`): an offer from a recorded
 *   employer outside town still waiting for their answer (`job-offers.ts`),
 *   firmer the more it pays than their own work, at the offer's place.
 * - a lost job (`work:job-lost`): a job that ended in the last year for a
 *   reason other than quitting, retiring or dying, with no job since. It
 *   weighs more the longer they have been out of work and the less anyone
 *   else in the household earns.
 * - eviction (`cost:evicted`): an eviction judgment against them in the last
 *   year (`housing.evicted`, `town-rent.ts`).
 * - rent burden (`cost:rent-burden`): their household's rent against its
 *   recorded pay, rising smoothly above HUD's 30 percent cost-burden line.
 *   Unknown pay is not zero, so an unrecorded income is never read as burden.
 * - retirement (`life-course:retired`): a job they retired from in the last
 *   year, with no job since.
 * - a relative who moved away (`family:followed-kin`): a recorded move in
 *   the last year by a parent, child, sibling, grandparent or grandchild, to
 *   the place that relative now lives.
 * - a new household (`family:new-household`): in the last year they left a
 *   parent's home, moved in with a partner or moved out after a breakup
 *   (`living-world/town-families.ts`, `living-world/leaving-home.ts`), and
 *   live in that new home still. A household just formed has the least
 *   holding it; a breakup weighs more than a move in together.
 *
 * Where they go. An offer and a relative's move name their own place. A push
 * from a lost job, rent, eviction or retirement names none, so they go where
 * their closest living relative outside town lives today, and with nobody
 * there, to the rest of their own state (the most common long move: the
 * American Community Survey counts about half of movers between counties as
 * staying in their state). That last fallback is HARDWIRED until a producer
 * records a home found elsewhere (`MIGRATION_SEAMS`, `where-people-go`).
 *
 * The bar, against the causes, in one `evaluateDecision` with no randomness:
 * how rarely people their age in their state move (American Community
 * Survey 2024, `mover-rates-acs-2024.json`); a home they own; children at
 * home; their own taste for risk; and the town's pushes (waves, the state's
 * pressure, crime, jobs) on either side.
 *
 * - a home a disaster destroyed or damaged (`disaster:home-destroyed`,
 *   `disaster:home-damaged`): a disaster-damage record on their household or
 *   the dwelling they live in since the last review (`homeLostCause`). The
 *   household weighs it with its other causes against the same bar, so a
 *   renter with family elsewhere leaves a wrecked home sooner than an owner
 *   with children in school.
 *
 * NOT PRODUCED, filed as a gap: school elsewhere (an admission elsewhere is
 * not recorded, and an active enrollment holds a person in town,
 * `who-may-move`).
 */

import { addDays, ageOnDate, spokenDate } from "../dates";
import { evaluateDecision, isSelectedDecision } from "../decisions";
import {
  activeWorkRelationshipsAt,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  workRelationshipHistoryForPerson,
  workStatusAt,
} from "../life-queries";
import {
  householdHousingFacts,
  type HouseholdHousingFacts,
} from "../living-world/town-rent";
import {
  TOWN_JOB_END_REASONS,
  TOWN_JOB_ENDS_NOT_LOST,
} from "../living-world/town-labor-market";
import { LEAVING_HOME_EVENT } from "../living-world/leaving-home";
import { TOWN_FAMILY_EVENTS } from "../living-world/town-families";
import { employerDisplayName } from "../job-market";
import { monthlyPayByPerson } from "../living-world/town-rent";
import { traitConsiderations } from "../people-traits";
import { offerStrength, openOfferElsewhere } from "./job-offers";
import type {
  DecisionConsideration,
  DecisionEvaluation,
  DecisionImportance,
  EntityId,
  IsoDate,
  World,
} from "../types";
import moverRates from "../../../data/research/migration/mover-rates-acs-2024.json" with { type: "json" };
import { MIGRATION_MOVED_EVENT, type MoveReasonKey } from "./contract";

/** The event `town-rent.ts` writes when a household is evicted. */
const EVICTED_EVENT = "housing.evicted";

/** How far back a cause still weighs: a person is reviewed once a year. */
const CAUSE_WINDOW_DAYS = 365;

/**
 * PLACEHOLDER strengths (research: `why-americans-move-causes-and-strengths`)
 * of a household formed in the last year, by what formed it. The Current
 * Population Survey's reasons for moving count "to establish own household"
 * and "change in marital status" among the family reasons, and most such
 * moves stay in the county. So leaving home or moving in together is a
 * slight push that tips only somebody already near leaving, and a breakup a
 * moderate one.
 */
export const NEW_HOUSEHOLD_STRENGTH: Readonly<Record<string, number>> = {
  [LEAVING_HOME_EVENT]: 0.2,
  [TOWN_FAMILY_EVENTS.movedIn]: 0.2,
  [TOWN_FAMILY_EVENTS.brokeUp]: 0.3,
  [TOWN_FAMILY_EVENTS.divorced]: 0.3,
};

/**
 * PLACEHOLDER strengths (research: `disaster-displacement-and-return`) of a
 * home a disaster wrecked since the last review. After Hurricane Katrina many
 * households never came back (the owner, September 22, 2026); after most
 * disasters most households repair and stay. So a destroyed home is a strong
 * push that a home owned, children at home or a settled age can still hold
 * against, and a damaged one a slight push that tips only somebody already
 * near leaving.
 */
export const HOME_LOST_STRENGTH = {
  destroyed: 0.6,
  damaged: 0.2,
} as const;

/** The cause a home a disaster destroyed or damaged gives its household. */
export function homeLostCause(
  damageId: EntityId,
  level: keyof typeof HOME_LOST_STRENGTH,
): LeaveCause {
  return {
    kind: "home-lost",
    reason: `disaster:home-${level}`,
    strength: HOME_LOST_STRENGTH[level],
    causeId: damageId,
    placeId: null,
    explanation:
      level === "destroyed"
        ? "a disaster destroyed their home"
        : "a disaster damaged their home",
  };
}

const NEW_HOUSEHOLD_WORDS: Readonly<Record<string, string>> = {
  [LEAVING_HOME_EVENT]: "they moved out of a parent's home",
  [TOWN_FAMILY_EVENTS.movedIn]: "they moved in with their partner",
  [TOWN_FAMILY_EVENTS.brokeUp]: "they moved out after a breakup",
  [TOWN_FAMILY_EVENTS.divorced]: "they moved out after a divorce",
};

/** One recorded reason to leave, with its strength and its place. */
export interface LeaveCause {
  readonly kind:
    | "job-offer"
    | "job-lost"
    | "evicted"
    | "rent-burden"
    | "retired"
    | "kin-moved"
    | "new-household"
    | "home-lost";
  readonly reason: MoveReasonKey;
  /** 0 to 1, smooth in the facts it reads. */
  readonly strength: number;
  /** The record behind it: a work status, an event, or null for rent. */
  readonly causeId: EntityId | null;
  /** The place the cause names, when it names one. */
  readonly placeId: EntityId | null;
  /** In the words the decision records. */
  readonly explanation: string;
}

/**
 * What a review reads once and then per person: the last year's evictions
 * and moves, and the town's rent and pay. Built lazily; most reviews read
 * only the first part.
 */
export interface CauseReader {
  readonly causesFor: (personId: EntityId) => readonly LeaveCause[];
  readonly closestKinElsewhere: (
    personId: EntityId,
    town: EntityId,
  ) => { readonly placeId: EntityId; readonly label: string } | null;
}

/**
 * How close a relative is, from the kind of kinship on record: a parent or
 * child, a sibling, a grandparent or grandchild, anyone else.
 */
export function kinCloseness(kind: string): number {
  if (kind === "lineal:parent-child") return 1;
  if (kind === "collateral:sibling") return 0.75;
  if (kind === "lineal:grandparent-grandchild") return 0.5;
  return 0.25;
}

const KIN_WORD: Readonly<Record<string, string>> = {
  "lineal:parent-child": "a parent or child",
  "collateral:sibling": "a sibling",
  "lineal:grandparent-grandchild": "a grandparent or grandchild",
};

function clamp01(value: number): number {
  return value <= 0 ? 0 : value >= 1 ? 1 : value;
}

function placeName(world: World, id: EntityId): string {
  return world.jurisdictions[id]?.name ?? "another place";
}

/**
 * The last year's events of one type, newest first, read backwards from the
 * end of history and stopped at the first one recorded before the window:
 * the review never walks the whole history.
 */
function recentEvents(
  world: World,
  types: ReadonlySet<string>,
  since: IsoDate,
) {
  const events = world.history.events;
  const found = [];
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]!;
    if (event.recordedAt < since) break;
    if (types.has(event.type) && event.occurredAt >= since) found.push(event);
  }
  return found;
}

export function causeReader(world: World, town: EntityId): CauseReader {
  const today = world.currentDate;
  const since = addDays(today, -CAUSE_WINDOW_DAYS);
  const dead = new Set(world.history.personDeaths.map((d) => d.personId));

  // Evictions, moves and new households in the last year, once.
  const evicted = new Map<EntityId, EntityId>();
  const kinMoved = new Map<EntityId, LeaveCause>();
  const formed = new Map<EntityId, (typeof world.history.events)[number]>();
  for (const event of recentEvents(
    world,
    new Set([
      EVICTED_EVENT,
      MIGRATION_MOVED_EVENT,
      ...Object.keys(NEW_HOUSEHOLD_STRENGTH),
    ]),
    since,
  )) {
    if (event.type in NEW_HOUSEHOLD_STRENGTH) {
      // Newest first: the latest household each person formed.
      for (const row of event.participants)
        if (!formed.has(row.personId)) formed.set(row.personId, event);
      continue;
    }
    if (event.type === EVICTED_EVENT) {
      for (const row of event.participants)
        if (!evicted.has(row.personId)) evicted.set(row.personId, event.id);
      continue;
    }
    const to = event.tags.find((tag) => tag.startsWith("to:"))?.slice(3) as
      EntityId | undefined;
    if (!to || to === town || !world.jurisdictions[to]) continue;
    for (const row of event.participants) {
      const mover = world.people[row.personId];
      if (!mover || dead.has(mover.id) || mover.homeJurisdictionId !== to)
        continue;
      for (const kin of kinshipRelationshipsAt(world, mover.id)) {
        const relativeId = kin.personIds.find((id) => id !== mover.id)!;
        const relative = world.people[relativeId];
        if (!relative || relative.homeJurisdictionId !== town) continue;
        if (event.participants.some((p) => p.personId === relativeId)) continue;
        const strength = kinCloseness(kin.kind);
        const held = kinMoved.get(relativeId);
        if (held && held.strength >= strength) continue;
        kinMoved.set(relativeId, {
          kind: "kin-moved",
          reason: "family:followed-kin",
          strength,
          causeId: event.id,
          placeId: to,
          explanation: `${KIN_WORD[kin.kind] ?? "a relative"}, ${mover.givenName} ${mover.familyName}, moved to ${placeName(world, to)} on ${spokenDate(event.occurredAt)}`,
        });
      }
    }
  }

  let housing: Map<EntityId, HouseholdHousingFacts> | null = null;
  const householdFacts = (personId: EntityId) => {
    const household = householdMembershipsAt(world, personId).find(
      (active) => active.state.residenceRole === "primary",
    )?.household.id;
    if (!household) return null;
    housing ??= householdHousingFacts(world, today);
    return housing.get(household) ?? null;
  };

  const endedWork = (personId: EntityId) => {
    if (activeWorkRelationshipsAt(world, personId).length > 0) return [];
    return workRelationshipHistoryForPerson(world, personId).flatMap((job) => {
      const status = workStatusAt(world, job.id);
      return status?.status === "ended" && status.effectiveAt > since
        ? [status]
        : [];
    });
  };

  let pay: ReadonlyMap<EntityId, number> | null = null;
  const payByPerson = () => (pay ??= monthlyPayByPerson(world, today));

  return {
    causesFor(personId) {
      const causes: LeaveCause[] = [];
      // An offer of work elsewhere names its own place, so it comes first.
      const offer = openOfferElsewhere(world, personId, town, payByPerson);
      if (offer)
        causes.push({
          kind: "job-offer",
          reason: "work:job-offer",
          strength: offerStrength(offer),
          causeId: offer.eventId,
          placeId: offer.placeId,
          explanation: `${employerDisplayName(world, offer.employer)} offered them ${offer.title.toLowerCase()} work in ${placeName(world, offer.placeId)}`,
        });
      const ended = endedWork(personId);
      const lost = ended
        .filter((status) => !TOWN_JOB_ENDS_NOT_LOST.has(status.reason ?? ""))
        .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))[0];
      if (lost) {
        // Longer out of work weighs more; a household that still has pay
        // coming in weighs it less.
        const days = Math.max(
          0,
          (Date.parse(today) - Date.parse(lost.effectiveAt)) / 86_400_000,
        );
        const facts = householdFacts(personId);
        const cushion = facts?.payMinor ? 0.5 : 1;
        causes.push({
          kind: "job-lost",
          reason: "work:job-lost",
          strength: clamp01((0.4 + (0.6 * days) / 180) * cushion),
          causeId: lost.id,
          placeId: null,
          explanation: `their job ended on ${spokenDate(lost.effectiveAt)} and they have found no other`,
        });
      }
      const retired = ended.find(
        (status) => status.reason === TOWN_JOB_END_REASONS.retired,
      );
      if (retired && !lost)
        causes.push({
          kind: "retired",
          reason: "life-course:retired",
          strength: 0.5,
          causeId: retired.id,
          placeId: null,
          explanation: `they retired on ${spokenDate(retired.effectiveAt)}`,
        });
      const eviction = evicted.get(personId);
      if (eviction)
        causes.push({
          kind: "evicted",
          reason: "cost:evicted",
          strength: 0.75,
          causeId: eviction,
          placeId: null,
          explanation: "they were evicted from their home this year",
        });
      const facts = householdFacts(personId);
      if (facts?.rentMinor && facts.payMinor) {
        // HUD: over 30 percent of income is cost-burdened, over half
        // severely. The weight rises smoothly from the first line.
        const share = facts.rentMinor / facts.payMinor;
        const strength = clamp01((share - 0.3) / 0.5);
        if (strength > 0)
          causes.push({
            kind: "rent-burden",
            reason: "cost:rent-burden",
            strength,
            causeId: null,
            placeId: null,
            explanation: `the rent takes ${Math.round(share * 100)} percent of what the household earns`,
          });
      }
      const kin = kinMoved.get(personId);
      if (kin) causes.push(kin);
      // Only the one who moved: their home now is one they joined that day
      // or after.
      const event = formed.get(personId);
      const home = event
        ? householdMembershipsAt(world, personId).find(
            (active) => active.state.residenceRole === "primary",
          )
        : undefined;
      if (event && home && home.membership.startedAt >= event.occurredAt)
        causes.push({
          kind: "new-household",
          reason: "family:new-household",
          strength: NEW_HOUSEHOLD_STRENGTH[event.type]!,
          causeId: event.id,
          placeId: null,
          explanation: `${NEW_HOUSEHOLD_WORDS[event.type]} on ${spokenDate(event.occurredAt)}`,
        });
      return causes;
    },
    closestKinElsewhere(personId, home) {
      let best: {
        placeId: EntityId;
        label: string;
        closeness: number;
      } | null = null;
      for (const kin of kinshipRelationshipsAt(world, personId)) {
        const relativeId = kin.personIds.find((id) => id !== personId)!;
        const relative = world.people[relativeId];
        if (!relative || dead.has(relativeId)) continue;
        const placeId = relative.homeJurisdictionId;
        if (placeId === home || !world.jurisdictions[placeId]) continue;
        const closeness = kinCloseness(kin.kind);
        if (
          best &&
          (best.closeness > closeness ||
            (best.closeness === closeness && best.placeId <= placeId))
        )
          continue;
        best = {
          placeId,
          closeness,
          label: `${KIN_WORD[kin.kind] ?? "a relative"}, ${relative.givenName} ${relative.familyName}, lives there`,
        };
      }
      return best ? { placeId: best.placeId, label: best.label } : null;
    },
  };
}

/** A sliding strength in the decision layer's own steps. */
export function importanceOf(strength: number): DecisionImportance | null {
  if (strength >= 0.75) return "decisive";
  if (strength >= 0.5) return "strong";
  if (strength >= 0.25) return "moderate";
  if (strength > 0) return "slight";
  return null;
}

/** What the person weighs on staying beside the causes. */
export interface LeaveBar {
  /** The yearly share of people their age in their state who move away. */
  readonly ageMoverRate: number;
  readonly ownsHome: boolean;
  readonly childrenAtHome: number;
  /** The town's pushes multiplied: above 1 pushes out, below holds. */
  readonly townPush: number;
}

/**
 * MEASURED: the age at which leaving weighs least is the one the nation moves
 * most at, 18 and 19 (American Community Survey 2024, table B07401, the
 * national row of `mover-rates-acs-2024.json`). A resident's age bar is how
 * far their own state's rate for their age falls below that peak, so a state
 * where people move less holds its people more.
 */
export const AGE_RATE_FOR_NO_BAR = Math.max(
  ...Object.values(
    moverRates.national.departurePerYearByAge as Readonly<
      Record<string, number>
    >,
  ),
);

export interface LeaveDecision {
  readonly leaves: boolean;
  readonly evaluation: DecisionEvaluation;
  /** The cause that weighs most, which names the reason and record. */
  readonly lead: LeaveCause;
  readonly why: string;
}

/**
 * Whether one resident with recorded causes leaves for `placeId`, from the
 * causes against their bar. Pure: it reads and writes nothing else.
 */
export function decideToLeave(
  world: World,
  personId: EntityId,
  stableKey: string,
  causes: readonly LeaveCause[],
  bar: LeaveBar,
  place: { readonly placeId: EntityId; readonly label: string },
): LeaveDecision {
  const considerations: DecisionConsideration[] = [];
  const add = (
    key: string,
    optionKey: "leave" | "keep-home",
    strength: number,
    explanation: string,
    confidence: "low" | "medium" | "high" = "high",
  ) => {
    const importance = importanceOf(strength);
    if (!importance) return;
    considerations.push({
      stableKey: `${stableKey}:${key}`,
      optionKey,
      sourceType: `context:${key.split(":")[0]}`,
      direction: "supports",
      importance,
      confidence,
      explanation,
      sourceRefs: [],
    });
  };
  for (const cause of causes)
    add(
      `cause:${cause.kind}`,
      "leave",
      cause.strength,
      cause.explanation,
      // PLACEHOLDER(research: why-americans-move-causes-and-strengths): an
      // offer is a promise about a place they have not lived, weighed with
      // less certainty than what has already happened to them.
      cause.kind === "job-offer" ? "medium" : "high",
    );
  add(
    "bar:age",
    "keep-home",
    clamp01(1 - bar.ageMoverRate / AGE_RATE_FOR_NO_BAR),
    `few people their age in their state move away (${Math.round(bar.ageMoverRate * 1000) / 10} percent a year)`,
    // HARDWIRED, a PLACEHOLDER(research: why-americans-move-causes-and-
    // strengths): what a person sees of their age group is weighed with
    // less certainty than what happened to them.
    "medium",
  );
  if (bar.ownsHome)
    add(
      "bar:owns-home",
      "keep-home",
      0.5,
      "they own their home",
      // PLACEHOLDER(research: why-americans-move-causes-and-strengths).
      "medium",
    );
  if (bar.childrenAtHome > 0)
    add(
      "bar:children",
      "keep-home",
      clamp01(0.25 * bar.childrenAtHome),
      "they have children at home",
      "medium",
    );
  if (bar.townPush > 1)
    add(
      "town:push",
      "leave",
      clamp01(bar.townPush - 1),
      "the town and state are pushing people out",
      "medium",
    );
  else if (bar.townPush < 1)
    add(
      "town:hold",
      "keep-home",
      clamp01(1 - bar.townPush),
      "the town and state are holding people",
      "medium",
    );
  considerations.push(
    ...traitConsiderations(world, personId, stableKey, [
      {
        optionKey: "leave",
        trait: "risk",
        pole: "high",
        explanation: "They will take a chance on somewhere new.",
      },
      {
        optionKey: "keep-home",
        trait: "risk",
        pole: "low",
        explanation: "They would rather keep what they know.",
      },
    ]),
  );
  const evaluation = evaluateDecision(world, {
    stableKey,
    decisionType: "migration.leave-town",
    actorPersonId: personId,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    subject: { kind: "context:move", key: place.placeId, entityId: null },
    options: [
      {
        key: "leave",
        label: "Move away",
        description: `Leave town for ${placeName(world, place.placeId)}.`,
      },
      {
        // Ties break by key, so an even weighing keeps the home.
        key: "keep-home",
        label: "Stay",
        description: "Stay in town.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
  const lead = [...causes].sort(
    (a, b) => b.strength - a.strength || a.kind.localeCompare(b.kind),
  )[0]!;
  const leaves =
    isSelectedDecision(evaluation) && evaluation.selectedOptionKey === "leave";
  return {
    leaves,
    evaluation,
    lead,
    why:
      lead.placeId === place.placeId
        ? lead.explanation
        : `${lead.explanation}, and ${place.label}`,
  };
}

/** A resident's age today, for the bar. */
export function residentAge(world: World, personId: EntityId): number {
  return ageOnDate(world.people[personId]!.birthDate, world.currentDate);
}
