/**
 * Law reach, group A housing laws in a generated town with the housing
 * engine (a random place from all 56, by seed): allowing more homes on
 * single-family lots opens the town's land to apartments for its builders,
 * and a right to counsel in eviction makes the government that passed it
 * the payer of tenants' lawyers. A repeal puts both back.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { enactLaw, lawChain, openLaws } from "./modules/laws";
import { governments, openBudgets } from "./modules/budgets";
import { openLawEffects } from "./modules/law-effects";
import { repealStartingAnswers } from "./law-test-start";
import {
  HOUSING_MODULE,
  HOUSING_MODULE_ID,
  withHousing,
} from "./modules/housing";
import { worldCoreData } from "./modules/world";
import { openingZoning } from "./housing-construction";
import { reachParameter } from "./law-reach/group-a-records";
import { COUNSEL_KEY, MULTIFAMILY_KEY } from "./law-reach/group-a-housing";
import { governmentUnitsForPlace } from "../simulation/government-units";
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../simulation/life-places";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`reach-housing:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const after = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

function openTown() {
  const states = [...lifePlaceStateIdentities()]
    .map((s) => s.jurisdictionKey)
    .sort();
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const state = pick(states, `state:${attempt}`);
    const places = [
      ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ]
      .filter((p) =>
        governmentUnitsForPlace(p.sourceGeoid ?? p.key).some(
          (u) => u.unitType === "municipality",
        ),
      )
      .sort((a, b) => a.key.localeCompare(b.key));
    if (!places.length) continue;
    const key = pick(places, `place:${attempt}`).key;
    const core = createLifeCore(
      withHousing(
        buildPopulation({
          seed,
          placeKey: key,
          startedAt: START,
          minimumPeople: 200,
        }),
      ),
      { data: worldCoreData(), modules: [HOUSING_MODULE] },
    );
    openLaws(core);
    openBudgets(core);
    openLawEffects(core);
    repealStartingAnswers(core);
    const api = coreAPI(core);
    if (!lawChain(api).levels.some((l) => l.level === "city")) continue;
    if (!governments(api).some((g) => g.level === "city")) continue;
    advanceCore(core, after(api.state.date, 1));
    const town = lawChain(api).townPlaceId;
    if (!api.moduleState(HOUSING_MODULE_ID).table("stock").get(`stock:${town}`))
      continue;
    return { core, api, town, where: `seed ${seed}, ${state} place ${key}` };
  }
  throw new Error(`no incorporated town with homes (seed ${seed})`);
}

describe("law reach, group A housing laws run through the housing engine", () => {
  const { core, api, town, where } = openTown();
  const enact = (series: string, value: number) => {
    const level = lawChain(api).levels.find((l) => l.level === "city")!;
    enactLaw(api, {
      jurisdiction: level.jurisdiction,
      level: "city",
      series,
      value,
      effectiveDate: after(api.state.date, 1),
      measureId: `test:${series}:${value}:${api.state.date}`,
      citation: `Test measure for ${series}`,
    });
    advanceCore(core, after(api.state.date, 2));
  };
  const zoning = () =>
    (
      api
        .moduleState(HOUSING_MODULE_ID)
        .table("stock")
        .get(`stock:${town}`) as { zoning: { multifamilyLandShare: number } }
    ).zoning;
  const counsel = () =>
    api.moduleState(HOUSING_MODULE_ID).table("counsel").get(town) as
      { inForce?: boolean; fundedById?: string } | undefined;

  it("allowing multifamily homes opens the town's residential land to apartments; repeal restores it", () => {
    expect(zoning().multifamilyLandShare, where).toBe(
      openingZoning().multifamilyLandShare,
    );
    enact(MULTIFAMILY_KEY, 1);
    expect(zoning().multifamilyLandShare, where).toBe(
      reachParameter("multifamilyAllowedLandShare"),
    );
    enact(MULTIFAMILY_KEY, 0);
    expect(zoning().multifamilyLandShare, where).toBe(
      openingZoning().multifamilyLandShare,
    );
  });

  it("a right to counsel in eviction is paid by the city that passed it; repeal ends it", () => {
    const city = governments(api).find((g) => g.level === "city")!;
    enact(COUNSEL_KEY, 1);
    expect(counsel()?.inForce, where).toBe(true);
    expect(counsel()?.fundedById, where).toBe(city.organizationId);
    enact(COUNSEL_KEY, 0);
    expect(counsel()?.inForce, where).toBe(false);
  });
});
