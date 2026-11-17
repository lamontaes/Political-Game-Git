/**
 * The House discharge petition (rule XV, clause 2: 218 signatures): when a committee does not report a
 * bill, the members who sign are counted and, at the chamber's number, the bill goes to the floor. Bills
 * are introduced at the House through draftBill and every member signs through the legislature's own
 * signature, so wherever the committee did not report one, the petition is counted by the engine. A
 * world whose committee reports every bill in 60 tries (its chair hears them all) has no petition to
 * count: it is passed over and named, and the next world is drawn from the same seed. A random seed
 * each run, named so a failure can be replayed.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { BenchPlayer } from "./player";
import { DevMode } from "./dev-mode";

const seed = process.env.DEV_MODE_SEED ?? randomBytes(8).toString("hex");
const WORLDS = 4;

describe(`discharge petition (seed ${seed})`, () => {
  it(
    "a bill a House committee did not report is discharged at 218 signatures and reaches the floor",
    { timeout: 900_000 },
    () => {
      const passed: string[] = [];
      let rescued = 0;
      for (let draw = 0; draw < WORLDS && rescued === 0; draw += 1) {
        const worldSeed = draw ? `${seed}:${String(draw)}` : seed;
        const world = buildBenchWorld(worldSeed, gameStartDate(), {
          twoLevel: true,
        });
        const dev = new DevMode(
          world.core,
          world.director,
          new BenchPlayer(world.core, world.director),
          world.placeId,
        );
        const where = `${world.place.displayName} (seed ${worldSeed})`;
        const house = dev
          .lawmakingBodies()
          .find((b) => b.id === "federal:us-house");
        expect(house, where).toBeDefined();
        let tried = 0;
        for (; tried < 60 && rescued === 0; tried += 1) {
          const { bill } = dev.introduce({
            bodyOfficeId: house!.id,
            sponsorId: house!.members[0]!.key,
            series: "minimum-wage",
            value: 30 + tried,
          });
          if (bill.status === "blocked") continue;
          const result = dev.decideAt(bill.id, 40, {
            sign: true,
            discharge: true,
          });
          const first = result.committees.find((c) => c.chamber === house!.id);
          if (!first?.discharge) continue;
          rescued += 1;
          process.stderr.write(
            `${where}: bill ${bill.number} not reported by the committee (${first.yes}-${first.no}, heard ${first.heard}); ${first.discharge.signers.length} of ${first.discharge.needed} signed: ${first.discharge.discharged ? "discharged" : "not discharged"}; bill ${result.bill.status}${passed.length ? `; passed over: ${passed.join("; ")}` : ""}\n`,
          );
          expect(first.discharge.needed, where).toBe(218);
          expect(first.discharge.discharged, where).toBe(true);
          expect(first.reported, where).toBe(true);
          // Discharged, the bill went on: it was enacted, or it reached the Senate (whose committee has no
          // discharge rule in the data and may hold it there).
          expect(
            result.bill.status === "enacted" ||
              result.committees.some((c) => c.chamber === "federal:us-senate"),
            `${where}: the discharged bill reached the floor and went on`,
          ).toBe(true);
        }
        if (!rescued)
          passed.push(
            `${where}: the committee reported every bill in ${tried} tries`,
          );
      }
      expect(
        rescued,
        `no committee held a bill in ${WORLDS} worlds: ${passed.join("; ")}`,
      ).toBeGreaterThan(0);
    },
  );
});
