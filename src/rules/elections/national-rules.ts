import { makeIsoDate, type IsoDate } from "./calendar";
import {
  isNationalElectionCycle,
  presidentialElectionDay,
  electorMeetingDay,
} from "./national-calendar";
import type { SimulationMoment } from "../../simulation/types";
export interface NationalRuleFacts {
  readonly allocation: Readonly<Record<string, number>>;
  readonly districtStates: ReadonlySet<string>;
  readonly momentAtLocalTime: (
    date: IsoDate,
    minuteOfDay: number,
    timeZone: string,
  ) => SimulationMoment;
}
export function buildNationalElectionRules(
  facts: NationalRuleFacts,
  cycle: number,
) {
  if (!isNationalElectionCycle(cycle))
    throw new Error("Not a presidential election year.");
  const units = Object.keys(facts.allocation)
    .sort()
    .flatMap((state) =>
      facts.districtStates.has(state)
        ? [
            { key: state, state, electors: 2, countsPopular: true },
            ...Array.from({ length: facts.allocation[state]! - 2 }, (_, i) => ({
              key: `${state}-${i + 1}`,
              state,
              electors: 1,
              countsPopular: false,
            })),
          ]
        : [
            {
              key: state,
              state,
              electors: facts.allocation[state]!,
              countsPopular: true,
            },
          ],
    );
  return {
    version:
      cycle <= 2028
        ? "nara-2020-census-v1"
        : "nara-2020-census-carried-forward-v1",
    cycle,
    units,
    electionDate: makeIsoDate(presidentialElectionDay(cycle)),
    electorMeetingDate: makeIsoDate(electorMeetingDay(cycle)),
    countDate: makeIsoDate(`${cycle + 1}-01-06`),
    startsAt: facts.momentAtLocalTime(
      makeIsoDate(`${cycle + 1}-01-20`),
      720,
      "America/New_York",
    ),
    endsAt: facts.momentAtLocalTime(
      makeIsoDate(`${cycle + 5}-01-20`),
      720,
      "America/New_York",
    ),
  };
}
// stopgapId: "SG-P14-elections-national-allocation-forward"
