import { beforeAll, expect, it } from "vitest";
import { applyLegislativeStep } from "../presentation/legislation-session";
import { addDays, daysBetween } from "./dates";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import {
  introduceMeasure,
  availableMeasureSteps,
  measurePosition,
  recordEnactment,
} from "./legislation";
import {
  createLegislativeScenario,
  type LegislativeScenario,
} from "./legislation-scenarios";
import { recordFiledProvision } from "./legislative-politics";
import { lifePlaceByKey, stateJurisdictionForKey } from "./life-places";
import {
  STATE_MINIMUM_WAGE_QUESTION_KEY,
  stateMinimumSettingAt,
  startingStateMinimumHourly,
} from "./minimum-wage";
import { createProductionPolicyCatalog } from "./production-catalog";
import { serializeWorld, deserializeWorld } from "./serialization";
import { createWorld, advanceWorld } from "./world";
import type { EntityId, IsoDate, World } from "./types";
import { SeededRng } from "./rng";
import { PLACE_POPULATION_ROWS } from "./nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "./territory-places";

const places = new Map<string, [string, number]>();
for (const pair of PLACE_POPULATION_ROWS.split(";")) {
  const [key, count] = pair.split(":") as [string, string];
  if ((places.get(key.slice(0, 2))?.[1] ?? -1) < Number(count))
    places.set(key.slice(0, 2), [key, Number(count)]);
}
places.set("15", ["1571550", 0]);
places.set("72", ["7276770", 0]);
for (const [key, , usps] of TERRITORY_PLACE_ROWS)
  if (!places.has(usps)) places.set(usps, [key, 0]);
expect(places.size).toBe(56);
const pool = [...places.values()].map(([key]) => key);
const rng = new SeededRng("pay-kind-five-places");
const sampled = Array.from(
  { length: 5 },
  () => pool.splice(rng.integer(0, pool.length - 1), 1)[0]!,
);

// Fictional numeric clauses and authored procedure decisions exercise legal
// text. They are not researched wage rates or ordinary player-clock proof.
let scenario: LegislativeScenario;
let base: World;
let questionId: EntityId;
const stateKey = "US-NE";

beforeAll(() => {
  scenario = createLegislativeScenario("nebraska");
  const state = stateJurisdictionForKey(stateKey)!;
  const jurisdictions = new Map(
    scenario.world.jurisdictionOrder.map((id) => [
      id,
      scenario.world.jurisdictions[id]!,
    ]),
  );
  jurisdictions.set(state.id, state);
  for (const key of sampled) {
    const observedKey = lifePlaceByKey(key)!.stateJurisdictionKey!;
    const observed = stateJurisdictionForKey(observedKey)!;
    jurisdictions.set(observed.id, observed);
  }
  base = createWorld({
    seed: scenario.world.seed,
    currentDate: scenario.world.currentDate,
    currentMoment: scenario.world.currentMoment,
    people: scenario.world.personOrder.map((id) => scenario.world.people[id]!),
    jurisdictions: [...jurisdictions.values()],
    policyCatalog: createProductionPolicyCatalog(),
  });
  questionId = base.policyCatalog.propositionOrder.find(
    (id) =>
      base.policyCatalog.propositions[id]!.stableKey ===
      STATE_MINIMUM_WAGE_QUESTION_KEY,
  )!;
  expect(questionId).toBeDefined();
});

function enactedTarget(
  key: string,
  value?: number,
  unit: "minor/hour" | "minor" = "minor/hour",
  effectiveDays = 0,
) {
  const jurisdictionId = stateJurisdictionForKey(stateKey)!.id;
  let world = introduceMeasure(base, {
    stableKey: key,
    jurisdictionId,
    rulePackId: scenario.pack.packId,
    designation: "LB 990",
    shortTitle: "Controlled minimum wage text",
    summary: "Fictional legal text and explicit authored vote decisions.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    sponsorPersonId: scenario.playerPersonId,
    originChamberKey: scenario.pack.chamberOrder[0]!,
    propositionIds: [questionId],
    propositionAnswers: [{ propositionId: questionId, answer: "yes" }],
  });
  const measureId = world.history.legislativeMeasures!.at(-1)!.id;
  if (value !== undefined)
    world = recordFiledProvision(world, {
      stableKey: `${key}:target`,
      measureId,
      provisionKey: "minimum-wage-target",
      sectionNumber: 1,
      heading: "Controlled wage target",
      text: `The fictional hourly target is ${value} in the specified unit.`,
      beneficiary: {
        kind: "general-application",
        appliesToLabel: "covered work under this fictional wage rule",
      },
      applicationScope: { jurisdictionId, segmentKey: null },
      lawTerms: [
        {
          questionKey: STATE_MINIMUM_WAGE_QUESTION_KEY,
          key: "target",
          value,
          unit,
        },
      ],
    });
  const context = {
    ...scenario,
    measureId,
    governorAction: "signed" as const,
    governorRationale: "Explicit favorable fixture decision.",
  };
  for (let guard = 0; guard < 40; guard += 1) {
    if (measurePosition(world, measureId).phase === "awaiting-enactment") {
      const effectiveAt = addDays(world.currentDate, effectiveDays);
      world = recordEnactment(world, {
        stableKey: `${key}:enacted`,
        measureId,
        effectiveAt,
      });
      return { world, measureId, effectiveAt };
    }
    const step = availableMeasureSteps(world, measureId).find(
      (candidate) => candidate !== "offer-amendment",
    );
    if (!step) throw new Error(`No canonical next step for ${measureId}`);
    world = applyLegislativeStep(context, world, step).world;
  }
  throw new Error("Controlled state wage bill did not reach enactment.");
}

