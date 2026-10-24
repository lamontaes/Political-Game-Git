/**
 * Applying for work reads the household's runway (pool item
 * world-apply-and-buy-reasons-vary): two jobless people in a played world do
 * not score the same need to apply; the one whose money covers fewer days
 * needs work more. A place is drawn from all 56 on a seed nobody chose
 * (APPLY_NEED_SEED pins one).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { unemployedNeed } from "./modules/jobs";
import { coreAPI } from "./state";

const seed = process.env.APPLY_NEED_SEED ?? randomBytes(8).toString("hex");

it("jobless people in a played world score different needs to apply, by their runway", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 12; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "apply-need");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const rows = [...core.people.values()]
      .filter((person) => person.alive && !person.jobId)
      .map((person) => {
        const members = core.households.get(person.householdId)?.memberIds ?? [
          person.id,
        ];
        let liquid = 0,
          cost = 0;
        for (const id of members) {
          const m = core.people.get(id);
          if (!m?.alive) continue;
          liquid += m.liquidMinor;
          cost += m.livingCostDailyMinor;
        }
        return {
          id: person.id,
          days: cost > 0 ? liquid / cost : Number.POSITIVE_INFINITY,
          need: unemployedNeed(api, person.id),
        };
      })
      .filter((r) => Number.isFinite(r.days))
      .sort((a, b) => a.days - b.days);
    const low = rows[0];
    const high = rows.at(-1);
    if (!low || !high || high.days - low.days < 30) {
      tried.push(`${where}: ${rows.length} jobless with a finite runway`);
      continue;
    }
    expect(
      low.need,
      `${where}: ${low.id} (${low.days.toFixed(0)} days) vs ${high.id} (${high.days.toFixed(0)} days)`,
    ).toBeGreaterThan(high.need);
    return;
  }
  throw new Error(
    `no drawn place had a spread of runways: ${tried.join("; ")}`,
  );
}, 1_800_000);
