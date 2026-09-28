import web from "../../../data/research/outcome-web/links.json";
import type { EntityId, IsoDate, World } from "../types";
import { childhoodRecord } from "./childhood";
import {
  acuteWeight,
  OUTCOME_LINKS,
  outcomeFactor,
  type OutcomeCause,
  type OutcomeLink,
} from "./index";

/**
 * The web for one person in the player's town (04 SYSTEM SPECS, part 5):
 * the place links as they act on the person's home place, times the
 * person-level links, read from the person's own record. An exposure-years
 * link reads the person's childhood record; an acute-decay link reads the
 * dated events a lane records for the person, each fading by its half-life.
 *
 * A person-level link whose size is not set, or whose exposure or events are
 * not recorded for this person, moves nothing and is listed with the reason.
 */

/** Dated events for one person that an acute-decay link reads. */
export type PersonEventReader = (
  world: World,
  personId: EntityId,
  asOf: IsoDate,
) => readonly IsoDate[] | null;

/**
 * Each lane registers the events it records per person. Empty today: no lane
 * records a displacement from a long-held job or a homicide near a home yet.
 */
export const PERSON_EVENT_READERS: Readonly<Record<string, PersonEventReader>> =
  {};

export type PersonLinkStatus =
  "counted" | "size-not-set" | "not-recorded-for-person";

export interface PersonLinkPart {
  readonly key: string;
  readonly from: string;
  readonly status: PersonLinkStatus;
  /** Years of exposure, or the summed weight of recent events. */
  readonly amount: number | null;
  readonly factor: number;
  readonly why: string | null;
}

export interface PersonOutcomeReading {
  readonly outcome: string;
  readonly personId: EntityId;
  /** 1 means the base rate. */
  readonly multiplier: number;
  /** The place links, read for the person's home place. */
  readonly placeCauses: readonly OutcomeCause[];
  readonly personParts: readonly PersonLinkPart[];
}

const bounded = (link: OutcomeLink, factor: number) =>
  Math.min(
    link.ceiling ?? Number.POSITIVE_INFINITY,
    Math.max(link.floor ?? 0, factor),
  );

function personAmount(
  world: World,
  link: OutcomeLink,
  personId: EntityId,
  asOf: IsoDate,
): { amount: number } | { why: string } {
  if (link.shape.kind === "exposure-years") {
    const exposure = childhoodRecord(world, personId, asOf)?.exposures.find(
      (row) => row.key === link.from,
    );
    if (!exposure) return { why: "no childhood record reads this exposure" };
    return exposure.amount === null
      ? { why: exposure.unknownBecause ?? "not recorded" }
      : { amount: exposure.amount };
  }
  if (link.shape.kind === "acute-decay") {
    const halfLifeDays = link.shape.halfLifeDays;
    const events = PERSON_EVENT_READERS[link.from]?.(world, personId, asOf);
    if (!events) return { why: "no lane records these events for a person" };
    return {
      amount: events.reduce(
        (sum, at) => sum + acuteWeight(halfLifeDays, at, asOf),
        0,
      ),
    };
  }
  return { why: "a place link" };
}

/**
 * The multiplier on one person's odds of `outcome`, with every part: the
 * place reading times the person's own parts, each held to its link's
 * bounds, and the product held to the outcome's bounds.
 */
export function personOutcomeFactor(
  world: World,
  personId: EntityId,
  outcome: string,
  asOf: IsoDate,
  links: readonly OutcomeLink[] = OUTCOME_LINKS,
): PersonOutcomeReading | null {
  const person = world.people[personId];
  if (!person) return null;
  const place = outcomeFactor(world, person.homeJurisdictionId, outcome, asOf);
  const personParts: PersonLinkPart[] = [];
  for (const link of links) {
    if (link.to !== outcome || link.evidence === "about-zero") continue;
    if (
      link.shape.kind !== "exposure-years" &&
      link.shape.kind !== "acute-decay"
    ) {
      continue;
    }
    const read = personAmount(world, link, personId, asOf);
    const base = { key: link.key, from: link.from } as const;
    if (link.size === null) {
      personParts.push({
        ...base,
        status: "size-not-set",
        amount: "amount" in read ? read.amount : null,
        factor: 1,
        why: "the size is not approved yet",
      });
    } else if ("why" in read) {
      personParts.push({
        ...base,
        status: "not-recorded-for-person",
        amount: null,
        factor: 1,
        why: read.why,
      });
    } else {
      personParts.push({
        ...base,
        status: "counted",
        amount: read.amount,
        factor: bounded(link, 1 + link.size * read.amount),
        why: null,
      });
    }
  }
  const product = personParts.reduce(
    (total, part) => total * part.factor,
    place.multiplier,
  );
  const bounds = (
    web.targets as Readonly<Record<string, { floor: number; ceiling: number }>>
  )[outcome];
  const multiplier = bounds
    ? Math.min(bounds.ceiling, Math.max(bounds.floor, product))
    : product;
  return {
    outcome,
    personId,
    multiplier,
    placeCauses: place.causes,
    personParts,
  };
}
