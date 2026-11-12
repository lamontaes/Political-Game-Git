import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { lawChain, LAWS_MODULE_ID } from "./modules/laws";
import { PRESS_MODULE_ID } from "./modules/press";
import type { PrintedStory } from "./press-desk";

// Another state's law binds no one in town, so it involves none of an
// outlet's followers. On main it counted every follower: Hawaii's laws
// outranked the President's inaugural address on every national desk in
// Arrowhead Springs, Wyoming (seed da5c1844fcee4270), whose own law chain
// holds no Hawaii jurisdiction.
const fresh = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const cases = [
  { seed: fresh, label: "drawn" },
  { seed: "da5c1844fcee4270", label: "named case (the Nov 11 red)" },
];

describe("a law taking effect in another place", () => {
  for (const { seed, label } of cases)
    it(`involves no follower of the town's outlets (${label})`, () => {
      const place = drawPlace(seed, "opening-story");
      const here = `${place.name} (${place.key}), seed ${seed}`;
      const world = buildBenchWorld(place.seed, "2025-01-20", {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const chain = new Set(lawChain(api).levels.map((l) => l.jurisdiction));
      const at = new Date(`${core.date}T00:00:00Z`);
      for (let day = 0; day < 42; day += 1) {
        at.setUTCDate(at.getUTCDate() + 1);
        advanceCore(core, at.toISOString().slice(0, 10));
      }
      const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
      const printed = (
        api
          .moduleState(PRESS_MODULE_ID)
          .table("stories")
          .rows() as unknown as PrintedStory[]
      ).filter((story) => story.kind === "law-took-effect" && story.pick);
      const lawOf = (story: PrintedStory) => {
        const lawId = (
          api.moduleState(PRESS_MODULE_ID).table("wire").get(story.wireId) as
            { facts?: { lawId?: string } } | undefined
        )?.facts?.lawId;
        return lawId
          ? (laws.get(lawId) as unknown as
              { jurisdiction?: string } | undefined)
          : undefined;
      };
      const outside = printed.filter((story) => {
        const jurisdiction = lawOf(story)?.jurisdiction;
        return jurisdiction !== undefined && !chain.has(jurisdiction);
      });
      console.log(
        `${here}: ${printed.length} law stories in six weeks, ${outside.length} of another place's law`,
      );
      for (const story of outside)
        expect(story.pick!.people, `${here}: ${story.wireId}`).toBe(0);
    }, 600_000);
});
