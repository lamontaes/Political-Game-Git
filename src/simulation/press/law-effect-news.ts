import { addDays, spokenDate } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import { recordsByStringField } from "../history-index";
import { householdMembershipsAt } from "../life-queries";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../life-places";
import {
  OUTCOME_LINKS,
  outcomeFactor,
  outcomeLinkStatus,
} from "../outcome-web";
import {
  PLACE_OUTCOME_BASES,
  placeOutcomeAt,
  type PlaceOutcomeMeasureBase,
} from "../outcome-web/place-outcome-store";
import { measureAnswersAt } from "../vote-bundle";
import { recordWorldEvent } from "../world";
import { mediaOutlets } from "./outlets";
import { LAW_EFFECT_EVENT_TYPE } from "./shared";

export { LAW_EFFECT_EVENT_TYPE };
import type {
  EntityId,
  HistoricalEvent,
  IsoDate,
  LawExposureRecord,
  LegislativeEnactmentRecord,
  ResourceEndpoint,
  ResourceFlow,
  ResourceFlowTermsRecord,
  World,
} from "../types";

/**
 * A law that changed something for the people of a town is news there.
 *
 * Every lane that makes a law act on people leaves one of two records, and
 * this reads both, so a lane wired tomorrow reaches the paper with no change
 * here:
 * 1. a law exposure (`law-exposure.ts`), the contract for "an enacted law
 *    reached this person": a tax collected, a benefit paid, a paycheck
 *    withheld;
 * 2. new terms on a money flow whose provenance is the law's enactment
 *    (`town-pay.ts`, `job-market.ts`, `town-rent.ts`, `office-salary.ts`): a
 *    raise to the minimum wage, a rent held down, an office's salary.
 *
 * Once a week, before the desk sweeps, the records written since the last
 * sweep are grouped by law and by the town the people live in. Each group a
 * paper has not already had becomes one public record in that town, which the
 * town's paper and the state's papers judge like any other development. It
 * names nobody: the story is how many people the law reached and how much
 * money moved, not who.
 *
 * Game rules, labeled:
 * - HAND-SET: a law that moved residents' money records `importance:notable`,
 *   the same scale a notable development records, so it is not held to the
 *   desk's one routine item a week. Real papers report a minimum-wage rise or
 *   a new tax the week it lands; how much space it gets is still the desk's.
 * - HAND-SET: one record per law, town and step. A law reaching the same
 *   people again (a tax collected every month) is not news again; a law that
 *   changes the same paycheck again (a phase-in's next step) is.
 * - The counts are the people the game tracks in the town, not the town's
 *   whole population: the game follows a sample of each town's residents.
 */

export const LAW_EFFECT_NEWS_VERSION = "law-effect-news-v1";
export const LAW_EFFECT_MEASURE_TAG = "law-effect:measure:";
const LAW_EFFECT_STEP_TAG = "law-effect:step:";

type Reach =
  | "pay"
  | "rent"
  | "payment"
  | "tax-payment"
  | "benefit"
  | "paycheck"
  | "job-rule"
  | "business-rule"
  | "public-service";

interface Touch {
  readonly measureId: EntityId;
  readonly town: EntityId;
  readonly personIds: readonly EntityId[];
  readonly reach: Reach;
  /** A change in a recurring amount (flow terms), per payment. */
  readonly changeMinor: number | null;
  /** Money that moved once (an exposure's amount). */
  readonly movedMinor: number | null;
  readonly step: string;
  readonly reason: string | null;
}

/**
 * Writes this week's law-effect records. `sinceSequence` is the history
 * sequence the previous sweep saw up to; only records after it are read.
 */
