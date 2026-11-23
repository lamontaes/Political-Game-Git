import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import {
  followersOf,
  openHouseholdOutlets,
  outletsHere,
} from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import { followChoices, followOutlet } from "./archive-words";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

describe("News follow control (P46)", () => {
  it("a household follows a paper and station from day one, and a chosen follow stands over the audiences", () => {
    const place = drawPlace(`${seed}:follow`, "news-follow");
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const local = outletsHere(api).filter((o) => o.tier === "local");
    const home = [...core.households.values()].find((h) =>
      h.memberIds.some((id) => core.people.get(id)?.alive),
    )!;
    openHouseholdOutlets(api, home.id);
    const adult = home.memberIds
      .map((id) => core.people.get(id)!)
      .find((p) => local.some((o) => followersOf(api, o.id).includes(p.id)));
    expect(adult, `${place.name} (${place.key}), seed ${seed}`).toBeDefined();
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
