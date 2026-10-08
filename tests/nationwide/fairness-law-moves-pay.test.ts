import { describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import startingLaw from "../../data/research/laws/starting-law-2026/index";
import { makeIsoDate } from "../../src/simulation/dates";
import {
  FAIRNESS_STATE_QUESTION,
  fairnessLawCovers,
  menPartneredWithMen,
} from "../../src/simulation/fairness-pay-law";
import { lawInForce } from "../../src/simulation/governing/law-in-force";
import { createStableId, stableHash } from "../../src/simulation/ids";
import {
  lifePlaceByKey,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { startTownJobPay } from "../../src/simulation/living-world/town-pay";
import { createProductionPolicyCatalog } from "../../src/simulation/production-catalog";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { resourceFlowTermsAt } from "../../src/simulation/resource-queries";
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

/** The same recorded town job offer is preserved across legal coverage. */

const SEED = "fairness-law-moves-pay";
const START = makeIsoDate("2026-01-05");

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

function flipped(world: World, state: EntityId, answer: "yes" | "no"): World {
  const question = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === FAIRNESS_STATE_QUESTION,
  )!.id;
  const on = makeIsoDate("2025-01-01");
  const sequence = world.history.nextSequence;
  const measure: LegislativeMeasureRecord = {
    id: createStableId("legislative-measure", "test:fairness-pay"),
    stableKey: "test:fairness-pay",
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
    propositionAnswers: [{ propositionId: question, answer }],
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
    id: createStableId("legislative-enactment", "test:fairness-pay:enactment"),
    stableKey: "test:fairness-pay:enactment",
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

/** Each town worker's first paycheck, by person. */
function payByPerson(world: World): ReadonlyMap<EntityId, number> {
  const pay = new Map<EntityId, number>();
  for (const flow of world.history.resourceFlows) {
    if (flow.basisReference.kind !== "work") continue;
    if (flow.recipient.kind !== "person") continue;
    const terms = resourceFlowTermsAt(world, flow.id);
    if (terms) pay.set(flow.recipient.personId, terms.amount.minorUnits);
  }
  return pay;
}

interface Watched {
  readonly key: string;
  readonly start: "yes" | "no";
  readonly covered: readonly {
    readonly person: EntityId;
    readonly withLaw: number;
    readonly without: number;
  }[];
  readonly others: number;
}

/** Opens the place's largest town and pays it under both laws. */
function watch(key: string): Watched {
  const place = lifePlaceByKey(key)!;
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: SEED,
      placeKey: key,
      startAge: 24,
      questionnaire: "skipped",
    }),
  ).game!;
  const since = game.world.currentDate;
  const town = place.context.jurisdiction.id;
  const state = stateJurisdictionForKey(place.stateJurisdictionKey!)!.id;
  const question = Object.values(game.world.policyCatalog.propositions).find(
    (row) => row.stableKey === FAIRNESS_STATE_QUESTION,
  )!.id;
  const start = lawInForce(game.world, state, question, since)!.answer as
    "yes" | "no";
  const coveredAtStart = fairnessLawCovers(game.world, town, since);
  // The state's law is turned whichever way takes the men's cover away or
  // gives it to them.
  const other = coveredAtStart ? "no" : "yes";
  const turnedWorld = flipped(game.world, state, other);
  expect(fairnessLawCovers(turnedWorld, town, since), key).toBe(
    !coveredAtStart,
  );
  const real = startTownJobPay(game.world, game.playerPersonId, since);
  // The act is written straight into the record, not through a legislature,
  // so the writers' checks of a whole world are left out for this copy.
  const turned = withWorldIntegrityDeferred(() =>
    startTownJobPay(turnedWorld, game.playerPersonId, since),
  );
  const men = menPartneredWithMen(game.world, since);
  const withLaw = payByPerson(coveredAtStart ? real : turned);
  const without = payByPerson(coveredAtStart ? turned : real);
  const covered: Watched["covered"][number][] = [];
  let others = 0;
  for (const [person, full] of withLaw) {
    const less = without.get(person)!;
    if (men.has(person)) covered.push({ person, withLaw: full, without: less });
    else {
      others += 1;
      // Nobody else's pay depends on the law.
      expect(less, person).toBe(full);
    }
  }
  return { key, start, covered, others };
}

describe("fairness coverage does not invent a lower employer offer", () => {
  it("in every one of the 56 places, the start covers them exactly where the law names sexual orientation", () => {
    const rows = (
      startingLaw.questions as unknown as Record<
        string,
        {
          answers: Record<
            string,
            { answer: string; grounds?: readonly string[] }
          >;
        }
      >
    )[FAIRNESS_STATE_QUESTION]!.answers;
    const world = {
      currentDate: START,
      policyCatalog: createProductionPolicyCatalog(),
      history: { legislativeMeasures: [], legislativeEnactments: [] },
    } as unknown as World;
    const places = onePlaceEach();
    let covered = 0;
    for (const key of places) {
      const place = lifePlaceByKey(key)!;
      const row = rows[place.stateJurisdictionKey!]!;
      const names =
        row.answer === "yes" ||
        (row.grounds ?? []).includes("sexual-orientation");
      expect(
        fairnessLawCovers(world, place.context.jurisdiction.id, START),
        key,
      ).toBe(names);
      if (names) covered += 1;
    }
    // 26 places name both grounds, and Iowa and Wisconsin name sexual
    // orientation alone.
    expect(covered).toBe(28);
  });

  it(`in the first town, in an order drawn from seed ${SEED}, with such a man in a paid job: the same job offer is not reduced where no law covers him`, () => {
    const places = onePlaceEach();
    expect(places).toHaveLength(56);
    const order = [...places].sort((a, b) =>
      stableHash(`${SEED}:${a}`).localeCompare(stableHash(`${SEED}:${b}`)),
    );
    let found: Watched | null = null;
    const passed: string[] = [];
    for (const key of order.slice(0, 20)) {
      const watched = watch(key);
      if (watched.covered.length > 0) {
        found = watched;
        break;
      }
      passed.push(`${key} (${watched.others} paid, none covered)`);
    }
    expect(found, passed.join("; ")).not.toBeNull();
    for (const row of found!.covered)
      expect(row.without, row.person).toBe(row.withLaw);
  });
});
