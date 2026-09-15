import {
  createDemoWorld,
  makeIsoDate,
  simulationMomentAtLocalTime,
  registerNationalElection,
  appendNationalRecord,
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../../src/simulation";
/** Supplied fictional unit counts for UI QA; no election forecast or campaign simulation. */
let world = ensureNationalElectionJurisdiction(
  createDemoWorld("s30-n-browser-fixture"),
);
world = {
  ...world,
  currentDate: makeIsoDate("2028-11-08"),
  currentMoment: simulationMomentAtLocalTime({
    date: "2028-11-08",
    minuteOfDay: 720,
    timeZone: "America/New_York",
  }),
};
const [a, av, b, bv] = world.personOrder;
if (!a || !av || !b || !bv) throw new Error("Four canonical people required.");
const provenance = {
  method: "authored" as const,
  sourceEntityIds: [],
  note: "Supplied fictional UI test result. Not observed real-world totals or a forecast.",
};
world = registerNationalElection(world, {
  stableKey: "browser-national-2028",
  cycle: 2028,
  jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
  tickets: [
    {
      presidentPersonId: a,
      vicePresidentPersonId: av,
      presidentState: "CA",
      vicePresidentState: "NY",
    },
    {
      presidentPersonId: b,
      vicePresidentPersonId: bv,
      presidentState: "TX",
      vicePresidentState: "FL",
    },
  ],
  provenance,
});
export const electionId = world.history.nationalElections![0]!.id;
world = appendNationalRecord(world, {
  kind: "unit-result",
  stableKey: "raw-ne",
  electionId,
  unitKey: "NE",
  allocationWinnerPersonId: a,
  sourceContestResultId: null,
  tallies: [
    { candidatePersonId: a, votes: 1000 },
    { candidatePersonId: b, votes: 900 },
  ],
  provenance,
});
export const fixtureWorld = world;
