/**
 * Travel lists the places tied to the player first, then the town's biggest
 * workplaces across every kind of work (owner, Nov 16: "it's just a bunch of
 * kitchens and markets"; his Desk answer: "Places tied to you first, then the
 * town's biggest workplaces across every kind of work"), from the town's
 * organization and job records. In played worlds in drawn places from all 56;
 * place and seed printed (TRAVEL_BIGGEST_SEED fixes the seed).
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { setBookkeeping } from "../core2/bookkeeping";
import { townPlaces } from "./places";
import { orgPlace, staffOf } from "./scene";
import { hasBackdrop } from "./backdrop-places";
import { drawPlace } from "../../scripts/core2-year/place";

const seed = process.env.TRAVEL_BIGGEST_SEED || randomBytes(8).toString("hex");
const DRAWS = 6;

describe(`Travel lists the town's biggest workplaces (seed ${seed})`, () => {
  it("lists tied places first, then the biggest workplace of each kind of work", () => {
    setBookkeeping(false);
    const checked: string[] = [];
    for (let at = 0; at < DRAWS; at += 1) {
      const place = drawPlace(at ? `${seed}:${at}` : seed, "travel-biggest");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const playerId = core.playerId!;
      const home = core.people.get(playerId)!.placeId;
      const rows = townPlaces(core, playerId);
      // Tied places before the town's biggest.
      const firstLarge = rows.findIndex((r) =>
        r.reasons.some((x) => x.kind === "large"),
      );
      if (firstLarge >= 0)
        expect(
          rows
            .slice(firstLarge)
            .every((r) => r.reasons.every((x) => x.kind === "large")),
          `${where}: a tied place is listed after a large workplace`,
        ).toBe(true);
      // Each kind of work with a pictured workplace in town is represented
      // by its biggest one, up to the list's size.
      const kinds = new Map<string, { id: string; staff: number }>();
      for (const org of core.organizations.values()) {
        if (org.placeId !== home) continue;
        const spot = orgPlace(core, org.id);
        if (!spot || !hasBackdrop(spot)) continue;
        const { full, counted } = staffOf(core, org.id);
        const staff = full.length + counted.length;
        const kind = org.classification ?? "";
        const best = kinds.get(kind);
        if (!best || staff > best.staff) kinds.set(kind, { id: org.id, staff });
      }
      const large = rows.filter((r) =>
        r.reasons.some((x) => x.kind === "large"),
      );
      const largeKinds = new Set(large.map((r) => r.kindOfWork));
      expect(
        largeKinds.size,
        `${where}: kinds of work among the large workplaces`,
      ).toBeGreaterThanOrEqual(Math.min(3, kinds.size));
      for (const r of large.slice(0, Math.min(kinds.size, large.length))) {
        const best = kinds.get(r.kindOfWork)!;
        expect(
          r.staff,
          `${where}: ${r.name} is its kind's biggest or next`,
        ).toBeLessThanOrEqual(best.staff);
      }
      checked.push(
        `${where}: ${rows.length} listed, ${large.length} large across ${largeKinds.size} kinds`,
      );
    }
    console.log(checked.join("\n"));
  });
});
