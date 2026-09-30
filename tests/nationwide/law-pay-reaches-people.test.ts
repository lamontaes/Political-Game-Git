import { afterAll, describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  addDays,
  simulationMomentOnLocalDate,
} from "../../src/simulation/dates";
import type { LawEffectStampedRecord } from "../../src/simulation/law-effect-stamp";
import { stableHash } from "../../src/simulation/ids";
import { lawExposuresFrom } from "../../src/simulation/law-exposure";
import {
  lifePlaceByKey,
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../../src/simulation/life-places";
import {
  nextPaydayDate,
  PAYDAY_TRANSITION_KEY,
  paydayHandler,
} from "../../src/simulation/living-world/town-pay";
import { TOWN_MINIMUM_WAGES } from "../../src/simulation/living-world/town-pay.generated";
import { NATIONAL_ELECTION_JURISDICTION } from "../../src/simulation/national-election-geography";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";
import {
  recordWorldEvent,
  withWorldIntegrityDeferred,
} from "../../src/simulation/world";
import type {
  EntityId,
  FutureDueItem,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../../src/simulation";

/**
 * A raise a law made reaches the person it raised: each town worker whose pay
 * the federal minimum wage lifted gets a record that the law reached them,
 * with the monthly difference, and their partner hears of it at home. The town
 * is drawn from every state whose own minimum sits below the raise.
 */

const SEED = "law-pay-reaches-people";
const raisedCounts = new Map<string, number>();
afterAll(() => {
  expect(raisedCounts.size).toBe(5);
  expect([...raisedCounts.values()].some((count) => count > 0)).toBe(true);
});
const POLICY = createProductionPolicyCatalog();
const RAISE_QUESTION = POLICY.propositionOrder.find(
  (id) =>
    POLICY.propositions[id]!.stableKey ===
    "us-federal-positions:labor-commerce.raise-federal-minimum-wage",
)!;

const STATES = lifePlaceStateIdentities().filter((state) => {
  const own = TOWN_MINIMUM_WAGES[state.jurisdictionKey];
  return own !== null && (own ?? 0) < 15;
});
const firstState =
  Number.parseInt(stableHash(SEED).slice(0, 8), 16) % STATES.length;
const TOWNS = Array.from({ length: 5 }, (_, index) => {
  const state = STATES[(firstState + index) % STATES.length]!;
  return searchLifePlaces("", 5000, {
    stateJurisdictionKey: state.jurisdictionKey,
  }).find((place) => place.scope !== "state")!;
});

function townWithFederalRaise(placeKey: string, effectiveInDays: number) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: SEED,
      placeKey,
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  const opened = game.world.currentDate;
  const nashville = lifePlaceByKey(placeKey)!.context.jurisdiction;
  const recorded = recordWorldEvent(game.world, {
    stableKey: "event:test:federal-wage:enacted",
    type: "legislation.measure-enacted",
    occurredAt: opened,
    recordedAt: opened,
    jurisdictionId: nashville.id,
    involvedEntityIds: [game.playerPersonId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["legislation", "legislation.enacted"],
    summary: "H.R. 1 became law.",
    context: {
      location: {
        jurisdictionId: nashville.id,
        label: nashville.name,
        setting: null,
      },
      socialContext: "The measure completed every required step.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const measure: LegislativeMeasureRecord = {
    id: "measure_federal_wage" as EntityId,
    stableKey: "test:federal-wage",
    sequence: 1,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    rulePackId: "us-congress-v1",
    designation: "H.R. 1",
    shortTitle: "Raise the federal minimum wage",
    summary: "A test Act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: opened,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [RAISE_QUESTION],
    propositionAnswers: [{ propositionId: RAISE_QUESTION, answer: "yes" }],
  };
  const enactment: LegislativeEnactmentRecord = {
    id: "enactment_federal_wage" as EntityId,
    stableKey: "test:federal-wage:enactment",
    sequence: 1_000_001,
    measureId: measure.id,
    resolvedAt: opened,
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: addDays(opened, effectiveInDays),
    outcomeEventId: recorded.history.events.find(
      (event) => event.stableKey === "event:test:federal-wage:enacted",
    )!.id,
  };
  const world = {
    ...recorded,
    policyCatalog: POLICY,
    history: {
      ...recorded.history,
      legislativeMeasures: [
        ...(recorded.history.legislativeMeasures ?? []),
        measure,
      ],
      legislativeEnactments: [
        ...(recorded.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  } as World;
  return {
    world,
    opened,
    effectiveAt: enactment.effectiveAt!,
    player: game.playerPersonId,
  };
}

/** Runs the payday transition on every payday from the game's opening. */
function runPaydays(start: World, since: IsoDate, days: number): World {
  let world = start;
  let paidThrough = since;
  const until = addDays(since, days);
  const paydays: IsoDate[] = [];
  for (
    let payday = nextPaydayDate(world.currentDate);
    payday <= until;
    payday = nextPaydayDate(payday)
  )
    paydays.push(payday);
  withWorldIntegrityDeferred(() => {
    for (const payday of paydays) {
      world = {
        ...world,
        currentDate: payday,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, payday),
      };
      world = paydayHandler(world, {
        id: `test-payday:${paidThrough}` as EntityId,
        sequence: world.history.nextSequence,
        stableKey: `town-pay-v2:payday:${paidThrough}`,
        scheduledAt: since,
        dueAt: payday,
        transitionKey: PAYDAY_TRANSITION_KEY,
        entityIds: [],
        jurisdictionId: null,
        provenance: { kind: "authored", note: "Focused payday fixture." },
      } satisfies FutureDueItem).world;
      paidThrough = payday;
    }
  });
  return world;
}

describe.each(TOWNS)(
  `a federal minimum wage raise in $displayName (seed ${SEED})`,
  (TOWN) => {
    it("reaches every worker it raised, with the monthly difference, and their partners", () => {
      const { world, opened, player } = townWithFederalRaise(TOWN.key, 30);
      const paid = runPaydays(world, opened, 75);
      const raised = paid.history.resourceFlowTerms.filter((row) =>
        row.stableKey.includes(":minimum-wage:"),
      );
      const reached = lawExposuresFrom(
        paid,
        "measure_federal_wage" as EntityId,
      );
      const own = reached.filter((row) => row.relation === "own");
      raisedCounts.set(TOWN.key, raised.length);
      // An unchanged job produces no raise or own exposure. Empty cases are
      // retained in the five-state sample, rather than rerolled away.
      if (raised.length === 0) expect(own).toEqual([]);
      for (const row of raised) {
        const stamps = (row as typeof row & LawEffectStampedRecord)
          .lawEffectStamps;
        expect(stamps).toHaveLength(1);
        expect(stamps![0]).toMatchObject({
          governingLawKey: "measure_federal_wage",
          questionKey: POLICY.propositions[RAISE_QUESTION]!.stableKey,
          effectKind: "paycheck",
          appliedAt: row.effectiveAt,
        });
        expect(stamps![0]!.sourceRecordIds).toContain(row.resourceFlowId);
        expect(stamps![0]!.sourceRecordIds).toContain(row.supersedesTermsId);
      }
      const restored = JSON.parse(JSON.stringify(paid)) as World;
      expect(restored.history.resourceFlowTerms).toEqual(
        paid.history.resourceFlowTerms,
      );

      // Every raise but the player's own reached its worker as a gain.
      const flows = new Map(paid.history.resourceFlows.map((f) => [f.id, f]));
      const workers = raised
        .map((row) => flows.get(row.resourceFlowId)!.recipient)
        .flatMap((to) => (to.kind === "person" ? [to.personId] : []))
        .filter((id) => id !== player);
      expect(new Set(own.map((row) => row.personId))).toEqual(new Set(workers));
      for (const row of own) {
        expect(row.channel).toBe("paycheck");
        expect(row.direction).toBe("gain");
        expect(row.cadence).toBe("monthly");
        expect(row.amount!.minorUnits).toBeGreaterThan(0);
      }
      // Each worker's partner hears of it at home.
      for (const row of reached.filter((r) => r.relation === "family"))
        expect(own.map((r) => r.personId)).toContain(row.viaPersonId);
      // Running the same paydays again notices nothing twice.
      expect(
        lawExposuresFrom(
          runPaydays(paid, opened, 75),
          "measure_federal_wage" as EntityId,
        ),
      ).toHaveLength(reached.length);
    }, 120_000);
  },
);
