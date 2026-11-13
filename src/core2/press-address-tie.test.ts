import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { PRESS_MODULE_ID } from "./modules/press";
import { tieRule, type PrintedStory } from "./press-desk";
import type { WireItem } from "./press-topics";

// A national desk that weighs two items equally never picks one by its id
// alone: the one more people saw happen leads, then the earlier. On main the
// President's inaugural address tied a cabinet nomination (one high official
// each) and lost on the alphabet, so in these two places no national outlet
// printed it (src/director/opening-story.test.ts, red on Nov 11).
const fresh = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const cases = [
  { seed: fresh, label: "drawn" },
  { seed: "da5c1844fcee4270", label: "named case: Arrowhead Springs" },
  { seed: "12aef90a529b9e19", label: "named case: Carnuel" },
];

describe("the President's address on the national desks", () => {
  for (const { seed, label } of cases)
    it(`leads a tie by its witnesses, then its date, and is printed (${label})`, () => {
      const place = drawPlace(seed, "opening-story");
      const here = `${place.name} (${place.key}), seed ${seed}`;
      const world = buildBenchWorld(place.seed, "2025-01-20", {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const story = world.director.ledger.opening!;
      const press = api.moduleState(PRESS_MODULE_ID);
      const address = press.table("wire").get(story.id) as unknown as WireItem;
      // Read from the record: the household that watched it with the player.
      const watched = story.home.memberIds.length;
      expect(address?.witnessCount, here).toBe(watched);
      const at = new Date(`${core.date}T00:00:00Z`);
      const play = (days: number) => {
        for (let day = 0; day < days; day += 1) {
          at.setUTCDate(at.getUTCDate() + 1);
          advanceCore(core, at.toISOString().slice(0, 10));
        }
      };
      // The day before the first desk week, while the week's wire is kept.
      play(6);
      // Each item the address was weighed against that week, and the rule
      // that would order the two on an equal score.
      const rivals = (
        press.table("wire").rows() as unknown as WireItem[]
      ).filter(
        (item) => item.id !== address.id && item.kind === "cabinet-nominated",
      );
      expect(
        rivals.length,
        `${here}: no cabinet nomination on the wire`,
      ).toBeGreaterThan(0);
      const decided = rivals.map((item) => {
        const tie = tieRule(address, item);
        return { item, ...tie };
      });
      console.log(
        `${here}: the address (${watched} witnesses) against ${rivals.length} national items; ` +
          decided.map((row) => `${row.item.kind} by ${row.rule}`).join(", "),
      );
      // A cabinet nomination is the item it tied on main.
      for (const row of decided)
        expect(row.order, `${here}: ${row.item.id} (${row.rule})`).toBeLessThan(
          0,
        );
      play(15);
      const national = (
        press.table("stories").rows() as unknown as PrintedStory[]
      ).filter(
        (row) => row.wireId === story.id && row.outletId.endsWith(":national"),
      );
      expect(national.length, here).toBeGreaterThan(0);
    }, 600_000);
});
