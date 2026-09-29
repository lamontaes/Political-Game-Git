import research from "../../../data/research/laws/federal-mandatory-minimums.json" with { type: "json" };
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { policyTermsInForce } from "../governing/policy-bill-terms";
import type { World, IsoDate, EntityId } from "../types";

export const FEDERAL_MINIMUM_QUESTION =
  "us-federal-positions:justice-rights.reduce-mandatory-minimums";
/** Recorded offense facts, not a federal-case probability or inferred guilt. */
export interface FederalOffenseFacts {
  readonly cocaineGrams: number;
  readonly trafficking: boolean;
  readonly interstateConduct: boolean;
  readonly firearmInFurtherance: boolean;
}
export function federalOffenseFacts(
  tags: readonly string[],
): FederalOffenseFacts | null {
  const amount = tags.find((t) => t.startsWith("justice.cocaine-grams:"));
  if (!amount) return null;
  const cocaineGrams = Number(amount.slice("justice.cocaine-grams:".length));
  if (!Number.isFinite(cocaineGrams) || cocaineGrams < 0)
    throw Error("Invalid recorded cocaine amount.");
  return {
    cocaineGrams,
    trafficking: tags.includes("justice.drug-trafficking"),
    interstateConduct: tags.includes("justice.interstate-conduct"),
    firearmInFurtherance: tags.includes("justice.firearm-in-furtherance"),
  };
}
export function isFederalOffense(
  facts: FederalOffenseFacts | null | undefined,
): boolean {
  return Boolean(
    facts?.trafficking &&
    (facts.interstateConduct || facts.firearmInFurtherance),
  );
}
/** A federal drug minimum and the consecutive firearm minimum reach only the recorded conduct. */
export function federalMinimumMonths(
  world: World,
  facts: FederalOffenseFacts | null | undefined,
  date: IsoDate = world.currentDate,
): number | null {
  if (!isFederalOffense(facts)) return null;
  const values = policyTermsInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    FEDERAL_MINIMUM_QUESTION,
    date,
  )?.terms?.values;
  const base = research.startingMinimums;
  const drug =
    facts!.cocaineGrams >= base.cocaineHigherThresholdGrams
      ? (values?.higherDrugMinimumMonths ?? base.higherDrugMonths)
      : facts!.cocaineGrams >= base.cocaineThresholdGrams
        ? (values?.drugMinimumMonths ?? base.drugMonths)
        : 0;
  const firearm = facts!.firearmInFurtherance
    ? (values?.firearmMinimumMonths ?? base.firearmMonths)
    : 0;
  if (![drug, firearm].every((n) => Number.isSafeInteger(n) && n >= 0))
    throw Error("Federal minima must be nonnegative whole months.");
  return drug + firearm;
}

/** Actual current federal jail population; a rate does not assign incarceration. */
export function federalPrisoners(
  world: World,
  _jurisdictionId: EntityId,
  date: IsoDate,
): number {
  return world.history.events.filter(
    (event) =>
      event.type === "justice.sentenced" &&
      isFederalOffense(federalOffenseFacts(event.tags)) &&
      event.tags.includes("justice.sentence:jail") &&
      (() => {
        const person = event.participants.find(
          (p) => p.role === "focus:defendant",
        )?.personId;
        return (
          person &&
          jailTermOn(world, person, date)?.sentencedEventId === event.id
        );
      })(),
  ).length;
}

import { recordWorldEvent } from "../world";
import { jailTermOn, addCalendarMonths } from "./jail-terms";
/** The filed retroactivity term reviews only the recorded minimum component; original sentencing history remains intact. */
export function reviewFederalMinimumSentences(world: World): World {
  const reading = policyTermsInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    FEDERAL_MINIMUM_QUESTION,
    world.currentDate,
  );
  if (!reading?.terms?.values.retroactive) return world;
  let next = world;
  for (const sentence of world.history.events) {
    if (
      sentence.type !== "justice.sentenced" ||
      !sentence.tags.includes("justice.sentence:jail")
    )
      continue;
    const facts = federalOffenseFacts(sentence.tags);
    if (!isFederalOffense(facts)) continue;
    const key = `federal-minimum-review:${sentence.id}:${reading.law.measureId}`;
    if (next.history.events.some((e) => e.stableKey === key)) continue;
    const previous = federalMinimumMonths(world, facts, sentence.occurredAt)!;
    const current = federalMinimumMonths(world, facts)!;
    const original = Number(
      sentence.tags
        .find((t) => t.startsWith("justice.sentence-months:"))
        ?.slice("justice.sentence-months:".length),
    );
    if (!Number.isSafeInteger(original) || original < 0) continue;
    const reduced = Math.max(0, original - Math.max(0, previous - current));
    if (reduced >= original) continue;
    const personId = sentence.participants.find(
      (p) => p.role === "focus:defendant",
    )?.personId;
    if (!personId || !jailTermOn(next, personId)) continue;
    const calculatedEnd = addCalendarMonths(sentence.occurredAt, reduced);
    const until =
      calculatedEnd < world.currentDate ? world.currentDate : calculatedEnd;
    next = recordWorldEvent(next, {
      stableKey: key,
      type: "justice.federal-sentence-reduced",
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      involvedEntityIds: [personId, reading.law.measureId],
      participants: [
        {
          personId,
          role: "focus:defendant",
          detail: "Federal sentence reviewed",
        },
      ],
      personFactConstraints: [],
      visibility: "limited",
      tags: [
        `justice.reduced-sentence:${sentence.id}`,
        `justice.reduced-until:${until}`,
        `justice.months-removed:${original - reduced}`,
        `law:${reading.law.measureId}`,
      ],
      summary: `The federal sentence was reduced by ${original - reduced} months; its new end is ${until}.`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: `The filed retroactive minimum changed from ${previous} to ${current} months for the recorded offense facts. ${reading.terms.reason}`,
        immediateReaction: null,
      },
    });
  }
  return next;
}