function later(world: World, date: IsoDate): World {
  return advanceWorld(
    world,
    daysBetween(world.currentDate, date),
    createFutureTransitionHandlerRegistry([]),
  );
}

it("A39 reads the exact adopted hourly target rather than an average addition", () => {
  const f = enactedTarget("state-target:explicit", 1775);
  const setting = stateMinimumSettingAt(f.world, stateKey, f.effectiveAt)!;
  expect(setting.hourlyMinor).toBe(1775);
  expect(setting.measureId).toBe(f.measureId);
  expect(setting.effectiveAt).toBe(f.effectiveAt);
  const after = later(f.world, addDays(f.effectiveAt, 731));
  expect(
    stateMinimumSettingAt(after, stateKey, after.currentDate)!.hourlyMinor,
  ).toBe(1775);
  expect(
    stateMinimumSettingAt(
      deserializeWorld(serializeWorld(after)),
      stateKey,
      after.currentDate,
    ),
  ).toEqual(stateMinimumSettingAt(after, stateKey, after.currentDate));
});

it("A39 does not derive a numeric raise from a plain yes answer", () => {
  const f = enactedTarget("state-target:missing");
  const setting = stateMinimumSettingAt(f.world, stateKey, f.effectiveAt)!;
  expect(setting.hourlyMinor).toBe(
    Math.round(
      startingStateMinimumHourly(stateKey, f.world, f.effectiveAt)! * 100,
    ),
  );
  expect(setting.measureId).toBeNull();
});

it("A39 refuses a target in the wrong unit", () => {
  const f = enactedTarget("state-target:unit", 1775, "minor");
  expect(stateMinimumSettingAt(f.world, stateKey, f.effectiveAt)).toMatchObject(
    {
      measureId: null,
      hourlyMinor:
        startingStateMinimumHourly(stateKey, f.world, f.effectiveAt)! * 100,
    },
  );
});

it("A39 activates a future adopted target only on its date after an earlier read", () => {
  const f = enactedTarget("state-target:dated", 1825, "minor/hour", 30);
  expect(
    stateMinimumSettingAt(f.world, stateKey, f.world.currentDate)!.measureId,
  ).toBeNull();
  // The shared final-term reader refuses future activity dates. This miss
  // must not poison the cache when the same saved enactments reach that date.
  expect(stateMinimumSettingAt(f.world, stateKey, f.effectiveAt)).toBeNull();
  const arrived = later(f.world, f.effectiveAt);
  expect(stateMinimumSettingAt(arrived, stateKey, f.effectiveAt)).toMatchObject(
    {
      hourlyMinor: 1825,
      measureId: f.measureId,
      effectiveAt: f.effectiveAt,
    },
  );
});

it.each(sampled)(
  "A39 keeps the saved Nebraska target out of the actual jurisdiction for %s",
  (placeKey) => {
    const f = enactedTarget(`state-target:scope:${placeKey}`, 1775);
    const observedKey = lifePlaceByKey(placeKey)!.stateJurisdictionKey!;
    const observed = stateJurisdictionForKey(observedKey)!;
    expect(f.world.jurisdictions[observed.id]).toBeDefined();
    expect(observedKey).not.toBe(stateKey);
    const setting = stateMinimumSettingAt(f.world, observedKey, f.effectiveAt);
    const starting = startingStateMinimumHourly(
      observedKey,
      f.world,
      f.effectiveAt,
    );
    if (starting === null) expect(setting).toBeNull();
    else
      expect(setting).toMatchObject({
        hourlyMinor: Math.round(starting * 100),
        measureId: null,
      });
    console.info("A39_STATE_TERM_SCOPE", {
      sampleSeed: "pay-kind-five-places",
      placeKey,
      observedKey,
      actualLawJurisdiction: stateKey,
      measureId: f.measureId,
      unchangedMinor: setting?.hourlyMinor ?? null,
      fixture: "canonical legal reader; not a paycheck or natural enactment",
    });
  },
);