export function reportLawEffects(world: World, sinceSequence: number): World {
  const enactments = enactmentsByEvent(world);
  if (enactments.size === 0) return world;
  const touches = [
    ...flowTermTouches(world, sinceSequence, enactments),
    ...exposureTouches(world, sinceSequence),
  ];
  if (touches.length === 0) return world;
  const groups = new Map<string, Touch[]>();
  for (const touch of touches) {
    const key = `${touch.measureId}|${touch.town}|${touch.reach}|${touch.step}`;
    const list = groups.get(key) ?? [];
    list.push(touch);
    groups.set(key, list);
  }
  const reported = reportedKeys(world);
  let next = world;
  for (const [key, group] of [...groups].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const stableKey = `${LAW_EFFECT_NEWS_VERSION}:${key}`;
    if (reported.has(stableKey)) continue;
    next = recordLawEffect(next, stableKey, group);
  }
  return next;
}

function enactmentsByEvent(
  world: World,
): ReadonlyMap<EntityId, LegislativeEnactmentRecord> {
  const byEvent = new Map<EntityId, LegislativeEnactmentRecord>();
  for (const enactment of world.history.legislativeEnactments ?? [])
    if (enactment.outcome === "enacted")
      byEvent.set(enactment.outcomeEventId, enactment);
  return byEvent;
}

function reportedKeys(world: World): ReadonlySet<string> {
  return new Set(
    recordsByStringField(
      world.history.events,
      "type",
      LAW_EFFECT_EVENT_TYPE,
    ).map((event) => event.stableKey),
  );
}

function flowTermTouches(
  world: World,
  sinceSequence: number,
  enactments: ReadonlyMap<EntityId, LegislativeEnactmentRecord>,
): Touch[] {
  const terms = world.history.resourceFlowTerms;
  const touches: Touch[] = [];
  let flows: Map<EntityId, ResourceFlow> | null = null;
  let termsById: Map<EntityId, ResourceFlowTermsRecord> | null = null;
  let steps: ReadonlyMap<EntityId, number> | null = null;
  for (let index = terms.length - 1; index >= 0; index -= 1) {
    const row = terms[index]!;
    if (row.sequence <= sinceSequence) break;
    if (row.provenance.kind !== "simulated-event") continue;
    const enactment = enactments.get(row.provenance.eventId);
    if (!enactment || !row.supersedesTermsId) continue;
    flows ??= new Map(world.history.resourceFlows.map((f) => [f.id, f]));
    termsById ??= new Map(terms.map((t) => [t.id, t]));
    const flow = flows.get(row.resourceFlowId);
    const before = termsById.get(row.supersedesTermsId);
    if (!flow || !before) continue;
    const change = row.amount.minorUnits - before.amount.minorUnits;
    if (change === 0) continue;
    // Whose money the law changed: the worker paid, or the household paying.
    const side =
      flow.recipient.kind === "person" ? flow.recipient : flow.source;
    const personIds = peopleOf(world, side);
    const town = townOf(world, personIds, flow);
    if (!town || personIds.length === 0) continue;
    // Which change this is for this flow under this law: a phase-in's next
    // step is a new story, the same step reaching more people is not.
    steps ??= lawStepOrdinals(terms, enactments);
    const earlier = steps.get(row.id) ?? 0;
    touches.push({
      measureId: enactment.measureId,
      town,
      personIds,
      reach:
        flow.basisReference.kind === "work"
          ? "pay"
          : flow.basisKind.startsWith("housing:")
            ? "rent"
            : "payment",
      changeMinor: change,
      movedMinor: null,
      step: String(earlier),
      reason: row.reason,
    });
  }
  return touches;
}

/** For each law-set terms row, how many earlier rows the same law set on its flow. */
function lawStepOrdinals(
  terms: readonly ResourceFlowTermsRecord[],
  enactments: ReadonlyMap<EntityId, LegislativeEnactmentRecord>,
): ReadonlyMap<EntityId, number> {
  const seen = new Map<string, number>();
  const ordinals = new Map<EntityId, number>();
  for (const row of terms) {
    if (row.provenance.kind !== "simulated-event") continue;
    if (!enactments.has(row.provenance.eventId)) continue;
    const key = `${row.resourceFlowId}|${row.provenance.eventId}`;
    const count = seen.get(key) ?? 0;
    ordinals.set(row.id, count);
    seen.set(key, count + 1);
  }
  return ordinals;
}

