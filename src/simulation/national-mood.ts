import { currentPresidentOf } from "./crisis/offices";
import { majorPartyOf } from "./statewide-electorate";
import type { IsoDate, World } from "./types";

/**
 * NATIONAL MOOD — the midterm penalty. In a midterm, voters in every seat
 * turn against the President's party. No draw: the same shift reaches every
 * seat in the country, Congress and state legislatures alike, and a change of
 * President changes which party pays it.
 *
 * MEASURED: the President's party lost 3.6 points of the two-party House
 * vote from the presidential year before, the mean of the 19 midterms from
 * 1950 to 2022 (it gained only in 2002). Brookings, Vital Statistics on
 * Congress, Table 2-2 (1948 to 2018); Clerk of the House for 2020 (Democrats
 * 50.8%, Republicans 47.7%) and 2022 (47.3%, 50.0%). 1946 is left out because
 * the table starts that year, so its swing has no year before it.
 *
 * HARDWIRED until the mood reads the President's standing: every midterm
 * takes the mean. The real swing ran from 9.0 points against (2010) to 2.3
 * points for (2002), with a spread of 2.6 points.
 *
 * GAME ASSUMPTION: an odd-year state election carries no national mood.
 */
export const MIDTERM_PENALTY_SHARE = 0.036;

/**
 * The shift in the Democratic share of the two-party vote that the national
 * mood adds on an election day: negative when a Democratic President faces a
 * midterm, positive when a Republican one does, zero otherwise.
 */
export function nationalMoodDemocraticShift(
  world: World,
  electionDate: IsoDate,
): number {
  const year = Number(electionDate.slice(0, 4));
  if (year % 2 !== 0 || year % 4 === 0) return 0;
  const president = currentPresidentOf(world);
  if (!president) return 0;
  const party = majorPartyOf(world, president.personId, electionDate);
  return party === "democratic"
    ? -MIDTERM_PENALTY_SHARE
    : party === "republican"
      ? MIDTERM_PENALTY_SHARE
      : 0;
}
