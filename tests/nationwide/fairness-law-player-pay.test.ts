import { describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import { ageOnDate, makeIsoDate } from "../../src/simulation/dates";
import {
  FAIRNESS_STATE_QUESTION,
  fairnessLawCovers,
} from "../../src/simulation/fairness-pay-law";
import { createStableId, stableHash } from "../../src/simulation/ids";
import { createPartnership } from "../../src/simulation/life";
import { enterLifePath } from "../../src/simulation/life-paths2";
import {
  lifePlaceByKey,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { personGender } from "../../src/simulation/person-identity";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import {
  recordWorldEvent,
  withWorldIntegrityDeferred,
} from "../../src/simulation/world";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../../src/simulation";

/** Actual player shift offers are preserved across partnership and legal coverage. */

const SEED = "fairness-law-player-pay";
const PATH = "shop-assistant";

function onePlaceEach(): readonly string[] {
  const largest = new Map<string, [string, number]>();
  for (const pair of PLACE_POPULATION_ROWS.split(";")) {
    const [geoid, people] = pair.split(":") as [string, string];
    const state = geoid.slice(0, 2);
    if ((largest.get(state)?.[1] ?? -1) < Number(people))
      largest.set(state, [geoid, Number(people)]);
  }
  // Honolulu and San Juan are not in the population rows.
  largest.set("15", ["1571550", 0]);
  largest.set("72", ["7276770", 0]);
  for (const [key, , usps] of TERRITORY_PLACE_ROWS)
    if (!largest.has(usps)) largest.set(usps, [key, 0]);
  return [...largest.values()].map(([key]) => key).sort();
}

function covered(world: World, state: EntityId): World {
  const question = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === FAIRNESS_STATE_QUESTION,
  )!.id;
  const on = makeIsoDate("2025-01-01");
  const sequence = world.history.nextSequence;
  const measure: LegislativeMeasureRecord = {
    id: createStableId("legislative-measure", "test:fairness-player-pay"),
    stableKey: "test:fairness-player-pay",
    sequence,
    jurisdictionId: state,
    rulePackId: "test",
    designation: "HB 1",
    shortTitle: "A fairness act",
    summary: "A test act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: on,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [question],
    propositionAnswers: [{ propositionId: question, answer: "yes" }],
  };
  const withMeasure: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: sequence + 1,
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        measure,
      ],
    },
  };
  const withEvent = recordWorldEvent(withMeasure, {
    stableKey: `${measure.stableKey}:fixture-enacted-event`,
    type: "legislation.enacted",
    occurredAt: on,
    recordedAt: world.currentDate,
    jurisdictionId: state,
    involvedEntityIds: [measure.id, state],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["legislation"],
    summary: "Authored fairness coverage contrast enacted.",
    context: {
      location: {
        jurisdictionId: state,
        label: world.jurisdictions[state]!.name,
        setting: null,
      },
      socialContext:
        "Explicit coverage contrast; no money term or employer offer is authored.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const enactment: LegislativeEnactmentRecord = {
    id: createStableId(
      "legislative-enactment",
      "test:fairness-player-pay:enactment",
    ),
    stableKey: "test:fairness-player-pay:enactment",
    sequence: withEvent.history.nextSequence,
    measureId: measure.id,
    resolvedAt: on,
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: on,
    outcomeEventId: withEvent.history.events.at(-1)!.id,
  };
  return {
    ...withEvent,
    history: {
      ...withEvent.history,
      nextSequence: withEvent.history.nextSequence + 1,
      legislativeEnactments: [
        ...(withEvent.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  };
}

/** What one shift of the path is set to pay when the player takes it. */
function shiftPay(world: World): { amount: number; note: string } {
  const entered = enterLifePath(world, PATH);
  expect(entered.ok, entered.message).toBe(true);
  const work = entered.world.history.workRelationships.at(-1)!;
  const flow = entered.world.history.resourceFlows.find(
    (row) =>
      row.basisReference.kind === "work" &&
      row.basisReference.workRelationshipId === work.id,
  )!;
  const terms = entered.world.history.resourceFlowTerms.find(
    (row) => row.resourceFlowId === flow.id,
  )!;
  return {
    amount: terms.amount.minorUnits,
    note: flow.provenance.kind === "authored" ? flow.provenance.note : "",
  };
}

describe("the player is hired under the fairness law's pay rule", () => {
  it(`in the first uncovered place, in an order drawn from seed ${SEED}: a male partnership does not create a pay cut with or without legal coverage`, () => {
    const order = [...onePlaceEach()].sort((a, b) =>
      stableHash(`${SEED}:${a}`).localeCompare(stableHash(`${SEED}:${b}`)),
    );
    let world: World | null = null;
    let place = "";
    for (const candidate of order) {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed: SEED,
          placeKey: candidate,
          startAge: 24,
          gender: "male",
          questionnaire: "skipped",
        }),
      ).game!;
      const home =
        game.world.people[game.playerPersonId]!.homeJurisdictionId ?? null;
      if (fairnessLawCovers(game.world, home, game.world.currentDate)) continue;
      world = game.world;
      place = candidate;
      break;
    }
    expect(world, "no uncovered place among the 56").not.toBeNull();
    const player =
      world!.control.kind === "person" ? world!.control.personId : null;
    expect(player).not.toBeNull();
    const state = stateJurisdictionForKey(
      lifePlaceByKey(place)!.stateJurisdictionKey!,
    )!.id;

    // Unpartnered, the job pays the same under either law.
    const single = shiftPay(world!);
    const singleCovered = withWorldIntegrityDeferred(() =>
      shiftPay(covered(world!, state)),
    );
    expect(single.amount).toBe(singleCovered.amount);

    const partnered = new Set(
      world!.history.partnerships.flatMap((row) => row.personIds),
    );
    const partner = world!.personOrder.find((id) => {
      const person = world!.people[id]!;
      return (
        id !== player &&
        !partnered.has(id) &&
        personGender(person) === "male" &&
        ageOnDate(person.birthDate, world!.currentDate) >= 21
      );
    })!;
    expect(partner, "a man in the world to partner with").toBeDefined();
    const together = createPartnership(world!, {
      stableKey: `${SEED}:partnership`,
      personIds: [player!, partner].sort() as [EntityId, EntityId],
      startedAt: world!.currentDate,
      kind: "legal:marriage",
      provenance: { kind: "authored", note: "A married couple for the test." },
    });

    const without = shiftPay(together);
    const withLaw = withWorldIntegrityDeferred(() =>
      shiftPay(covered(together, state)),
    );
    expect(withLaw.amount).toBe(single.amount);
    expect(without.amount).toBe(single.amount);
    expect(without.amount).toBe(withLaw.amount);
    expect(without.note).not.toMatch(
      /no fairness law covers him where he works/,
    );
    expect(withLaw.note).not.toMatch(/fairness law/);
    console.info(
      `${lifePlaceByKey(place)!.displayName} (${place}, seed ${SEED}): the player's four-hour shift pays $${(without.amount / 100).toFixed(2)} without coverage, $${(withLaw.amount / 100).toFixed(2)} under a fairness law; single, $${(single.amount / 100).toFixed(2)} either way.`,
    );
  });
});