function exposureTouches(world: World, sinceSequence: number): Touch[] {
  const exposures = world.history.lawExposures ?? [];
  const touches: Touch[] = [];
  let termIds: Set<EntityId> | null = null;
  for (let index = exposures.length - 1; index >= 0; index -= 1) {
    const row: LawExposureRecord = exposures[index]!;
    if (row.sequence <= sinceSequence) break;
    if (row.relation !== "own") continue;
    // An exposure written from a law-set pay or rent row repeats that row,
    // which `flowTermTouches` already reads: one change is one story.
    termIds ??= new Set(world.history.resourceFlowTerms.map((t) => t.id));
    if (termIds.has(row.sourceRecordId)) continue;
    const person = world.people[row.personId];
    if (!person) continue;
    touches.push({
      measureId: row.measureId,
      town: person.homeJurisdictionId,
      personIds: [row.personId],
      reach: row.channel,
      changeMinor: null,
      movedMinor: row.amount
        ? row.direction === "cost"
          ? -row.amount.minorUnits
          : row.amount.minorUnits
        : null,
      step: "0",
      reason: null,
    });
  }
  return touches;
}

function peopleOf(world: World, endpoint: ResourceEndpoint): EntityId[] {
  if (endpoint.kind === "person")
    return world.people[endpoint.personId] ? [endpoint.personId] : [];
  if (endpoint.kind !== "household") return [];
  const members = new Set<EntityId>();
  for (const row of world.history.householdMemberships)
    if (row.householdId === endpoint.householdId && world.people[row.personId])
      members.add(row.personId);
  return [...members]
    .filter((personId) =>
      householdMembershipsAt(world, personId).some(
        (active) => active.membership.householdId === endpoint.householdId,
      ),
    )
    .sort();
}

function townOf(
  world: World,
  personIds: readonly EntityId[],
  flow: ResourceFlow,
): EntityId | null {
  const first = personIds[0];
  if (first) return world.people[first]!.homeJurisdictionId;
  return flow.jurisdictionId;
}

