/** Property tax bills on owners: a twelfth of assessed value times the rate each month, with an assessment cap where the law sets one. */
import { afterEach, describe, expect, it } from "vitest";
import { advanceCore, createLifeCore } from "./life";
import {
  billPropertyTax,
  registerPropertyTax,
  stateEffectiveRate,
} from "./housing-property-tax";
import { randomUUID } from "node:crypto";
import { drawPlace } from "../../tests/golden-path/place";
import { HOUSING_MODULE } from "./modules/housing";
import { lawInForce, openLaws } from "./modules/laws";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "./modules/world";
import { generatedOpening } from "./tooling/generated-world";
import { coreAPI } from "./state";
import type { CoreInput, Source } from "./types";

const start = "2021-01-01",
  place = "place:tax-fixture",
  county = "organization:county-treasury";
const src: Source = {
  tag: "ESTIMATED",
  asOf: start,
  citation: "Technical fixture records.",
  estimatedFrom: "Property tax fixture only.",
};
function input(): CoreInput {
  return {
    seed: "tax-fixture",
    startedAt: start,
    people: [
      {
        id: "owner",
        givenName: "owner",
        familyName: "Fixture",
        birthDate: "1960-01-01",
        placeId: place,
        householdId: "household:owner",
        tier: "monthly",
        traits: {},
        liquidMinor: 10_000_000,
        livingCostDailyMinor: 0,
        source: src,
        familyIds: [],
        knownIds: [],
      },
    ],
    households: [
      {
        id: "household:owner",
        placeId: place,
        memberIds: ["owner"],
        source: src,
      },
    ],
    jobs: [],
    organizations: [
      {
        id: county,
        placeId: place,
        name: "County treasury",
        kind: "employer",
        liquidMinor: 0,
        source: src,
      },
      {
        id: "organization:outside",
        placeId: place,
        name: "Outside the town",
        kind: "outside",
        liquidMinor: 0,
        outsideFlow: src,
        source: src,
      },
    ],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
    placeMetadata: { housingState: "NJ" },
  } as CoreInput;
}

afterEach(() => registerPropertyTax(() => undefined));

describe("property tax bills", () => {
  it("without a county rate in force, the owner pays the state's average effective rate outside the town", () => {
    const core = createLifeCore(input(), {
        data: worldCoreData(),
        modules: [HOUSING_MODULE],
      }),
      api = coreAPI(core);
    advanceCore(core, "2021-01-02");
    const table = api.moduleState("housing").table("assessments");
    const homes = [
      {
        householdId: "household:owner",
        placeId: place,
        valueMinor: 40_000_000,
      },
    ];
    const paid = billPropertyTax(api, table, homes);
    expect(paid).toBe(Math.round((40_000_000 * stateEffectiveRate("NJ")) / 12));
  });
  it("a county's rate and a 2% assessment cap: a 10% rise in value raises the bill 2% the next January", () => {
    registerPropertyTax(() => ({
      rate: 0.02,
      assessmentCapShare: 0.02,
      payeeId: county,
      source: src,
    }));
    const core = createLifeCore(input(), {
        data: worldCoreData(),
        modules: [HOUSING_MODULE],
      }),
      api = coreAPI(core);
    advanceCore(core, "2021-01-02");
    const table = api.moduleState("housing").table("assessments");
    const home = { householdId: "household:owner", placeId: place };
    const first = billPropertyTax(api, table, [
      { ...home, valueMinor: 40_000_000 },
    ]);
    expect(first).toBe(Math.round((40_000_000 * 0.02) / 12));
    advanceCore(core, "2022-01-05");
    const second = billPropertyTax(api, table, [
      { ...home, valueMinor: 44_000_000 },
    ]);
    expect(second).toBe(Math.round((40_800_000 * 0.02) / 12));
    expect(core.organizations.get(county)!.liquidMinor).toBe(first + second);
  });
  it("with the laws open, an owner in a generated world pays the county's recorded rate", () => {
    const drawn = drawPlace(randomUUID(), "property-tax");
    console.log(
      `property tax: ${drawn.name}, ${drawn.state}, seed ${drawn.seed}`,
    );
    const opening = withWorldEconomy(
      generatedOpening(drawn, { twoLevel: true }),
    );
    const core = createLifeCore(opening, {
      data: worldCoreData(),
      modules: [...WORLD_MODULES],
    });
    advanceCore(core, opening.startedAt);
    openLaws(core);
    const api = coreAPI(core);
    const answer = lawInForce(api, "property-tax");
    const percent = (answer.governing ?? answer.pending[0])?.value;
    const rate =
      typeof percent === "number"
        ? percent / 100
        : stateEffectiveRate(opening.placeMetadata?.housingState ?? "");
    const table = api.moduleState("housing").table("assessments");
    const paid = billPropertyTax(api, table, [
      {
        householdId: opening.households[0]!.id,
        placeId: opening.households[0]!.placeId,
        valueMinor: 30_000_000,
      },
    ]);
    expect(paid).toBe(Math.round((30_000_000 * rate) / 12));
  }, 300_000);
});
