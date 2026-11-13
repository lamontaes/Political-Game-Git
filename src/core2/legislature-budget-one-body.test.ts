/**
 * A city budget voted where the place's council is modeled as its state's
 * legislature (pool item gov-city-budget-unvoted-where-council-is-state-body):
 * the executive over the body that votes the budget proposes its changes,
 * wherever that body sits. A place whose city has no mayor office of its own
 * level is found by looking at each jurisdiction's first recorded locality
 * (no place is named); every one found must carry the mayor's proposed
 * changes, and a place with a city-level mayor is unchanged.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { governments } from "./modules/budgets";
import {
  executiveBudgetChanges,
  executiveOf,
  memberKey,
} from "./modules/legislature";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { placeLocalities, placeStateKeys } from "./places";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

interface OfficeRow {
  id: string;
  kind: string;
  level: string;
  jurisdiction: string;
}

it(`the executive over the body that votes a city's budget proposes its changes (seed ${seed})`, () => {
  const passedOver: string[] = [];
  let found = 0;
  let ordinary = 0;
  for (const stateKey of [...placeStateKeys()].sort()) {
    const locality = [...placeLocalities(stateKey)].sort((a, b) =>
      a.key.localeCompare(b.key),
    )[0]!;
    // A draw that lands on this locality gives its name and seed.
    const place = drawPlace(
      seed,
      `one-body:${stateKey}`,
      (key) => key === locality.key,
    );
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const city = governments(api).find((g) => g.level === "city");
    if (!city) {
      passedOver.push(`${where}: no city government`);
      continue;
    }
    const offices = api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .rows() as unknown as OfficeRow[];
    const own = offices.some((o) => o.kind === "mayor" && o.level === "city");
    const fy = Number(core.date.slice(0, 4));
    if (own) {
      ordinary += 1;
      continue;
    }
    // No mayor office at the city's own level: the case is a city whose
    // mayor is modeled as a state-level office (its council is the state's body).
    const stateGov = governments(api).find((g) => g.level === "state");
    const mayor = offices.find(
      (o) =>
        o.kind === "mayor" &&
        o.level === "state" &&
        o.jurisdiction === stateGov?.id,
    );
    if (!mayor) {
      passedOver.push(`${where}: no city-level mayor and no state-level mayor`);
      continue;
    }
    found += 1;
    const proposed = executiveBudgetChanges(api, city.id, fy);
    expect(proposed, `${where}: the city budget's proposer`).not.toBeNull();
    expect(
      Object.keys(proposed!.changes).length,
      `${where}: lines the executive changes`,
    ).toBeGreaterThan(0);
    const over = executiveOf(api, mayor.id);
    expect(over.term, `${where}: the mayor is seated`).toBeDefined();
    expect(proposed!.setBy, `${where}: set by the mayor's term`).toBe(
      memberKey(over.term!),
    );
  }
  expect(
    found,
    `no jurisdiction had a city without a city-level mayor; ${ordinary} ordinary, passed over: ${passedOver.join("; ")} (seed ${seed})`,
  ).toBeGreaterThan(0);
}, 1_800_000);
