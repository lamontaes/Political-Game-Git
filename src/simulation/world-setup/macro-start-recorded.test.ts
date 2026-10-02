import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { stableHash } from "../ids";
import { lifePlaceStateIdentities } from "../life-places";
import { deserializeWorld, serializeWorld } from "../serialization";
import { advanceWorld } from "../world";
import { createFutureTransitionHandlerRegistry } from "../future-transitions";
import {
  createMacroMonthlyStepHandler,
  ensureMacroEconomyStarted,
  MACRO_MONTHLY_STEP_KEY,
  macroStartForHistory,
} from "../macro-economy/producer";
import {
  ensureWorldStartingConditions,
  macroStartingConditions,
  worldOpeningRecord,
} from "./conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "./types";

const seed = "overflow3:a115:macro-record:1";
const places = lifePlaceStateIdentities();
const place = places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!;

function fixture() {
  return smallWorld({ place: place.usps, seed, date: "2026-10-01", people: 3 });
}

describe("opening macro conditions use published observations", () => {
  it("uses the same dated national values and regime under different identity seeds", () => {
    expect(places).toHaveLength(56);
    const { world } = fixture();
    const first = ensureWorldStartingConditions(world, {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    });
    const second = ensureWorldStartingConditions({ ...world, seed: `${seed}:other` }, {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    });
    const start = macroStartingConditions(first)!;
    expect(start, `${place.usps}; seed ${seed}`).not.toBeNull();
    expect(start.initial.unemploymentPct).toBe(4.1);
    expect(start.initial.inflation12mPct).toBe(3.4);
    expect(macroStartingConditions(second)).toEqual(start);
    expect(worldOpeningRecord(first)!.regime).toBe(start.regime);
    expect(worldOpeningRecord(second)!.regime).toBe(start.regime);
  });

  it("starts actual monthly history from the saved condition and preserves it on Continue", () => {
    const { world } = fixture();
    const recorded = ensureWorldStartingConditions(world, {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    });
    const condition = macroStartingConditions(recorded)!;
    const started = ensureMacroEconomyStarted(recorded, macroStartForHistory(condition));
    expect(started.macroEconomy!.start.initial).toEqual(condition.initial);
    const completed = advanceWorld(started, 32, createFutureTransitionHandlerRegistry([
      [MACRO_MONTHLY_STEP_KEY, createMacroMonthlyStepHandler()],
    ]));
    expect(completed.macroEconomy!.months.some((month) => month.scope === "national")).toBe(true);
    const reopened = deserializeWorld(serializeWorld(completed));
    expect(macroStartingConditions(reopened)).toEqual(condition);
    expect(reopened.macroEconomy).toEqual(completed.macroEconomy);
    expect(ensureWorldStartingConditions(reopened, {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    })).toBe(reopened);
    expect(ensureMacroEconomyStarted(reopened, macroStartForHistory(condition))).toBe(reopened);
  });
});
