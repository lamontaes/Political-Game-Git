import { beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { passOrdinaryDays } from "../../presentation/ordinary-life";
import { declareHazardEpisode } from "../crisis/disaster";
import { crisisEnvelopesBetween } from "../crisis/notices";
import { homeStateUsps } from "../nationwide-world/state-executives";
import type { EntityId, World } from "../types";
import { macroScopeForJurisdiction } from "./readers";

const SLOW = 900_000;
let opening: World;
let home: EntityId;
let state: string;

beforeAll(() => {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "change-crisis-origins",
      placeKey: "lexington-fayette",
      startAge: 34,
      questionnaire: "skipped" as const,
    }),
  ).game!;
  opening = game.world;
  home = opening.people[game.playerPersonId]!.homeJurisdictionId;
  state = homeStateUsps(opening, game.playerPersonId)!;
}, SLOW);

function flood(world: World): World {
  return declareHazardEpisode(world, {
    stableKey: "change-macro-test-flood",
    family: "flood",
    magnitude: "major",
    stateUsps: state,
    jurisdictionIds: [home],
    durationDays: 4,
    basis: "Declared test episode; not a local hazard prediction.",
    sourceReference: null,
  });
}

describe("CRISIS disaster envelopes as macro shocks", { timeout: SLOW }, () => {
  it("acts on the affected place's own layer, never the national record", () => {
    expect(opening.macroEconomy).toBeDefined();
    const plain = passOrdinaryDays(opening, 70);
    const struck = passOrdinaryDays(flood(opening), 70);

    const shocks = struck.macroEconomy!.shocks.filter(
      (shock) => shock.kind === "disaster-reconstruction",
    );
    expect(shocks).toHaveLength(1);
    const shock = shocks[0]!;
    expect(shock.scope).toBe(macroScopeForJurisdiction(home));
    expect(shock.geographyIds).toEqual([home]);
    const damage = crisisEnvelopesBetween(
      struck,
      opening.currentDate,
      struck.currentDate,
    ).find((envelope) => envelope.kind === "disaster-damage")!;
    expect(shock.originEventId).toBe(damage.originEventId);
    expect(shock.intensity).toBeCloseTo(damage.payload.intensity as number, 6);

    const national = (w: World) =>
      JSON.stringify(
        w.macroEconomy!.months.filter((month) => month.scope === "national"),
      );
    expect(national(struck)).toBe(national(plain));

    const local = struck.macroEconomy!.months.filter(
      (month) => month.scope === shock.scope,
    );
    expect(local.length).toBeGreaterThan(0);
    const nationalFirst = struck.macroEconomy!.months.find(
      (month) =>
        month.scope === "national" &&
        month.periodStart === local[0]!.periodStart,
    )!;
    expect(local[0]!.growthPct).toBeLessThan(nationalFirst.growthPct);
    expect(local[0]!.unemploymentPct).toBeGreaterThan(
      nationalFirst.unemploymentPct,
    );
    expect(local[0]!.exposure?.basis).toBe("national-average-no-local-source");
    expect(local[0]!.housing).toBeNull();
    expect(local[0]!.shockKeys).toEqual([shock.key]);
    // Plain worlds materialize no local layer at all.
    expect(
      plain.macroEconomy!.months.some((month) => month.scope !== "national"),
    ).toBe(false);
  });

  it("ends the disruption when CRISIS records the follow-up, then recovers gradually", () => {
    const later = passOrdinaryDays(flood(opening), 400);
    const store = later.macroEconomy!;
    const shock = store.shocks.find(
      (candidate) => candidate.kind === "disaster-reconstruction",
    )!;
    const followUp = crisisEnvelopesBetween(
      later,
      opening.currentDate,
      later.currentDate,
    ).find(
      (envelope) =>
        envelope.kind === "repair-progress" &&
        envelope.payload.status === "ended",
    );
    // CRISIS closes a major flood with a follow-up well inside 400 days.
    expect(followUp).toBeDefined();
    if (!followUp) return;
    const end = store.shockEnds.find((e) => e.shockKey === shock.key)!;
    expect(end.endedAt).toBe(followUp.effectiveMoment);
    const local = store.months.filter((month) => month.scope === shock.scope);
    const after = local.filter((month) => month.periodStart > end.endedAt);
    if (after.length >= 2) {
      expect(Math.abs(after[1]!.impulses.growthPp)).toBeLessThanOrEqual(
        Math.abs(after[0]!.impulses.growthPp),
      );
    }
    expect(
      store.shockEnds.filter((e) => e.shockKey === shock.key),
    ).toHaveLength(1);
  });
});
