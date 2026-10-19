import { describe, expect, it } from "vitest";
import {
  candidateReasons,
  electorateParameter,
  type CandidateInputs,
  type RaceConditions,
} from "./electorate-inputs";

const candidate: CandidateInputs = {
  id: "candidate",
  party: null,
  side: 0,
  incumbent: true,
  experienced: true,
  spentMinor: null,
  record: 0,
  presidentsParty: false,
  seatPartyHolder: true,
};
const conditions: RaceConditions = {
  cycle: "midterm",
  federal: true,
  typicalSpendPerVote: 1,
  raceVotes: 100,
  national: { unemploymentChange: 0, inflationChange: 0 },
  town: {
    placeId: "fixture:town",
    unemploymentChange: 2,
    crimeChange: 0,
    unemploymentReading: {
      value: 6,
      base: 4,
      webRecordId: "fixture:web:month",
      engineRecordId: "fixture:metrics:month",
      openingRecordId: "fixture:town",
    },
  },
};

describe("recorded local unemployment in candidate standing", () => {
  it("retains the producer reading and the incumbent party's actual contribution", () => {
    const reasons = candidateReasons(candidate, conditions);
    const contribution = -2 * electorateParameter("localUnemploymentShare");
    expect(reasons.local).toBe(contribution);
    expect(reasons.localUnemployment).toEqual({
      ...conditions.town!.unemploymentReading,
      contribution,
    });
    // Updating the later world reading cannot rewrite the saved vote reason.
    const reading = { ...conditions.town!.unemploymentReading! };
    const saved = candidateReasons(candidate, {
      ...conditions,
      town: { ...conditions.town!, unemploymentReading: reading },
    });
    reading.value = 8;
    expect(saved.localUnemployment?.value).toBe(6);
  });
  it("does not charge a challenger with the incumbent party's unemployment record", () => {
    const reasons = candidateReasons(
      { ...candidate, incumbent: false, seatPartyHolder: false },
      conditions,
    );
    expect(reasons.local).toBe(0);
    expect(reasons.localUnemployment?.contribution).toBe(0);
    expect(reasons.localUnemployment?.engineRecordId).toBe(
      "fixture:metrics:month",
    );
  });
});
