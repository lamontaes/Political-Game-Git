// @vitest-environment node
/** Law levels: the bill paper's menu makes the same check for a state body as the draft does. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { billCatalog } from "./bill-catalog";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { policyAuthority } from "./policy-authority";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const drawn = drawPlace(replay, "bill-catalog-state-authority");

it(`a state body's menu shows the power catalog's answer for each policy question, not always allowed: ${drawn.name} (${drawn.key}), replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(drawn.seed, gameStartDate(), {
      placeKey: drawn.key,
      twoLevel: true,
    });
    const api = coreAPI(world.core);
    let checked = 0;
    for (const menu of billCatalog(api, "state"))
      for (const topic of menu.topics)
        for (const policy of topic.policies)
          if (policy.kind === "policy-question" && policy.question) {
            const expected = policyAuthority(api, policy.question, "state");
            expect(policy.authority.allowed, policy.id).toBe(expected.allowed);
            expect(policy.authority.reason, policy.id).toBe(expected.reason);
            checked++;
          }
    expect(checked, "state-level policy questions on the menu").toBeGreaterThan(
      20,
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
