import type { EntityId } from "../core2/kernel/brands";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { followersOf, outletsHere } from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import { followChoices, followOutlet } from "./archive-words";
import { buildBenchWorld, OPENING_WARMUP_DAYS } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

describe("News follow control (P46)", () => {
  it("a household follows a paper and station from day one, and a chosen follow stands over the audiences", () => {
    const place = drawPlace(`${seed}:follow`, "news-follow");
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
      warmUpDays: OPENING_WARMUP_DAYS,
    });
    const { core } = world;
    const api = coreAPI(core);
    const local = outletsHere(api).filter((o) => o.tier === "local");
    // The played person, an adult on the start date, follows a paper on day one
    // (P46: a player who turned 18 inside the warm-up once followed none).
    const adult = core.people.get(world.playerId as EntityId)!;
    const where = `${place.name} (${place.key}), seed ${seed}`;
    expect(
      followChoices(core, adult.id).some((c) => c.follows),
      `${where}: the player follows no outlet on day one`,
    ).toBe(true);
    // The person drops a paper they follow, then follows it again.
    const outlet = local.find((o) =>
      followersOf(api, o.id).includes(adult!.id),
    )!;
    expect(followOutlet(core, adult!.id, outlet.organizationId, false)).toBe(
      true,
    );
    expect(followersOf(api, outlet.id)).not.toContain(adult!.id);
    expect(
      followChoices(core, adult!.id).find((c) => c.id === outlet.organizationId)
        ?.follows,
    ).toBe(false);
    followOutlet(core, adult!.id, outlet.organizationId, true);
    expect(followersOf(api, outlet.id)).toContain(adult!.id);
  }, 120_000);
});
