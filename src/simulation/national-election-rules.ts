import { makeIsoDate, simulationMomentAtLocalTime } from "./dates";

/** Reviewed 2026-09-13. NARA expressly limits this allocation to 2024 and 2028. */
export const NATIONAL_ELECTION_SOURCES = {
  allocation: "https://www.archives.gov/electoral-college/allocation",
  articleII: "https://www.archives.gov/founding-docs/constitution-transcript",
  constitution: "https://www.archives.gov/founding-docs/amendments-11-27",
  timeline: "https://www.archives.gov/electoral-college/key-dates",
} as const;
export const NATIONAL_ALLOCATION_VERSION = "nara-2020-census-v1" as const;
/**
 * NOT MODELED: reapportionment after the 2030 census. NARA's allocation
 * covers 2024 and 2028 only. Blanket rule meanwhile: every later cycle carries
 * the 2020-census allocation forward, under its own version label so a save
 * says which elections used a carried-forward allocation.
 */
export const CARRIED_FORWARD_ALLOCATION_VERSION =
  "nara-2020-census-carried-forward-v1" as const;
export type NationalAllocationVersion =
  | typeof NATIONAL_ALLOCATION_VERSION
  | typeof CARRIED_FORWARD_ALLOCATION_VERSION;

/** The first presidential cycle this rule set covers. */
export const FIRST_NATIONAL_CYCLE = 2024;

export function isNationalElectionCycle(year: number): boolean {
  return (
    Number.isSafeInteger(year) && year >= FIRST_NATIONAL_CYCLE && year % 4 === 0
  );
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function utcDay(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** 3 U.S.C. § 1: the Tuesday next after the first Monday in November. */
export function presidentialElectionDay(year: number): string {
  const firstMonday = 1 + ((8 - utcDay(year, 11, 1)) % 7);
  return `${year}-11-${pad(firstMonday + 1)}`;
}

/** 3 U.S.C. § 7: the first Tuesday after the second Wednesday in December. */
export function electorMeetingDay(year: number): string {
  const firstWednesday = 1 + ((10 - utcDay(year, 12, 1)) % 7);
  return `${year}-12-${pad(firstWednesday + 7 + 6)}`;
}
export const ELECTORAL_ALLOCATION: Readonly<Record<string, number>> =
  Object.freeze({
    AL: 9,
    AK: 3,
    AZ: 11,
    AR: 6,
    CA: 54,
    CO: 10,
    CT: 7,
    DE: 3,
    DC: 3,
    FL: 30,
    GA: 16,
    HI: 4,
    ID: 4,
    IL: 19,
    IN: 11,
    IA: 6,
    KS: 6,
    KY: 8,
    LA: 8,
    ME: 4,
    MD: 10,
    MA: 11,
    MI: 15,
    MN: 10,
    MS: 6,
    MO: 10,
    MT: 4,
    NE: 5,
    NV: 6,
    NH: 4,
    NJ: 14,
    NM: 5,
    NY: 28,
    NC: 16,
    ND: 3,
    OH: 17,
    OK: 7,
    OR: 8,
    PA: 19,
    RI: 4,
    SC: 9,
    SD: 3,
    TN: 11,
    TX: 40,
    UT: 6,
    VT: 3,
    VA: 13,
    WA: 12,
    WV: 4,
    WI: 10,
    WY: 3,
  });
export const CONTINGENT_STATES = Object.freeze(
  Object.keys(ELECTORAL_ALLOCATION)
    .filter((key) => key !== "DC")
    .sort(),
);
function buildNationalElectionRules(cycle: number) {
  if (!isNationalElectionCycle(cycle))
    throw new Error("Not a presidential election year.");
  const units = Object.keys(ELECTORAL_ALLOCATION)
    .sort()
    .flatMap((state) => {
      if (state === "ME" || state === "NE")
        return [
          { key: state, state, electors: 2, countsPopular: true },
          ...Array.from(
            { length: ELECTORAL_ALLOCATION[state]! - 2 },
            (_, i) => ({
              key: `${state}-${i + 1}`,
              state,
              electors: 1,
              countsPopular: false,
            }),
          ),
        ];
      return [
        {
          key: state,
          state,
          electors: ELECTORAL_ALLOCATION[state]!,
          countsPopular: true,
        },
      ];
    });
  return {
    version: (cycle <= 2028
      ? NATIONAL_ALLOCATION_VERSION
      : CARRIED_FORWARD_ALLOCATION_VERSION) as NationalAllocationVersion,
    cycle,
    units,
    electionDate: makeIsoDate(presidentialElectionDay(cycle)),
    electorMeetingDate: makeIsoDate(electorMeetingDay(cycle)),
    countDate: makeIsoDate(`${cycle + 1}-01-06`),
    startsAt: simulationMomentAtLocalTime({
      date: `${cycle + 1}-01-20`,
      minuteOfDay: 720,
      timeZone: "America/New_York",
    }),
    endsAt: simulationMomentAtLocalTime({
      date: `${cycle + 5}-01-20`,
      minuteOfDay: 720,
      timeZone: "America/New_York",
    }),
  };
}

// Immutable derived rule data, built once per cycle: timezone conversion and
// unit construction occur once, not once per elector during integrity replay.
const RULES = new Map<number, ReturnType<typeof buildNationalElectionRules>>();
export function nationalElectionRules(cycle: number) {
  const cached = RULES.get(cycle);
  if (cached) return cached;
  const rules = buildNationalElectionRules(cycle);
  rules.units.forEach(Object.freeze);
  Object.freeze(rules.units);
  Object.freeze(rules.startsAt);
  Object.freeze(rules.endsAt);
  Object.freeze(rules);
  RULES.set(cycle, rules);
  return rules;
}
