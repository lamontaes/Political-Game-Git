import { appendFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import { makeIsoDate } from "../../src/simulation/dates";
import {
  FAIRNESS_STATE_QUESTION,
  fairnessLawCovers,
  menPartneredWithMen,
  UNCOVERED_PAY_SHARE,
} from "../../src/simulation/fairness-pay-law";
import { lawInForce } from "../../src/simulation/governing/law-in-force";
import { createStableId, stableHash } from "../../src/simulation/ids";
import {
  lifePlaceByKey,
  stateJurisdictionForKey,
} from "../../src/simulation/life-places";
import { startTownJobPay } from "../../src/simulation/living-world/town-pay";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { resourceFlowTermsAt } from "../../src/simulation/resource-queries";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import { withWorldIntegrityDeferred } from "../../src/simulation/world";
import type {
  EntityId,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../../src/simulation";

/**
 * A fairness law sets what a man partnered with a man is paid when he is
 * hired: where neither his state's law nor his town's ordinance covers him,
 * 2.7% below the job's rate (Burn 2018); where one does, the full rate. The
 * same town is opened twice, once under its real starting law and once with
 * the state's law turned the other way before anyone is hired, and every
 * town job is paid in both. The place is drawn from the largest town of each
 * of the 56 places.
 */

const SEED = "fairness-law-moves-pay";

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
  const enactment: LegislativeEnactmentRecord = {
    id: createStableId("legislative-enactment", "test:fairness-pay:enactment"),
    stableKey: "test:fairness-pay:enactment",
    sequence: sequence + 1,
    measureId: measure.id,
    resolvedAt: on,
    outcome: "enacted",
    actDesignation: null,
    effectiveAt: on,
    outcomeEventId: null,
  };
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: sequence + 2,
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        measure,
      ],
      legislativeEnactments: [
        ...(world.history.legislativeEnactments ?? []),
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
  const other = start === "yes" ? "no" : "yes";
  const turnedWorld = flipped(game.world, state, other);
  expect(fairnessLawCovers(game.world, town, since), key).toBe(start === "yes");
  expect(fairnessLawCovers(turnedWorld, town, since), key).toBe(
    other === "yes",
  );
  const real = startTownJobPay(game.world, game.playerPersonId, since);
  // The act is written straight into the record, not through a legislature,
  // so the writers' checks of a whole world are left out for this copy.
  const turned = withWorldIntegrityDeferred(() =>
    startTownJobPay(turnedWorld, game.playerPersonId, since),
  );
  const men = menPartneredWithMen(game.world, since);
  const withLaw = payByPerson(start === "yes" ? real : turned);
  const without = payByPerson(start === "yes" ? turned : real);
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

describe("a fairness law sets the pay of men partnered with men", () => {
  it(`in the first town, in an order drawn from seed ${SEED}, with such a man in a paid job: 2.7% less where no law covers him`, () => {
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
      // Within rounding to the cent, and never below the minimum wage.
      expect(row.without / row.withLaw, row.person).toBeCloseTo(
        UNCOVERED_PAY_SHARE,
        3,
      );
    if (process.env.PROBE_OUT)
      appendFileSync(
        process.env.PROBE_OUT,
        `skipped: ${passed.join("; ")}\n${found!.key} ${lifePlaceByKey(found!.key)!.context.jurisdiction.name} start=${found!.start} others=${found!.others}\n` +
          found!.covered
            .map(
              (row) =>
                `  ${row.person}: ${row.withLaw} a period with the law, ${row.without} without`,
            )
            .join("\n") +
          "\n",
      );
  });
});