function recordLawEffect(
  world: World,
  stableKey: string,
  group: readonly Touch[],
): World {
  const first = group[0]!;
  const measure = world.history.legislativeMeasures?.find(
    (row) => row.id === first.measureId,
  );
  if (!measure) return world;
  const enactment = world.history.legislativeEnactments?.find(
    (row) => row.measureId === first.measureId,
  );
  const people = new Set(group.flatMap((touch) => touch.personIds));
  const count = people.size;
  const law = enactment?.actDesignation ?? measure.designation;
  // The place is the record's own; a paper adds it where its readers need it.
  const summary = `${law} ${effectPhrase(group, count)}.`;
  const detail = detailSentence(world, group, enactment);
  return recordWorldEvent(world, {
    stableKey,
    type: LAW_EFFECT_EVENT_TYPE,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: first.town,
    // The people it reached are kept, not named: they are the story's readers.
    involvedEntityIds: [first.town, ...[...people].sort()],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      LAW_EFFECT_NEWS_VERSION,
      `${LAW_EFFECT_MEASURE_TAG}${first.measureId}`,
      `${LAW_EFFECT_STEP_TAG}${first.step}`,
      `law-effect:reach:${first.reach}`,
      `law-effect:people:${count}`,
      "importance:notable",
    ],
    summary,
    context: {
      location: null,
      socialContext: detail,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function dollars(minor: number): string {
  const value = Math.abs(minor) / 100;
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function effectPhrase(group: readonly Touch[], count: number): string {
  const reach = group[0]!.reach;
  const changes = group
    .map((touch) => touch.changeMinor)
    .filter((value): value is number => value !== null);
  const moved = group.reduce(
    (total, touch) => total + (touch.movedMinor ?? 0),
    0,
  );
  const rose = changes.filter((value) => value > 0).length;
  const fell = changes.filter((value) => value < 0).length;
  const verb =
    rose > 0 && fell === 0
      ? "raised"
      : fell > 0 && rose === 0
        ? "cut"
        : "changed";
  switch (reach) {
    case "pay":
      return `${verb} pay for ${plural(count, "worker", "workers")}`;
    case "rent":
      return changes.length > 0
        ? `set the rent for ${plural(count, "resident", "residents")}`
        : `changed the rent ${plural(count, "resident pays", "residents pay")}`;
    case "payment":
      return `${verb} payments for ${plural(count, "resident", "residents")}`;
    case "tax-payment":
      return `collected ${dollars(moved)} in tax from ${plural(count, "resident", "residents")}`;
    case "benefit":
      return `paid ${dollars(moved)} in benefits to ${plural(count, "resident", "residents")}`;
    case "paycheck":
      return `changed the paychecks of ${plural(count, "resident", "residents")}`;
    case "job-rule":
      return `changed the rules at work for ${plural(count, "resident", "residents")}`;
    case "business-rule":
      return `changed the rules for ${plural(count, "local business owner", "local business owners")}`;
    case "public-service":
      return `changed a public service for ${plural(count, "resident", "residents")}`;
  }
}

/**
 * The lane's own words for one of the changes, the average change where the
 * records carry one, and when the law passed and took effect.
 */
function detailSentence(
  world: World,
  group: readonly Touch[],
  enactment: LegislativeEnactmentRecord | undefined,
): string {
  const parts: string[] = [];
  const reasons = new Map<string, number>();
  for (const touch of group)
    if (touch.reason)
      reasons.set(touch.reason, (reasons.get(touch.reason) ?? 0) + 1);
  const reason = [...reasons].sort(
    ([a, left], [b, right]) => right - left || a.localeCompare(b),
  )[0]?.[0];
  if (reason) parts.push(reason);
  const changes = group
    .map((touch) => touch.changeMinor)
    .filter((value): value is number => value !== null);
  if (changes.length > 0) {
    const average = Math.round(
      changes.reduce((total, value) => total + value, 0) / changes.length,
    );
    const each = group[0]!.reach === "pay" ? "a paycheck" : "a payment";
    parts.push(
      `The change averaged ${dollars(average)} ${average >= 0 ? "more" : "less"} ${each}.`,
    );
  }
  if (enactment?.effectiveAt)
    parts.push(
      `The law was enacted on ${spokenDate(enactment.resolvedAt)} and took effect on ${spokenDate(enactment.effectiveAt)}.`,
    );
  return parts.join(" ") || "The law took effect.";
}

/** Whether an event is a law-effect record this module wrote. */
export function isLawEffectEvent(event: HistoricalEvent): boolean {
  return event.type === LAW_EFFECT_EVENT_TYPE;
}

/*
 * The other half: a law that moves a place's outcomes.
 *
 * Most laws do not touch a paycheck or a rent; they move a place's outcomes
 * through the outcome web (a voucher law and math scores, housing first and
 * homelessness). A year after such a law took effect, each paper in a place it
 * governs reports where each outcome it moves stands, against the month before
 * it took effect. The paper reports the two readings and the law; it does not
 * claim the law caused the difference.
 *
 * Game rules, labeled:
 * - HAND-SET: the story runs on the law's first anniversary, the point at
 *   which papers commonly look back at a new law. A sweep that runs late
 *   still writes it within LOOK_BACK_WINDOW_DAYS; it is never written twice.
 * - Only an outcome the law actually moved in that place counts: its link is
 *   built and its factor there today differs from the day before the law took
 *   effect, so a repeal that ends an effect is news as well.
 */

const OUTCOME_STORY_AFTER_DAYS = 365;
/** HAND-SET: how late a sweep may still write an anniversary story. */
const LOOK_BACK_WINDOW_DAYS = 30;
const LAW_CAUSE_PREFIX = "law:";

/** Writes the anniversary records of laws that moved a place's outcomes. */
export function reportLawOutcomes(world: World): World {
  const places = [
    ...new Set(
      mediaOutlets(world)
        .filter(
          (outlet) => outlet.scope === "local" || outlet.scope === "state",
        )
        .flatMap((outlet) => outlet.primaryJurisdictionIds),
    ),
  ].sort();
  if (places.length === 0) return world;
  const reported = reportedKeys(world);
  let next = world;
  for (const finding of lawOutcomeFindings(world, places))
    if (!reported.has(finding.stableKey))
      next = recordLawOutcome(next, finding);
  return next;
}

export interface LawOutcomeFinding {
  readonly stableKey: string;
  readonly enactment: LegislativeEnactmentRecord;
  readonly question: string;
  readonly answer: string;
  readonly outcome: string;
  readonly place: EntityId;
  readonly before: number;
  readonly after: number;
}

/**
 * Every outcome a law moves in one of `places` whose first anniversary in
 * force fell in the look-back window, with its reading the month before the
 * law took effect and today. Read-only.
 */
export function lawOutcomeFindings(
  world: World,
  places: readonly EntityId[],
): readonly LawOutcomeFinding[] {
  const earliest = addDays(world.currentDate, -LOOK_BACK_WINDOW_DAYS);
  const propositions = new Map(
    Object.values(world.policyCatalog?.propositions ?? {}).map(
      (definition) => [definition.id, definition] as const,
    ),
  );
  const findings: LawOutcomeFinding[] = [];
  for (const enactment of world.history.legislativeEnactments ?? []) {
    if (enactment.outcome !== "enacted" || !enactment.effectiveAt) continue;
    const anniversary = addDays(
      enactment.effectiveAt,
      OUTCOME_STORY_AFTER_DAYS,
    );
    if (anniversary > world.currentDate || anniversary <= earliest) continue;
    const before = addDays(enactment.effectiveAt, -1);
    for (const answer of measureAnswersAt(
      world,
      enactment.measureId,
      enactment.sequence,
    )) {
      const proposition = propositions.get(answer.propositionId);
      if (!proposition) continue;
      const cause = `${LAW_CAUSE_PREFIX}${proposition.stableKey}`;
      const outcomes = [
        ...new Set(
          OUTCOME_LINKS.filter(
            (link) =>
              link.from === cause && outcomeLinkStatus(link) === "built",
          ).map((link) => link.to),
        ),
      ]
        .filter((outcome) => PLACE_OUTCOME_BASES[outcome])
        .sort();
      if (outcomes.length === 0) continue;
      for (const place of places) {
        if (
          lawInForce(world, place, proposition.id)?.measureId !==
          enactment.measureId
        )
          continue;
        for (const outcome of outcomes) {
          // The law moved it: this link's factor differs from the day before
          // the law took effect. A repeal back to where the place began moves
          // it too, the other way.
          const factorOn = (date: IsoDate) =>
            outcomeFactor(world, place, outcome, date).causes.find(
              (row) => row.from === cause,
            )?.factor ?? 1;
          if (factorOn(world.currentDate) === factorOn(before)) continue;
          const then = placeOutcomeAt(world, outcome, place, before);
          const now = placeOutcomeAt(world, outcome, place, world.currentDate);
          if (!then || !now) continue;
          findings.push({
            stableKey: `${LAW_EFFECT_NEWS_VERSION}:outcome:${enactment.measureId}|${proposition.stableKey}|${outcome}|${place}`,
            enactment,
            question: proposition.name,
            answer: answer.answer,
            outcome,
            place,
            before: then.value,
            after: now.value,
          });
        }
      }
    }
  }
  return findings;
}

function recordLawOutcome(world: World, input: LawOutcomeFinding): World {
  const measure = world.history.legislativeMeasures?.find(
    (row) => row.id === input.enactment.measureId,
  );
  if (!measure) return world;
  const definition = PLACE_OUTCOME_BASES[input.outcome]!;
  const law = input.enactment.actDesignation ?? measure.designation;
  const summary = `A year after ${law} took effect, the figure for ${measureName(definition)} is ${valueText(definition, input.after)}, against ${valueText(definition, input.before)} the month before.`;
  const detail = `${law} answered “${input.question}” ${input.answer}. It was enacted on ${spokenDate(input.enactment.resolvedAt)} and took effect on ${spokenDate(input.enactment.effectiveAt!)}.`;
  return recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: LAW_EFFECT_EVENT_TYPE,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.place,
    involvedEntityIds: [input.place],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      LAW_EFFECT_NEWS_VERSION,
      `${LAW_EFFECT_MEASURE_TAG}${input.enactment.measureId}`,
      `law-effect:outcome:${input.outcome}`,
      "importance:notable",
    ],
    summary,
    context: {
      location: null,
      socialContext: detail,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/** "Share of people ..." as it reads mid-sentence: "the share of people ...". */
function measureName(definition: PlaceOutcomeMeasureBase): string {
  const name =
    definition.name.charAt(0).toLowerCase() + definition.name.slice(1);
  return /^(share|median) /.test(name) ? `the ${name}` : name;
}

/**
 * A reading as a paper prints it after the measure's own name, which already
 * carries its unit: "38.2%", "412.3", "$48,210".
 */
function valueText(definition: PlaceOutcomeMeasureBase, value: number): string {
  if (definition.unit.includes("dollars"))
    return `$${Math.round(value).toLocaleString("en-US")}`;
  const number = value.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (!definition.scale || definition.scale === "share") return `${number}%`;
  return number;
}

/**
 * Who reads a story about a law's effect, each for a reason the world
 * records:
 * 1. the people the law reached in the town, because it was their own pay,
 *    rent or tax;
 * 2. the law's sponsor, because it is their law;
 * 3. the members whose floor vote on it is recorded and who live in the
 *    story's place (its town, or the state a state paper covers), because it
 *    is news of their own vote from home.
 * Nobody else learns of it from this: who else reads a paper is not yet
 * modeled.
 */
export function lawNewsReaders(
  world: World,
  event: HistoricalEvent,
): EntityId[] {
  if (event.type !== LAW_EFFECT_EVENT_TYPE) return [];
  const readers = new Set<EntityId>();
  for (const id of event.involvedEntityIds)
    if (world.people[id]) readers.add(id);
  const measureId = event.tags
    .find((tag) => tag.startsWith(LAW_EFFECT_MEASURE_TAG))
    ?.slice(LAW_EFFECT_MEASURE_TAG.length);
  const measure = measureId
    ? world.history.legislativeMeasures?.find((row) => row.id === measureId)
    : undefined;
  if (!measure) return [...readers].sort();
  if (measure.sponsorPersonId && world.people[measure.sponsorPersonId])
    readers.add(measure.sponsorPersonId);
  const place = event.jurisdictionId;
  for (const vote of world.history.legislativeVotes ?? []) {
    if (vote.measureId !== measure.id || vote.forum.kind !== "chamber")
      continue;
    for (const row of vote.dispositions) {
      const person = row.personId ? world.people[row.personId] : undefined;
      if (!person || !place) continue;
      const home = person.homeJurisdictionId;
      if (home === place || stateOf(home) === place) readers.add(person.id);
    }
  }
  return [...readers].sort();
}

function stateOf(jurisdictionId: EntityId): EntityId | null {
  const key = lifePlaceByJurisdictionId(jurisdictionId)?.stateJurisdictionKey;
  return key ? (stateJurisdictionForKey(key)?.id ?? null) : null;
}
