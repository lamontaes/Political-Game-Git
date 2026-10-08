import { expect, it } from "vitest";
import { drawRandomPlace } from "../../tests/support/random-place";
import { addDays } from "../simulation/dates";
import { legislativeRulePackForWorld } from "../simulation/legislative-procedure-world";
import { municipalRulePackById } from "../simulation/municipal-rule-registry";
import { townCouncilProfilePackById } from "../simulation/town-council-profile";
import type { LegislativeMeasureRecord, World } from "../simulation/types";
import {
  advanceObservedWorld,
  observerSetup,
  openObserverWorld,
} from "./observer-world";

type Level = "local" | "state" | "federal";

function governmentLevel(
  world: World,
  measure: LegislativeMeasureRecord,
): Level {
  const pack = legislativeRulePackForWorld(world, measure.rulePackId);
  if (!pack) throw new Error(`No rules for ${measure.rulePackId}`);
  const government = pack.institution?.government;
  if (government === "federal" || government === "local") return government;
  if (
    municipalRulePackById(measure.rulePackId) ||
    townCouncilProfilePackById(measure.rulePackId)
  )
    return "local";
  return "state";
}

it("a seeded world nobody plays introduces and enacts laws in both observed years", () => {
  const seed = "au4-07-sol-1258";
  const place = drawRandomPlace(seed);
  let world = openObserverWorld(observerSetup(seed, place.key)).world;
  expect(world.control.kind).toBe("observer");
  expect(world.history.legislativeMeasures ?? []).toHaveLength(0);
  for (let year = 0; year < 2; year += 1) {
    const from = world.currentDate;
    const through = addDays(from, 365);
    // The watcher presses Year; the canonical clock crosses each dated intake.
    world = advanceObservedWorld(world, 365);
    expect(world.currentDate).toBe(through);
    expect(world.control.kind).toBe("observer");
    const measures = world.history.legislativeMeasures ?? [];
    const byId = new Map(measures.map((measure) => [measure.id, measure]));
    for (const level of ["local", "state", "federal"] as const) {
      const introduced = measures.filter(
        (measure) =>
          measure.introducedAt >= from &&
          measure.introducedAt < through &&
          governmentLevel(world, measure) === level,
      );
      const enacted = (world.history.legislativeEnactments ?? []).filter(
        (enactment) => {
          const measure = byId.get(enactment.measureId);
          return (
            enactment.outcome === "enacted" &&
            enactment.resolvedAt >= from &&
            enactment.resolvedAt < through &&
            measure &&
            governmentLevel(world, measure) === level
          );
        },
      );
      const label = `${place.displayName}, seed ${seed}, ${from} through ${through}, ${level}`;
      expect(introduced.length, `${label}: introductions`).toBeGreaterThan(0);
      expect(enacted.length, `${label}: enactments`).toBeGreaterThan(0);
    }
  }
}, 3_600_000);
