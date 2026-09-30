import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { createProductionPolicyCatalog } from "../production-catalog";
import { stableHash } from "../ids";
import { isLawEffectStamp } from "../law-effect-stamp";
import type { EntityId, World } from "../types";
import type { PublicBudgetGovernment } from "./store";
import { PARKS_DEDICATION_QUESTION } from "./rules";
import {
  PARKS_ANNUAL_PER_RESIDENT,
  parksAnnualPerResident,
  parksBudgetChange,
} from "./parks-dedication";
import { lawInForceAtStart } from "../governing/law-in-force";

const date = makeIsoDate("2026-08-01");
const catalog = createProductionPolicyCatalog();
const proposition = Object.values(catalog.propositions).find(
  (row) => row.stableKey === PARKS_DEDICATION_QUESTION,
)!;
const seed = "team5-five-place-parks-cost";
const states = [...lifePlaceStateIdentities()]
  .sort((a, b) =>
    stableHash(`${seed}:${a.jurisdictionKey}`).localeCompare(
      stableHash(`${seed}:${b.jurisdictionKey}`),
    ),
  )
  .slice(0, 5);
function fixture(key: string) {
  const state = stateJurisdictionForKey(key)!;
  const world = {
    id: "world_parks_fixture" as EntityId,
    seed,
    currentDate: date,
    policyCatalog: catalog,
    jurisdictions: { [state.id]: state },
    history: {
      nextSequence: 20,
      legislativeMeasures: [],
      legislativeEnactments: [],
    },
  } as unknown as World;
  const government = {
    key,
    jurisdictionId: state.id,
    lawJurisdictionId: state.id,
    level: "state",
    stateKey: key,
    population: 12000,
  } as PublicBudgetGovernment;
  const began = lawInForceAtStart(world, state.id, proposition.id, date);
  const enacted = {
    ...world,
    history: {
      ...world.history,
      legislativeMeasures: [
        {
          id: "measure_parks_cost" as EntityId,
          jurisdictionId: state.id,
          propositionIds: [proposition.id],
          propositionAnswers: [
            {
              propositionId: proposition.id,
              answer: began === "yes" ? "no" : "yes",
            },
          ],
        },
      ],
      legislativeEnactments: [
        {
          id: "enactment_parks_cost" as EntityId,
          sequence: 10,
          measureId: "measure_parks_cost" as EntityId,
          resolvedAt: makeIsoDate("2026-06-01"),
          effectiveAt: makeIsoDate("2026-07-01"),
          outcome: "enacted",
        },
      ],
    },
  } as unknown as World;
  return { world, enacted, government, began };
}
describe("parks dedication budget amounts", () => {
  it.each(states)(
    "reads canonical in-force cost/repeal and stable source range in $jurisdictionKey",
    (state) => {
      const { world, enacted, government, began } = fixture(
        state.jurisdictionKey,
      );
      expect(parksBudgetChange(world, government, date)).toBeNull();
      const effect = parksBudgetChange(enacted, government, date)!;
      expect(effect).not.toBeNull();
      const annual = parksAnnualPerResident(
        world,
        government.lawJurisdictionId,
      );
      expect(annual).toBeGreaterThanOrEqual(PARKS_ANNUAL_PER_RESIDENT.low);
      expect(annual).toBeLessThanOrEqual(PARKS_ANNUAL_PER_RESIDENT.high);
      expect(effect.dollars).toBe(
        ((annual * government.population) / 12) * (began === "yes" ? -1 : 1),
      );
      expect(isLawEffectStamp(effect.stamp)).toBe(true);
      expect(effect.stamp?.governingLawKey).toBe("measure_parks_cost");
      expect(effect.stamp?.effectKind).toBe("parks-spending");
      expect(effect.stamp?.jurisdictionId).toBe(government.lawJurisdictionId);
      expect(
        parksBudgetChange(
          JSON.parse(JSON.stringify(enacted)) as World,
          government,
          date,
        )?.dollars,
      ).toBe(effect.dollars);
      expect(
        parksBudgetChange(enacted, { ...government, level: "county" }, date),
      ).toBeNull();
      expect(
        parksBudgetChange(enacted, government, makeIsoDate("2026-06-01")),
      ).toBeNull();
    },
  );
  it("leaves missing and seedless values explicit without inventing a new amount", () => {
    const { world, government } = fixture(states[0]!.jurisdictionKey);
    expect(
      parksAnnualPerResident(
        { ...world, seed: "" },
        government.lawJurisdictionId,
      ),
    ).toBe(
      (PARKS_ANNUAL_PER_RESIDENT.low + PARKS_ANNUAL_PER_RESIDENT.high) / 2,
    );
    expect(
      parksBudgetChange(
        { ...world, policyCatalog: undefined } as unknown as World,
        government,
        date,
      ),
    ).toBeNull();
  });
});
