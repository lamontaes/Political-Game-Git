import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { money } from "../../simulation/resources";
import { addDays } from "../../simulation/dates";
import {
  recordWorldMetricState,
  worldMetricDefinitionByStableKey,
} from "../../simulation/world-metrics";
import { deriveFiscalBalanceFromStates as native } from "../../simulation/economy";
import {
  deriveFiscalBalanceFromStates,
  type FiscalMetricFacts,
} from "./metric-fiscal";
import type { World, HistoricalCutoff, EntityId } from "../../simulation/types";
function facts(world: World): FiscalMetricFacts {
  return {
    onDate: world.currentDate,
    nextSequence: world.history.nextSequence,
    states: world.history.metricStates,
    catalog: world.metricCatalog,
  };
}
function outcome(run: () => unknown) {
  try {
    return { value: run() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
describe("private metric availability through complete native public fiscal parent", () => {
  for (const usps of Object.keys(STATES))
    it(usps, () => {
      const fixture = smallWorld({
        place: "US-" + usps,
        date: "2026-01-05",
        seed: "rules2:economy:metric-fiscal:" + usps,
      });
      let world = fixture.world;
      const scope = {
        jurisdictionId: fixture.jurisdictionId,
        segmentKey: null,
      };
      const referencePeriod = {
        kind: "interval" as const,
        startsAt: world.startedAt,
        endsAt: world.currentDate,
      };
      const ids: EntityId[] = [];
      for (const [key, minorUnits] of [
        ["government.revenue", 900000],
        ["government.outlays", 700000],
      ] as const) {
        world = recordWorldMetricState(world, {
          stableKey: "rules2:metric:" + key,
          metricId: worldMetricDefinitionByStableKey(world, key).id,
          scope,
          referencePeriod,
          value: {
            kind: "money",
            money: money(minorUnits, "USD"),
          },
          recordedAt: world.currentDate,
          provenance: {
            kind: "authored",
            note: "Explicit fiscal metric saved-record control, not ordinary revenue.",
          },
          supersedesStateId: null,
        });
        ids.push(world.history.metricStates.at(-1)!.id);
      }
      const compare = (
        revenueStateId: EntityId,
        outlaysStateId: EntityId,
        cutoff: HistoricalCutoff,
      ) => {
        const input = { revenueStateId, outlaysStateId, cutoff };
        expect(
          outcome(() => deriveFiscalBalanceFromStates(facts(world), input)),
        ).toEqual(outcome(() => native(world, input)));
      };
      for (const date of [
        addDays(world.currentDate, -1),
        world.currentDate,
        addDays(world.currentDate, 1),
      ])
        for (const seq of [
          -1,
          0,
          world.history.metricStates[0]!.sequence,
          world.history.metricStates[0]!.sequence + 1,
          world.history.nextSequence,
          world.history.nextSequence + 1,
          0.5,
        ])
          compare(ids[0]!, ids[1]!, {
            asOfDate: date,
            historySequenceExclusive: seq,
          });
      const cutoff = {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      };
      compare(ids[0]!, ids[1]!, cutoff);
      compare(ids[1]!, ids[0]!, cutoff);
      compare(ids[0]!, ids[0]!, cutoff);
      compare("missing" as EntityId, ids[1]!, cutoff);
      expect(
        deriveFiscalBalanceFromStates(facts(world), {
          revenueStateId: ids[0]!,
          outlaysStateId: ids[1]!,
          cutoff,
        }),
      ).toMatchObject({
        status: "available",
        balance: { minorUnits: 200000, currency: "USD" },
      });
    });
});
