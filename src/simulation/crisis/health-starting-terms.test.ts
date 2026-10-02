import { expect, it } from "vitest";
import data from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import intake from "../../../docs/research/starting-law-2026/health-terms/medicaid-source-intake.json" with { type: "json" };
import { drawRandomPlace } from "../../../tests/support/random-place";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { createNewGameWorld } from "../../presentation/new-game";
import { explicitNewGameSetup } from "../../presentation/new-game-geography";
import { lawInForce } from "../governing/law-in-force";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { readFinalEnactedLawTerm } from "../governing/final-law-term-query";
import { stateJurisdictionForKey } from "../life-places";
import { makeIsoDate } from "../dates";
import { annualPovertyLineMinor } from "../household-pay";
import { deserializeWorld, serializeWorld } from "../serialization";
import { advanceWorld, createWorld, recordWorldEvent } from "../world";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { createProductionPolicyCatalog } from "../production-catalog";
import {
  coverageDecisionIsKnown,
  healthCoverageRecords,
  medicaidCoverageDecision,
  recordHealthCoverage,
} from "./health-coverage";

const expansion =
  "us-policy-positions:health-human-services.expand-medicaid-eligibility";
const work =
  "us-policy-positions:health-human-services.medicaid-work-requirement";
type Row = {
  answer: string;
  lawTerms?: readonly { key: string; value: number; unit: string }[];
};
const questions = data.questions as unknown as Record<
  string,
  { answers: Record<string, Row> }
>;

function startingLaw(
  world: ReturnType<typeof createWorld>,
  placeKey: string,
  questionKey: string,
  onDate = world.currentDate,
) {
  const jurisdiction =
    placeKey === "US"
      ? NATIONAL_ELECTION_JURISDICTION
      : stateJurisdictionForKey(placeKey)!;
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === questionKey,
  )!;
  return lawInForce(world, jurisdiction.id, proposition.id, onDate);
}

it("preserves every original Medicaid answer, date and prior phase", () => {
  expect(intake.rows).toHaveLength(49);
  for (const entry of intake.rows) {
    const row = questions[entry.questionKey]!.answers[entry.placeKey]!;
    for (const [key, value] of Object.entries(entry.originalRow)) {
      if (key === "source" || key === "note") continue;
      expect(row[key as keyof Row], `${entry.placeKey}:${key}`).toEqual(value);
    }
  }
  expect(
    Object.values(questions[expansion]!.answers).filter((row) =>
      row.lawTerms?.some((term) => term.key === "income-limit"),
    ),
  ).toHaveLength(40);
  expect(
    Object.values(questions[work]!.answers).filter((row) =>
      row.lawTerms?.some((term) => term.key === "hours"),
    ),
  ).toHaveLength(3);
});

it("reads dated work-hour terms without activating the before:no phase", () => {
  for (const entry of intake.rows.filter((row) => row.questionKey === work)) {
    if (!questions[work]!.answers[entry.placeKey]!.lawTerms) continue;
    const at = makeIsoDate(
      (entry.originalRow as { operativeAt: string }).operativeAt,
    );
    const world = createWorld({
      seed: `health-starting:${entry.placeKey}`,
      currentDate: at,
      jurisdictions: [
        entry.placeKey === "US"
          ? NATIONAL_ELECTION_JURISDICTION
          : stateJurisdictionForKey(entry.placeKey)!,
      ],
      people: [],
      policyCatalog: createProductionPolicyCatalog(),
    });
    const law = startingLaw(world, entry.placeKey, work, at)!;
    const term = readFinalEnactedLawTerm(world, law, {
      questionKey: work,
      termKey: "hours",
      unit: "hours",
      onDate: at,
    });
    expect(term).toMatchObject({ value: 80, provisionId: null });
    if ("before" in entry.originalRow)
      expect(
        startingLaw(world, entry.placeKey, work, makeIsoDate("2026-01-01"))
          ?.answer,
      ).toBe("no");
  }
});

