import { describe, expect, it } from "vitest";
import inventory from "../../../docs/codex/missing-law-capabilities.json";
import { createNewGameWorld } from "../../presentation/new-game";
import { sampledProofLocalityForState } from "../../presentation/new-game-geography";
import { lifePlaceStateIdentities } from "../life-places";
import { deserializeWorld, serializeWorld } from "../serialization";
import { US_FEDERAL_POSITIONS_PACK } from "../policy-pack-us-federal-positions";
import { US_POLICY_POSITIONS_PACK } from "../policy-pack-us-policy-positions";
import { SERVICE_DELIVERED_LAW_ROWS } from "./service-delivered-data";
import { resolveLawServiceConsequence } from "./service-delivered";

describe("L1 sixteen service-law data rows", () => {
  it("matches the exact assigned inventory and existing catalog questions", () => {
    const assigned = inventory.ranking.find(
      (entry) => entry.capability === "kind:service-delivered",
    )!;
    expect(assigned.dependentLawCount).toBe(16);
    expect(Object.keys(SERVICE_DELIVERED_LAW_ROWS).sort()).toEqual(
      [...assigned.lawKeys].sort(),
    );
    const catalogKeys = new Set(
      [US_POLICY_POSITIONS_PACK, US_FEDERAL_POSITIONS_PACK].flatMap((pack) =>
        (pack.propositions ?? []).map((row) => `${pack.pack}:${row.key}`),
      ),
    );
    for (const key of assigned.lawKeys)
      expect(catalogKeys.has(key), key).toBe(true);
  });

  it("leaves absent recorded delivery unsupported in all 56 places, including Save/Continue", () => {
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    for (const place of places) {
      const seed = `l1-service-missing-delivery:${place.usps}`;
      const game = createNewGameWorld({
        startKind: "custom",
        placeKey: sampledProofLocalityForState(place.jurisdictionKey).key,
        startAge: 34,
        depth: "summarize-earlier-life",
        startingLife: "ordinary-life",
        household: "shares-a-home",
        seed,
        givenName: null,
        familyName: null,
      });
      const before = serializeWorld(game.world);
      const continued = deserializeWorld(before);
      for (const world of [game.world, continued]) {
        for (const [questionKey, rows] of Object.entries(
          SERVICE_DELIVERED_LAW_ROWS,
        )) {
          const context = {
            activity: "service" as const,
            activityId: game.playerPersonId,
            subjectIds: [game.playerPersonId],
            questionKey,
            onDate: world.currentDate,
          };
          // A real saved person is not a completed service activity. Missing
          // delivery is intentionally unsupported; no participant is invented.
          for (const row of rows) {
            expect(
              resolveLawServiceConsequence(world, row, context),
              `${place.name}/${seed}/${questionKey}`,
            ).toEqual([]);
            expect(resolveLawServiceConsequence(world, row, context)).toEqual(
              [],
            );
          }
        }
        expect(serializeWorld(world)).toBe(before);
      }
    }
  }, 120_000);
});
