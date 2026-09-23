import { makeIsoDate } from "./dates";
import type { EntityId, HistoricalEvent, IsoDate, World } from "./types";

/**
 * The President, Vice President and Chief Justice a World seats without an
 * election record: the opening's fictional tenures, and every holder who came
 * to one of those offices later by succession or confirmation.
 *
 * Each holder is a `world.office-tenure` record naming the office in an
 * `office:` tag. A vice presidency that falls empty because its holder became
 * President is a `world.office-vacancy` record for the same office. The
 * office is held by whoever the LATEST of those records names, while they are
 * alive and the term has not ended. A term's end is its `term-end:` tag where
 * the record carries one (a successor serves out the remainder of someone
 * else's term); otherwise it is four years from the opening's January 20.
 */

export const FEDERAL_TENURE_EVENT = "world.office-tenure" as const;
export const FEDERAL_VACANCY_EVENT = "world.office-vacancy" as const;

export type FederalTenureOfficeKey =
  "us-president" | "us-vice-president" | "us-chief-justice";

const FIXED_TERMS: Readonly<
  Record<FederalTenureOfficeKey, { years: number; monthDay: string } | null>
> = {
  "us-president": { years: 4, monthDay: "01-20" },
  "us-vice-president": { years: 4, monthDay: "01-20" },
  "us-chief-justice": null,
};

export interface FederalTenure {
  readonly officeKey: FederalTenureOfficeKey;
  readonly event: HistoricalEvent;
  readonly personId: EntityId;
  readonly startedAt: IsoDate;
  /** Null for an office without a fixed end. */
  readonly endExclusive: IsoDate | null;
}

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

/** When the term a tenure record opened ends. */
export function federalTenureEnd(
  officeKey: FederalTenureOfficeKey,
  event: HistoricalEvent,
): IsoDate | null {
  const tagged = tagValue(event, "term-end:");
  if (tagged) return makeIsoDate(tagged);
  const fixed = FIXED_TERMS[officeKey];
  return fixed
    ? makeIsoDate(
        `${Number(event.occurredAt.slice(0, 4)) + fixed.years}-${fixed.monthDay}`,
      )
    : null;
}

/** The latest tenure or vacancy record for the office on or before `asOf`. */
export function latestFederalOfficeRecord(
  world: World,
  officeKey: FederalTenureOfficeKey,
  asOf: IsoDate = world.currentDate,
): HistoricalEvent | null {
  let latest: HistoricalEvent | null = null;
  for (const event of world.history.events) {
    if (
      (event.type !== FEDERAL_TENURE_EVENT &&
        event.type !== FEDERAL_VACANCY_EVENT) ||
      !event.tags.includes(`office:${officeKey}`) ||
      event.occurredAt > asOf
    )
      continue;
    if (
      !latest ||
      event.occurredAt > latest.occurredAt ||
      (event.occurredAt === latest.occurredAt &&
        event.sequence > latest.sequence)
    )
      latest = event;
  }
  return latest;
}

/**
 * Who holds the office today by tenure record, or null when it is vacant, its
 * holder has died, or the term has run out.
 */
export function currentFederalTenure(
  world: World,
  officeKey: FederalTenureOfficeKey,
  asOf: IsoDate = world.currentDate,
): FederalTenure | null {
  const event = latestFederalOfficeRecord(world, officeKey, asOf);
  if (!event || event.type !== FEDERAL_TENURE_EVENT) return null;
  const personId = event.participants.find(
    (participant) => participant.role === "focus:subject",
  )?.personId;
  if (!personId || !world.people[personId]) return null;
  if (
    world.history.personDeaths.some(
      (death) => death.personId === personId && death.diedAt <= asOf,
    )
  )
    return null;
  const endExclusive = federalTenureEnd(officeKey, event);
  if (endExclusive !== null && asOf >= endExclusive) return null;
  return {
    officeKey,
    event,
    personId,
    startedAt: event.occurredAt,
    endExclusive,
  };
}
