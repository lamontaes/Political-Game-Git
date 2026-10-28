import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { CoreState } from "../core2/types";
import manifest from "../../art/backdrops/manifest.json" with { type: "json" };
import { buildBenchWorld } from "./world";
import { backdropFile, homeOf, backdropFor, roomCondition } from "./scene";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`room-condition:${Date.now()}`).digest("hex");

const conditioned = manifest.backdrops.filter((row) =>
  row.tags.some((tag) => tag.startsWith("condition:")),
);

describe("a home's rooms are drawn in the household's condition", () => {
  it("paints every condition over its own room's midday painting, at its size", () => {
    expect(conditioned.length).toBeGreaterThan(0);
    for (const row of conditioned) {
      const parent = manifest.backdrops.find(
        (r) => r.place === row.place && r.variant === "midday",
      )!;
      expect([row.width, row.height]).toEqual([parent.width, parent.height]);
    }
  });

  it("keeps a room's other light: by night a room painted at night is shown at night", () => {
    for (const row of conditioned) {
      const night = backdropFile(row.place, 0, [row.variant]);
      const painted = manifest.backdrops.some(
        (r) => r.place === row.place && r.variant === "night",
      );
      expect(night.variant).toBe(painted ? "night" : row.variant);
      expect(backdropFile(row.place, 12 * 60, [row.variant]).file).toBe(
        row.file,
      );
      // No condition asked: the painting as it was.
      expect(backdropFile(row.place, 12 * 60).variant).toBe("midday");
    }
  });

  it(
    "reads each household's rent or value, tenure and size, and the home scene shows it",
    { timeout: 600_000 },
    () => {
      setBookkeeping(false);
      const place = drawPlace(runSeed, "room-condition");
      console.log(
        `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`,
      );
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core as CoreState;
      // The housing records open on the world's first day.
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const seen = new Map<string, number>();
      let shown = 0;
      for (const household of core.households.values()) {
        const id = household.memberIds[0];
        if (!id || !core.people.has(id)) continue;
        const condition = roomCondition(core, id);
        seen.set(
          condition[0] ?? "as painted",
          (seen.get(condition[0] ?? "as painted") ?? 0) + 1,
        );
        // The household's living room at midday, in its condition where painted.
        const room = homeOf(core, id, 12 * 60);
        const drawn = backdropFor(core, room, 12 * 60, id);
        const painted = condition.find((c) =>
          manifest.backdrops.some((r) => r.place === room && r.variant === c),
        );
        expect(drawn.variant).toBe(painted ?? "midday");
        if (painted) shown++;
      }
      console.log(
        Object.fromEntries(seen),
        `${shown} homes drawn in a condition`,
      );
      // A town has homes of every condition.
      expect(seen.get("lived-in") ?? 0).toBeGreaterThan(0);
      expect(seen.get("rundown") ?? 0).toBeGreaterThan(0);
      expect(seen.get("as painted") ?? 0).toBeGreaterThan(0);
      expect(shown).toBeGreaterThan(0);
    },
  );
});
