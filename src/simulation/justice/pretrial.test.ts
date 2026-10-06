import { describe, expect, it } from "vitest";

import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import { SeededRng } from "../rng";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import { mandatoryJailUnderLaw, type CourtCase } from "./court-reasoning";
import { adultCourtAgeAt } from "./juvenile-court";
import {
  bailDueMinorUnits,
  bailMinorUnits,
  estimatedBailMinorUnits,
  recordedChargeBailMinorUnits,
  pretrialLawAt,
} from "./pretrial";

/**
 * The two justice laws the court reads, in both directions: the law the game
 * began with, an enacted law that changes it, and a later law that repeals
 * that. The state is drawn from every place the starting law reads, by the
 * seed, and the World around the law is partial: the readers read nothing but
 * the date, the catalog and the two legislative histories.
 */

const CASH_BAIL = "us-policy-positions:justice-public-safety.end-cash-bail";
const MINIMUMS =
  "us-policy-positions:justice-public-safety.mandatory-minimum-sentences";
const BAIL_ID = "proposition_end_cash_bail" as EntityId;
const MINIMUMS_ID = "proposition_mandatory_minimums" as EntityId;
const JUVENILE =
  "us-policy-positions:justice-public-safety.raise-juvenile-court-age";
const JUVENILE_ID = "proposition_juvenile_court_age" as EntityId;

const questions = (
  startingLaw as unknown as {
    questions: Record<string, { answers: Record<string, { answer: string }> }>;
  }
).questions;

/** A state or territory whose starting law answers `answer`, by the seed. */
function drawPlace(
  seed: string,
  answer: "yes" | "no",
  question = CASH_BAIL,
): string {
  const answers = questions[question]!.answers;
  const keys = Object.keys(answers)
    .filter((key) => answers[key]!.answer === answer)
    .sort();
  return new SeededRng(seed).pick(keys);
}

