// @vitest-environment node
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { storyPicture } from "./news-picture";
import { orgPlace } from "./scene";

// A story about a business carries the picture of that business
// (play-nov8-news-lead-has-no-picture-of-its-story): every record of a played
// month that names a business by organizationId is pictured by that
// business's own place, the one its scenes are drawn in, and names it as the
// record the picture was chosen from. A law of the nation is pictured by the
// Capitol.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
setBookkeeping(false);
const place = drawPlace(`${seed}:0`, "news-picture");
const where = `${place.name} (${place.key}), seed ${seed}:0`;
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
advanceCore(world.core, addDays(makeIsoDate(world.core.date), 28));

describe(`a story's picture is read from its record (${where})`, () => {
  it("pictures a business story by the business", () => {
    const core = world.core;
    const named = [...core.durableLog.values()].filter((row) => {
      const id = row.facts?.organizationId;
      return id && orgPlace(core, id);
    });
    console.log(`${where}: ${named.length} records name a business`);
    for (const row of named.slice(0, 50)) {
      const id = row.facts!.organizationId!;
      const picture = storyPicture(core, row.facts!, [row.id]);
      expect(picture?.recordId, row.id).toBe(id);
      expect(picture?.place, row.id).toBe(orgPlace(core, id));
    }
  });

  it("pictures a law of the nation by the Capitol", () => {
    const picture = storyPicture(world.core, {
      lawId: "law:US:federal:estate-tax:general:2026-01-01",
    });
    expect(picture?.place).toBe("us-capitol-exterior");
  });
});
