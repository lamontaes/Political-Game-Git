import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { enactCostLawFixture } from "../../tests/fixtures/enacted-cost-law-fixture";
import { enactingGovernmentForPack } from "../simulation/legislation-drafting";
import {
  legislatureProfilePack,
  legislatureProfilePackId,
} from "../simulation/legislature-game-profile";
import { legislativePackForJurisdiction } from "../simulation/legislative-institutions";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../simulation/life-places";
import { pickDistinct, SeededRng } from "../simulation/rng";
import { createWorld } from "../simulation/world";
import { createStableId } from "../simulation/ids";
import { makeIsoDate } from "../simulation/dates";
import { createProductionPolicyCatalog } from "../simulation/production-catalog";
import {
  COMMITTEE_HEARING_TRANSITION_KEY,
  introduceMeasure,
  measureActions,
  measurePosition,
  referMeasure,
} from "../simulation/legislation";
import { LEGISLATIVE_SESSION_CALENDARS } from "../simulation/legislative-session-calendar-data";
import { nextSessionCalendarDate } from "../simulation/legislative-session-calendar";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
import type { LegislativeProcedureContext } from "../simulation/legislation-scenarios";
import type { LegislativeMeasureRecord } from "../simulation/types";
import { applyLegislativeStep } from "./legislation-session";
import {
  governorOfficeForJurisdiction,
  governingMatters,
  GOVERNING_MATTER_DECIDED,
} from "../simulation/governing/state-governing";
import { lawInForce } from "../simulation/governing/law-in-force";
import { withOpenedBudgets } from "../simulation/public-budgets";
import {
  PUBLIC_BUDGETS_VERSION,
  BUDGET_PROGRAMS,
} from "../simulation/public-budgets/store";
import { lawSpendingForMonth } from "../simulation/public-budgets/month";

const seed = "team1-main-green-profile-hearing-all56-20261002";
const identities = lifePlaceStateIdentities();
const sampled = pickDistinct(new SeededRng(seed), identities, 5).map(
  (x) => x.jurisdictionKey,
);
// The owner's concrete regressions supplement the five draws from all 56.
const regressions = [
  "US-AK",
  "US-IL",
  "US-KY",
  "US-MD",
  "US-MN",
  "US-MO",
  "US-NE",
  "US-NV",
  "US-OH",
  "US-PR",
];
const watched = [...new Set([...sampled, ...regressions])];

it("draws its five watched places from the complete 56-place population", () => {
  expect(identities).toHaveLength(56);
  expect(sampled).toHaveLength(5);
  expect(new Set(sampled).size).toBe(5);
});

describe.each(watched)(
  `a registered profile hearing in %s (seed ${seed})`,
  (stateKey) => {
    it("schedules and actually holds the hearing through the shared fallback", () => {
      const small = smallWorld({ place: stateKey, seed });
      const jurisdiction = stateJurisdictionForKey(stateKey)!;
      const pack = legislatureProfilePack(stateKey, jurisdiction.name);
      if (!pack)
        throw new Error("No registered profile for the sampled jurisdiction.");
      expect(enactingGovernmentForPack(pack)?.government).toMatch(
        /^(state|territory)$/,
      );
      const introduced = introduceMeasure(small.world, {
        stableKey: `hearing:${stateKey}`,
        jurisdictionId: jurisdiction.id,
        rulePackId: pack.packId,
        designation: "HB hearing",
        shortTitle: "Recorded hearing regression",
        summary:
          "A real scheduled hearing, with no ballots or executive decision.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: pack.chamberOrder[0]!,
      });
      const measureId = introduced.history.legislativeMeasures!.at(-1)!.id;
      const chamber = pack.chambers.find(
        (x) => x.chamberKey === pack.chamberOrder[0],
      )!;
      const referred = referMeasure(introduced, {
        stableKey: `hearing:${stateKey}:refer`,
        measureId,
        committeeKey: chamber.committees[0]!.committeeKey,
      });
      const scenario: LegislativeProcedureContext = {
        pack,
        measureId,
        bodies: [],
        committeeMemberCount: null,
        votePlan: {},
        governorAction: null,
        governorRationale: "No executive decision in a hearing test.",
      };
      const calendar =
        pack.session.sittingCalendar ?? LEGISLATIVE_SESSION_CALENDARS.state;
      const dueAt = nextSessionCalendarDate(
        calendar,
        referred.currentDate,
        "hearing",
      );
      const result = applyLegislativeStep(
        scenario,
        referred,
        "request-committee-hearing",
      );
      const hearings = result.world.history.futureDueItems.filter(
        (x) =>
          x.transitionKey === COMMITTEE_HEARING_TRANSITION_KEY &&
          x.entityIds.includes(measureId),
      );
      expect(hearings).toHaveLength(1);
      expect(hearings[0]!.dueAt).toBe(dueAt);
      expect(result.world.currentDate).toBe(dueAt);
      expect(measurePosition(result.world, measureId).hearingHeld).toBe(true);
      expect(
        measureActions(result.world, measureId).filter(
          (x) => x.kind === "committee-hearing-held",
        ),
      ).toHaveLength(1);
      expect(measurePosition(referred, measureId).hearingHeld).toBe(false);
      const loaded = deserializeWorld(serializeWorld(result.world));
      expect(measurePosition(loaded, measureId)).toEqual(
        measurePosition(result.world, measureId),
      );
      expect(loaded.history.futureDueItems).toEqual(
        result.world.history.futureDueItems,
      );
    });
  },
);

