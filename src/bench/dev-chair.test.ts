/**
 * Have the chair hear it: a bill whose committee chair would leave it unheard is carried through the
 * chair's own hearing decision (a decision cast for the chair, read by the committee in place of the
 * chair's position and temperament), in every lawmaking body of a drawn place; and where the chair still
 * holds it with no discharge route, the result names why. A random place and seed each run.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { BenchPlayer } from "./player";
import { DevMode } from "./dev-mode";

const seed = process.env.DEV_MODE_SEED ?? randomBytes(8).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const dev = new DevMode(
  world.core,
  world.director,
  new BenchPlayer(world.core, world.director),
  world.placeId,
);
const where = `${world.place.displayName} (seed ${seed})`;

describe(`chair hears it: ${where}`, () => {
  it(
    "a chair who held a bill unheard hears it when cast to, and the held result names why",
    { timeout: 300_000 },
    () => {
      let held = 0;
      let carried = 0;
      for (const body of dev.lawmakingBodies()) {
        if (!body.members.length) continue;
        for (let n = 0; n < 12 && carried === 0; n += 1) {
          const make = () =>
            dev.introduce({
              bodyOfficeId: body.id,
              sponsorId: body.members[0]!.key,
              series: "minimum-wage",
              value: 30 + n / 10,
            }).bill;
          const first = make();
          if (first.status === "blocked") break;
          const plain = dev.decideAt(first.id, 40, { sign: true });
          const left = plain.committees.find((c) => !c.heard);
          if (!left) continue;
          held += 1;
          expect(left.why, `${where}: ${body.id}`).toMatch(
            /unheard-no-route|petition-short/,
          );
          const again = make();
          const hears = dev.decideAt(again.id, 40, {
            sign: true,
            chairHears: true,
          });
          const row = hears.committees.find((c) => c.chamber === left.chamber)!;
          expect(row.heard, `${where}: ${body.id}`).toBe(true);
          expect(row.chairPicked, `${where}: ${body.id}`).toBe(true);
          carried += 1;
          process.stderr.write(
            `${where}: ${body.id} chair ${left.why} (position ${left.chairPosition}); cast to hear it: ${row.yes}-${row.no} ${row.reported ? "reported" : "not reported: " + row.why}; bill ${hears.bill.status}\n`,
          );
        }
        if (carried) break;
      }
      expect(held, `${where}: a chair held a bill unheard`).toBeGreaterThan(0);
    },
  );
});