let sequence = 0;
function law(
  jurisdictionId: EntityId,
  propositionId: EntityId,
  answer: "yes" | "no",
  effectiveAt: string,
) {
  sequence += 1;
  const id = `measure_${sequence}` as EntityId;
  const measure: LegislativeMeasureRecord = {
    id,
    stableKey: `test:${sequence}`,
    sequence,
    jurisdictionId,
    rulePackId: "test",
    designation: `HB ${sequence}`,
    shortTitle: "A test act",
    summary: "A test act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: makeIsoDate("2026-01-05"),
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [propositionId],
    propositionAnswers: [{ propositionId, answer }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: `enactment_${sequence}` as EntityId,
    stableKey: `test:${sequence}:enactment`,
    sequence: 1000 + sequence,
    measureId: id,
    resolvedAt: makeIsoDate("2026-02-01"),
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: makeIsoDate(effectiveAt),
    outcomeEventId: `event_${sequence}` as EntityId,
  };
  return { measure, enactment };
}

function worldWith(
  currentDate: string,
  laws: readonly ReturnType<typeof law>[],
): World {
  return {
    currentDate: makeIsoDate(currentDate),
    policyCatalog: {
      propositions: {
        [BAIL_ID]: { stableKey: CASH_BAIL },
        [MINIMUMS_ID]: { stableKey: MINIMUMS },
        [JUVENILE_ID]: { stableKey: JUVENILE },
      },
    },
    history: {
      events: [],
      legislativeMeasures: laws.map((entry) => entry.measure),
      legislativeEnactments: laws.map((entry) => entry.enactment),
    },
  } as unknown as World;
}

describe("cash bail, as the law in force answers it", () => {
  const moneyBail = drawPlace("pretrial-law-1", "no");
  const noMoneyBail = drawPlace("pretrial-law-1", "yes");
  const state = stateJurisdictionForKey(moneyBail)!.id;
  const other = stateJurisdictionForKey(noMoneyBail)!.id;

  it(`reads the starting law (${moneyBail}, ${noMoneyBail})`, () => {
    const world = worldWith("2026-06-01", []);
    expect(pretrialLawAt(world, state)).toBe("money-bail");
    expect(pretrialLawAt(world, other)).toBe("no-money-bail");
    expect(pretrialLawAt(world, null)).toBeNull();
  });

  it(`ends money bail from the law's effective date, and a repeal brings it back (${moneyBail})`, () => {
    const ends = law(state, BAIL_ID, "yes", "2026-07-01");
    expect(pretrialLawAt(worldWith("2026-06-30", [ends]), state)).toBe(
      "money-bail",
    );
    expect(pretrialLawAt(worldWith("2026-07-01", [ends]), state)).toBe(
      "no-money-bail",
    );
    const repeal = law(state, BAIL_ID, "no", "2027-01-01");
    expect(pretrialLawAt(worldWith("2026-12-31", [ends, repeal]), state)).toBe(
      "no-money-bail",
    );
    expect(pretrialLawAt(worldWith("2027-01-01", [ends, repeal]), state)).toBe(
      "money-bail",
    );
  });

  it("keeps the sourced research estimate separate from legal bail authority", () => {
    // $50,000 x 321.943 / 214.537 = $75,032.46, rounded to whole dollars.
    expect(estimatedBailMinorUnits("crime:robbery")).toBe(7_503_200);
    expect(
      bailMinorUnits(worldWith("2026-01-10", []), {
        venueJurisdictionId: state,
        offenseKey: "crime:robbery",
      }),
    ).toBeNull();
    expect(estimatedBailMinorUnits("crime:assault")).toBe(2_251_000);
    expect(estimatedBailMinorUnits("crime:vandalism")).toBe(750_300);
    expect(estimatedBailMinorUnits("something-unread")).toBe(1_500_600);
  });
});

describe("operative cash amounts", () => {
  const place = drawPlace("operative-bail", "no");
  const state = stateJurisdictionForKey(place)!.id;
  const input = { venueJurisdictionId: state, offenseKey: "crime:robbery" };
  const fixtureAmount = estimatedBailMinorUnits(input.offenseKey);
  function enactedAmount(value = fixtureAmount, unit = "minor") {
    const adopted = law(state, BAIL_ID, "no", "2026-02-01");
    const world = worldWith("2026-03-01", [adopted]);
    // Controlled adopted-text fixture, not a claim about any state's actual schedule.
    return {
      ...world,
      history: {
        ...world.history,
        legislativeProvisions: [
          {
            id: "bail-provision" as EntityId,
            measureId: adopted.measure.id,
            sequence: adopted.enactment.sequence - 1,
            recordedAt: makeIsoDate("2026-01-05"),
            supersedesProvisionId: null,
            answers: null,
            applicationScope: { jurisdictionId: state, segmentKey: null },
            lawTerms: [
              {
                questionKey: CASH_BAIL,
                key: `cash-bail:${input.offenseKey}`,
                value,
                unit,
              },
            ],
          },
        ],
      },
    } as unknown as World;
  }
  it("reads adopted offense-specific cash, with no cross-offense or cross-state fallback", () => {
    const world = enactedAmount();
    expect(bailMinorUnits(world, input)).toBe(fixtureAmount);
    expect(bailDueMinorUnits(world, input)).toBe(fixtureAmount);
    expect(
      bailMinorUnits(world, { ...input, offenseKey: "crime:assault" }),
    ).toBeNull();
    const other = stateJurisdictionForKey(
      drawPlace("operative-bail-other", "yes"),
    )!.id;
    expect(
      bailMinorUnits(world, { ...input, venueJurisdictionId: other }),
    ).toBeNull();
    expect(
      bailMinorUnits(
        { ...world, currentDate: makeIsoDate("2026-01-10") },
        input,
      ),
    ).toBeNull();
    expect(
      bailMinorUnits(enactedAmount(fixtureAmount, "months"), input),
    ).toBeNull();
    expect(bailMinorUnits(enactedAmount(-fixtureAmount), input)).toBeNull();
  });
  it("preserves a saved amount after legal changes and rejects ambiguous or invalid records", () => {
    const id = "saved-charge" as EntityId;
    const event = {
      id,
      type: "justice.charged",
      occurredAt: makeIsoDate("2026-01-10"),
      tags: [`justice.cash-bail-amount:${fixtureAmount}`],
    };
    const world = {
      ...worldWith("2026-03-01", []),
      history: { ...worldWith("2026-03-01", []).history, events: [event] },
    } as unknown as World;
    expect(recordedChargeBailMinorUnits(world, id)).toBe(fixtureAmount);
    const invalid = (patch: object) =>
      ({
        ...world,
        history: { ...world.history, events: [{ ...event, ...patch }] },
      }) as unknown as World;
    expect(
      recordedChargeBailMinorUnits(
        invalid({ tags: [...event.tags, ...event.tags] }),
        id,
      ),
    ).toBeNull();
    expect(
      recordedChargeBailMinorUnits(invalid({ type: "justice.referred" }), id),
    ).toBeNull();
    expect(
      recordedChargeBailMinorUnits(
        invalid({ tags: ["justice.cash-bail-amount:NaN"] }),
        id,
      ),
    ).toBeNull();
    expect(
      recordedChargeBailMinorUnits(
        invalid({ occurredAt: makeIsoDate("2027-01-10") }),
        id,
      ),
    ).toBeNull();
  });
});

describe("mandatory minimum sentences, as the law in force answers them", () => {
  const place = drawPlace("pretrial-law-2", "no");
  const state = stateJurisdictionForKey(place)!.id;
  const robbery: CourtCase = {
    caseKey: "test:robbery",
    defendantId: "person_defendant" as EntityId,
    offenseKey: "crime:robbery",
    offenseLabel: "robbery",
    evidence: "testimony",
    standingFindings: 1,
    venueJurisdictionId: state,
    stateKey: place,
  };
  const vandalism: CourtCase = {
    ...robbery,
    caseKey: "test:vandalism",
    offenseKey: "crime:vandalism",
    offenseLabel: "vandalism",
  };

  it(`binds a violent case from the law's effective date, and a repeal frees the judge again (${place})`, () => {
    expect(mandatoryJailUnderLaw(worldWith("2026-06-01", []), robbery)).toBe(
      null,
    );
    const sets = law(state, MINIMUMS_ID, "yes", "2026-07-01");
    expect(
      mandatoryJailUnderLaw(worldWith("2026-06-30", [sets]), robbery),
    ).toBeNull();
    expect(
      mandatoryJailUnderLaw(worldWith("2026-07-01", [sets]), robbery),
    ).toMatch(/violent offense that a judge may not go below/);
    const repeal = law(state, MINIMUMS_ID, "no", "2027-01-01");
    expect(
      mandatoryJailUnderLaw(worldWith("2027-01-01", [sets, repeal]), robbery),
    ).toBeNull();
  });

  it("leaves a first, non-violent case to the judge", () => {
    const sets = law(state, MINIMUMS_ID, "yes", "2026-07-01");
    expect(
      mandatoryJailUnderLaw(worldWith("2026-08-01", [sets]), vandalism),
    ).toBeNull();
  });
});

describe("the juvenile court age, as the law in force answers it", () => {
  const notRaised = drawPlace("pretrial-law-3", "no", JUVENILE);
  const raised = drawPlace("pretrial-law-3", "yes", JUVENILE);
  const state = stateJurisdictionForKey(notRaised)!.id;
  const other = stateJurisdictionForKey(raised)!.id;

  it(`tries a 17-year-old as an adult only where the law has not raised the age (${notRaised}, ${raised})`, () => {
    const world = worldWith("2026-06-01", []);
    expect(adultCourtAgeAt(world, state)).toBe(17);
    expect(adultCourtAgeAt(world, other)).toBe(18);
  });

  it(`raises the age from the law's effective date, and a repeal lowers it again (${notRaised})`, () => {
    const raises = law(state, JUVENILE_ID, "yes", "2026-07-01");
    expect(adultCourtAgeAt(worldWith("2026-06-30", [raises]), state)).toBe(17);
    expect(adultCourtAgeAt(worldWith("2026-07-01", [raises]), state)).toBe(18);
    const repeal = law(state, JUVENILE_ID, "no", "2027-01-01");
    expect(
      adultCourtAgeAt(worldWith("2027-01-01", [raises, repeal]), state),
    ).toBe(17);
  });
});