it("recognizes the registered profile alongside the preferred researched pack without admitting an invented pack", () => {
  for (const stateKey of regressions) {
    const state = stateJurisdictionForKey(stateKey)!;
    const preferred = legislativePackForJurisdiction(state.id)!;
    const profile = legislatureProfilePack(stateKey, state.name);
    if (!profile)
      throw new Error("No registered profile for the regression jurisdiction.");
    expect(enactingGovernmentForPack(preferred)).not.toBeNull();
    expect(enactingGovernmentForPack(profile)).not.toBeNull();
    expect(
      enactingGovernmentForPack({
        ...profile,
        packId: `${profile.packId}-unregistered`,
      }),
    ).toBeNull();
  }
});

it("carries the existing Maryland age-verification cost fixture through its profile hearing", () => {
  const state = stateJurisdictionForKey("US-MD")!;
  const catalog = createProductionPolicyCatalog();
  const question = Object.values(catalog.propositions).find(
    (x) =>
      x.stableKey ===
      "us-policy-positions:technology-privacy.age-verification-for-social-media",
  )!;
  const base = createWorld({
    seed,
    currentDate: makeIsoDate("2026-01-05"),
    jurisdictions: [state],
    people: [],
    policyCatalog: catalog,
  });
  const input: LegislativeMeasureRecord = {
    id: createStableId("legislative-measure", "age-cost:US-MD"),
    stableKey: "age-cost:US-MD",
    sequence: base.history.nextSequence,
    jurisdictionId: state.id,
    rulePackId: legislatureProfilePackId("US-MD"),
    designation: "HB cost",
    shortTitle: "Authored age-verification cost fixture",
    summary: "An authored legal change for a budget attribution test.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: makeIsoDate("2026-05-01"),
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [question.id],
    propositionAnswers: [{ propositionId: question.id, answer: "yes" }],
  };
  const enacted = enactCostLawFixture(base, input);
  const holder = governorOfficeForJurisdiction(
    enacted.world,
    "US-MD",
  )?.holderPersonId;
  expect(holder).toBeDefined();
  const matter = governingMatters(enacted.world).find(
    (row) => row.measureId === enacted.measure.id,
  );
  expect(matter?.holderPersonId).toBe(holder);
  expect(
    enacted.world.history.events.filter(
      (event) =>
        event.type === GOVERNING_MATTER_DECIDED &&
        event.tags.includes(`matter:${matter!.id}`),
    ),
  ).toEqual([
    expect.objectContaining({
      participants: expect.arrayContaining([
        { personId: holder, role: "agency:decider", detail: "player" },
      ]),
    }),
  ]);
  expect(enacted.world.control).toEqual(base.control);
  expect(enacted.world.currentDate).toBe(makeIsoDate("2026-06-01"));
  expect(enacted.measure.propositionAnswers).toEqual(input.propositionAnswers);
  expect(
    lawInForce(enacted.world, state.id, question.id, enacted.world.currentDate)
      ?.measureId,
  ).toBe(enacted.measure.id);
  const government = withOpenedBudgets(
    base,
    {
      version: PUBLIC_BUDGETS_VERSION,
      cursor: { flows: 0, outcomes: 0 },
      governments: [],
      adjustments: [],
      unknown: [],
    },
    base.currentDate,
  ).governments.find((row) => row.key === "US-MD")!;
  expect(
    lawSpendingForMonth(enacted.world, government, input.introducedAt),
  ).toEqual(BUDGET_PROGRAMS.map(() => 0));
  const loaded = deserializeWorld(serializeWorld(enacted.world));
  expect(lawInForce(loaded, state.id, question.id, loaded.currentDate)).toEqual(
    lawInForce(enacted.world, state.id, question.id, enacted.world.currentDate),
  );
  expect(measurePosition(enacted.world, enacted.measure.id).phase).toBe(
    "enacted",
  );
  expect(
    measureActions(enacted.world, enacted.measure.id).filter(
      (x) => x.kind === "committee-hearing-held",
    ),
  ).toHaveLength(2);
});
