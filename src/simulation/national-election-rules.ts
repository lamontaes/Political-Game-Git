import { makeIsoDate, simulationMomentAtLocalTime } from "./dates";

/** Reviewed 2026-09-13. NARA expressly limits this allocation to 2024 and 2028. */
export const NATIONAL_ELECTION_SOURCES = {
  allocation: "https://www.archives.gov/electoral-college/allocation",
  articleII: "https://www.archives.gov/founding-docs/constitution-transcript",
  constitution: "https://www.archives.gov/founding-docs/amendments-11-27",
  timeline: "https://www.archives.gov/electoral-college/key-dates",
} as const;
export const NATIONAL_ALLOCATION_VERSION = "nara-2020-census-v1" as const;
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
function buildNationalElectionRules(cycle: 2024 | 2028) {
  if (cycle !== 2024 && cycle !== 2028)
    throw new Error(
      "National allocation is unsupported for this cycle; a new dated source version is required.",
    );
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
    version: NATIONAL_ALLOCATION_VERSION,
    cycle,
    units,
    electionDate: makeIsoDate(cycle === 2024 ? "2024-11-05" : "2028-11-07"),
    electorMeetingDate: makeIsoDate(
      cycle === 2024 ? "2024-12-17" : "2028-12-19",
    ),
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

// Immutable derived rule data: timezone conversion and unit construction occur once,
// not once per elector during every integrity replay.
const RULES = {
  2024: buildNationalElectionRules(2024),
  2028: buildNationalElectionRules(2028),
};
for (const rules of Object.values(RULES)) {
  rules.units.forEach(Object.freeze);
  Object.freeze(rules.units);
  Object.freeze(rules.startsAt);
  Object.freeze(rules.endsAt);
  Object.freeze(rules);
}
Object.freeze(RULES);
export function nationalElectionRules(cycle: number) {
  if (cycle !== 2024 && cycle !== 2028)
    throw new Error(
      "National allocation is unsupported for this cycle; a new dated source version is required.",
    );
  return RULES[cycle];
}
