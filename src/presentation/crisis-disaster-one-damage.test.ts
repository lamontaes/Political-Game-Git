import { describe, expect, it } from "vitest";

import {
  activeDwellingOccupanciesAt,
  crisisRecords,
  declareHazardEpisode,
  disasterAssessment,
  homeStateUsps,
} from "../simulation";
import type {
  DisasterDamageRecord,
  EntityId,
  HazardFamily,
  HazardMagnitude,
  World,
} from "../simulation";
import { observerPlace, observerSetup } from "./observer-world";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";

/**
 * A132: one damage result per home. When a hazard strikes, a household's
 * damage is the damage of the dwelling it lives in, so the two records can
 * never disagree. The place is drawn from all 56 by the seed.
 */
const SEED = "a132-one-damage-1";
const place = observerPlace(SEED);

function damageOf(
  world: World,
  episodeId: EntityId,
): ReadonlyMap<EntityId, DisasterDamageRecord["level"]> {
  return new Map(
    crisisRecords(world)
      .filter(
        (record): record is DisasterDamageRecord =>
          record.kind === "disaster-damage" &&
          (record as DisasterDamageRecord).episodeId === episodeId,
      )
      .map((record) => [record.targetId, record.level]),
  );
}

describe(`one damage result per home (${place.displayName}, ${place.key}, seed ${SEED})`, () => {
  it("gives every household the damage of the dwelling it lives in", () => {
    const game = generateOpeningLife(
      prepareOpeningLife(observerSetup(SEED, place.key)),
    ).game!;
    const opening = game.world;
    const home = opening.people[game.playerPersonId]!.homeJurisdictionId;
    const state = homeStateUsps(opening, game.playerPersonId)!;
    const dwellingJurisdiction = new Map(
      opening.history.dwellings.map((row) => [row.id, row.jurisdictionId]),
    );
    const livesIn = new Map(
      activeDwellingOccupanciesAt(opening).flatMap((row) =>
        row.occupant.kind === "household"
          ? [[row.occupant.householdId, row.dwellingId] as const]
          : [],
      ),
    );
    // Strike the dwellings' own town, so homes are exposed.
    const struck = [
      ...new Set(
        [...livesIn.values()].map((id) => dwellingJurisdiction.get(id)!),
      ),
    ];
    expect(
      struck.length,
      `${place.key}: no household lives in a dwelling`,
    ).toBeGreaterThan(0);
    const jurisdictionIds = struck.includes(home) ? [home] : [struck[0]!];

    let pairs = 0;
    let hit = 0;
    const cases: [HazardFamily, HazardMagnitude][] = [
      ["flood", "major"],
      ["flood", "catastrophic"],
      ["severe-storm", "major"],
      ["severe-storm", "catastrophic"],
    ];
    for (const [family, magnitude] of cases) {
      const world = declareHazardEpisode(opening, {
        stableKey: `a132:${family}:${magnitude}`,
        family,
        magnitude,
        stateUsps: state,
        jurisdictionIds,
        durationDays: 4,
        basis: "Declared test episode; not a local hazard prediction.",
        sourceReference: null,
      });
      const episodeId = crisisRecords(world).find(
        (record) => record.kind === "hazard-episode",
      )!.id;
      expect(
        disasterAssessment(world, episodeId)!.exposed.household,
      ).toBeGreaterThan(0);
      const damage = damageOf(world, episodeId);
      for (const [householdId, dwellingId] of livesIn) {
        if (!jurisdictionIds.includes(dwellingJurisdiction.get(dwellingId)!))
          continue;
        pairs += 1;
        // The same level, or both untouched.
        expect(
          damage.get(householdId) ?? null,
          `${family} ${magnitude}: household ${householdId} in ${dwellingId}`,
        ).toBe(damage.get(dwellingId) ?? null);
        if (damage.has(dwellingId)) hit += 1;
      }
    }
    expect(pairs).toBeGreaterThan(0);
    // At least one home was struck, so the match is not only "both spared".
    expect(hit).toBeGreaterThan(0);
  }, 60_000);
});