it("a drawn ordinary game uses its starting financial term and saves actual coverage", () => {
  const seed = "health-starting-financial-term-2026-10-02";
  const place = drawRandomPlace(
    seed,
    (candidate) =>
      !!questions[expansion]!.answers[candidate.stateJurisdictionKey ?? ""]
        ?.lawTerms,
  );
  const game = createNewGameWorld(
    explicitNewGameSetup({ placeKey: place.key, seed, startAge: 35 }),
  );
  const world = advanceWorld(
    game.world,
    10,
    createCampaignElectionTransitionRegistry(),
  );
  const decisions = world.personOrder.map((personId) => ({
    personId,
    decision: medicaidCoverageDecision(world, personId),
  }));
  const known = decisions.filter(({ decision }) =>
    ["covered", "outside:income"].includes(decision.reasonKey),
  );
  console.log(
    JSON.stringify({
      seed,
      place: place.displayName,
      date: world.currentDate,
      reasons: decisions.reduce<Record<string, number>>(
        (counts, { decision }) => ({
          ...counts,
          [decision.reasonKey]: (counts[decision.reasonKey] ?? 0) + 1,
        }),
        {},
      ),
    }),
  );
  expect(known.length).toBeGreaterThan(0);
  for (const { decision } of known) {
    const law = startingLaw(
      world,
      decision.stateKey!,
      expansion,
      world.currentDate,
    )!;
    const term = readFinalEnactedLawTerm(world, law, {
      questionKey: expansion,
      termKey: "income-limit",
      unit: "ratio",
    })!;
    expect(decision.incomeLimitRatio).toBe(term.value);
    const limit =
      annualPovertyLineMinor(
        decision.stateKey!,
        decision.householdSize,
        world.currentDate,
      ) * term.value;
    expect(decision.covered).toBe(decision.monthlyIncomeMinor * 12 <= limit);
  }
  const covered = known.find(({ decision }) => decision.covered)!;
  expect(covered).toBeDefined();
  const cause = world.history.futureDueItems.find(
    (item) =>
      item.transitionKey === "crisis:health-coverage" &&
      item.dueAt === world.currentDate,
  )!.id;
  const recorded = recordHealthCoverage(world, world.currentDate, cause);
  const record = healthCoverageRecords(recorded).find(
    (row) => row.personId === covered.personId && row.covered,
  );
  expect(record).toBeDefined();
  expect(record!.lawEffectStamps?.[0]?.governingLawKey).toMatch(
    /^starting-law:/,
  );
  const continued = deserializeWorld(serializeWorld(recorded));
  expect(healthCoverageRecords(continued)).toEqual(
    healthCoverageRecords(recorded),
  );
  expect(recordHealthCoverage(continued, continued.currentDate, cause)).toBe(
    continued,
  );
  console.log(
    JSON.stringify({
      seed,
      place: place.displayName,
      placeKey: place.key,
      date: world.currentDate,
      stateId: stateJurisdictionForKey(place.stateJurisdictionKey!)!.id,
      knownFinancialDecisions: known.length,
      personId: covered.personId,
      recordId: record!.id,
      basis: record!.basis,
    }),
  );
});

it("missing governing financial terms are unresolved rather than a global ceiling", () => {
  const seed = "health-starting-unresolved-term-2026-10-02";
  const place = drawRandomPlace(seed, (candidate) => {
    const row =
      questions[expansion]!.answers[candidate.stateJurisdictionKey ?? ""];
    return row?.answer === "yes" && !row.lawTerms;
  });
  const { world } = smallWorld({
    place: place.key,
    seed,
    people: 3,
    household: true,
    date: "2026-01-05",
  });
  const decisions = world.personOrder.map((id) =>
    medicaidCoverageDecision(world, id),
  );
  const missing = decisions.find(
    (decision) => decision.reasonKey === "outside:terms-unrecorded",
  );
  expect(missing).toBeDefined();
  expect(coverageDecisionIsKnown(missing!)).toBe(false);
  expect(missing!.incomeLimitRatio).toBeNull();
  expect(recordHealthCoverage(world, world.currentDate, world.id)).toBe(world);
});

it("the existing financial consumer reads the sourced ceiling in a bounded fixture", () => {
  const seed = "health-starting-financial-fixture-2026-10-02";
  const place = drawRandomPlace(
    seed,
    (candidate) =>
      !!questions[expansion]!.answers[candidate.stateJurisdictionKey ?? ""]
        ?.lawTerms,
  );
  // Explicit fixture: household writers seat three people, with no employment
  // or compensation writers requested. This is not ordinary-game pay proof.
  const { world } = smallWorld({
    place: place.key,
    seed,
    people: 3,
    household: true,
    date: "2026-01-05",
  });
  const adult = world.personOrder.find((id) => {
    const decision = medicaidCoverageDecision(world, id);
    return decision.reasonKey === "covered";
  });
  expect(adult).toBeDefined();
  const decision = medicaidCoverageDecision(world, adult!);
  const law = startingLaw(world, place.stateJurisdictionKey!, expansion)!;
  expect(decision.incomeLimitRatio).toBe(
    readFinalEnactedLawTerm(world, law, {
      questionKey: expansion,
      termKey: "income-limit",
      unit: "ratio",
    })!.value,
  );
  const reviewed = recordWorldEvent(world, {
    stableKey: "health-starting:fixture-financial-review",
    type: "health.coverage-review",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [adult!],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    summary:
      "Authored fixture: review the recorded household and governing financial term.",
    tags: ["fixture.health"],
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const cause = reviewed.history.events.at(-1)!.id;
  const recorded = recordHealthCoverage(reviewed, reviewed.currentDate, cause);
  expect(
    healthCoverageRecords(recorded).some(
      (row) => row.personId === adult && row.covered,
    ),
  ).toBe(true);
  expect(
    healthCoverageRecords(deserializeWorld(serializeWorld(recorded))),
  ).toEqual(healthCoverageRecords(recorded));
  console.log(
    JSON.stringify({
      kind: "explicit-household-fixture",
      seed,
      place: place.displayName,
      personId: adult,
      incomeLimitRatio: decision.incomeLimitRatio,
    }),
  );
});
