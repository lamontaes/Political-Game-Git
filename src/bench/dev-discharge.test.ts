/**
 * The House discharge petition (rule XV, clause 2: 218 signatures): when a committee does not report a
 * bill, the members who sign are counted and, at the chamber's number, the bill goes to the floor. Bills
 * are introduced at the House through draftBill and every member signs through the legislature's own
 * signature, so wherever the committee did not report one, the petition is counted by the engine.
 *
 * Whether a chair holds a bill is the world's own: a chair's position can move in the forty days after a
 * defeated bill, so a place where every bill is heard has nothing to check. Up to three places are drawn
 * (CTO, Nov 17, 21:37Z, category c), each named when passed over. A random seed each run, named so a
 * failure can be replayed (DEV_MODE_SEED).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { BenchPlayer } from "./player";
import { DevMode } from "./dev-mode";

const seed = process.env.DEV_MODE_SEED ?? randomBytes(8).toString("hex");
const PLACES = 3;
const BILLS_PER_PLACE = 20;

it(
  `a bill a House committee did not report is discharged at 218 signatures and reaches the floor (seed ${seed})`,
  { timeout: 900_000 },
  () => {
    const passed: string[] = [];
    let rescued = 0;
    for (let at = 0; at < PLACES && rescued === 0; at += 1) {
      const placeSeed = at === 0 ? seed : `${seed}:${at}`;
      const world = buildBenchWorld(placeSeed, gameStartDate(), {
        twoLevel: true,
      });
      const dev = new DevMode(
        world.core,
        world.director,
        new BenchPlayer(world.core, world.director),
        world.placeId,
      );
      const where = `${world.place.displayName} (seed ${placeSeed})`;
      const house = dev
        .lawmakingBodies()
        .find((b) => b.id === "federal:us-house");
      expect(house, where).toBeDefined();
      let tried = 0;
      for (; tried < BILLS_PER_PLACE && rescued === 0; tried += 1) {
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
          `${where}${passed.length ? ` (passed over ${passed.join("; ")})` : ""}: bill ${bill.number} not reported by the committee (${first.yes}-${first.no}, heard ${first.heard}); ${first.discharge.signers.length} of ${first.discharge.needed} signed: ${first.discharge.discharged ? "discharged" : "not discharged"}; bill ${result.bill.status}\n`,
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
      if (rescued === 0)
        passed.push(`${where}: the committee heard all ${tried} bills`);
    }
    expect(
      rescued,
      `no committee held a bill at ${PLACES} drawn places; passed over: ${passed.join("; ")}`,
    ).toBeGreaterThan(0);
  },
);
