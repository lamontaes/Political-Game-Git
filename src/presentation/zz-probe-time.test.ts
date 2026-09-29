import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { advanceWorld } from "../simulation/world";

it("probe", () => {
  const t0 = performance.now();
  const prepared = prepareOpeningLife({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "home-purchase-prices-b",
    placeKey: "3502000",
    startAge: 35,
    questionnaire: "skipped" as const,
  });
  const t1 = performance.now();
  const game = generateOpeningLife(prepared).game!;
  const t2 = performance.now();
  advanceWorld(game.world, 400, createCampaignElectionTransitionRegistry());
  const t3 = performance.now();
  writeFileSync("/tmp/claude-0/-home-user-Political-Game-Git/c58750a1-3013-55b5-b68b-c1a571ec4486/scratchpad/probe/time.txt", `prepare ${t1 - t0}\ngenerate ${t2 - t1}\nadvance400 ${t3 - t2}\n`);
}, 300_000);
