/**
 * The President's address to Congress in each year of play (owner, Nov 8:
 * "In a ten-year run no two addresses read alike, and a bad year sounds like
 * one"). On the day the federal calendar sets for the joint address
 * (`jointAddress`, src/core2/office-day-federal-calendar.ts) the address is
 * composed from the world as it stands and recorded as the same public
 * event the opening is, so the news carries it, the household watching it
 * at home gets the `address` scene and anyone who heard it can bring it up.
 * The kind it takes (a crisis of confidence, hopeful, combative, a victory
 * lap, mourning, a policy push) and the subjects it tells come from the
 * term read by area, the economy and the President's traits (opening-story.ts
 * and address-kind.ts); this file only says which day.
 */
import { jointAddress } from "../core2/office-day-federal-calendar";
import { P } from "../core2/parameters";
import type { CoreState } from "../core2/types";
import {
  OPENING_ADDRESS_EVENT,
  recordOpeningStory,
  type OpeningStory,
} from "./opening-story";

/**
 * Record today's address when the calendar sets one and none is recorded.
 * Null on every other day, and where the world seats no President.
 */
export function recordYearlyAddress(core: CoreState): OpeningStory | null {
  const playerId = core.playerId;
  if (!playerId) return null;
  if (
    jointAddress(Number(core.date.slice(P.zero, "YYYY".length))).date !==
    core.date
  )
    return null;
  if (core.eventIds.has(`${OPENING_ADDRESS_EVENT}:${core.date}`)) return null;
  return recordOpeningStory(core, playerId);
}
