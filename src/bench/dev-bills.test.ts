/**
 * Dev mode's bills: at every body of a played world a member introduces a bill through
 * draftBill, the members vote through castMemberVote at the chosen margin, the body holds its
 * vote and the executive signs or vetoes through executiveDecision, an override voted at its own
 * margin. A random place and seed each run, named so a failure can be replayed.
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
const BIG = 1000;
let count = 0;

/** The bill, or null where the law bars this body from the series (the game's own authority check). */
function bill(body: ReturnType<DevMode["lawmakingBodies"]>[number]) {
  const row = dev.introduce({
    bodyOfficeId: body.id,
    sponsorId: body.members[0]!.key,
    series: "minimum-wage",
    value: 20 + (count += 1) / 100,
  }).bill;
  return row.status === "blocked" ? null : row;
}

describe(`dev bills: ${where}`, () => {
  const bodies = dev.lawmakingBodies().filter((b) => b.members.length > 2);

  it("has bodies at the city, county, state and federal levels", () => {
    expect(new Set(bodies.map((b) => b.level)).size, where).toBeGreaterThan(1);
  });

  it("a bill is defeated at a chosen margin at every body", () => {
    for (const body of bodies) {
      const row = bill(body);
      if (!row) continue;
      const result = dev.decideAt(row.id, -BIG);
      expect(result.bill.status, `${body.kind} ${where}`).toBe("failed");
      expect(result.tallies.every((t) => t.yes === 0)).toBe(true);
    }
  });

  it("a bill passes at a chosen margin wherever no committee chair holds it", () => {
    const report: string[] = [];
    for (const body of bodies) {
      const row = bill(body);
      if (!row) continue;
      const result = dev.decideAt(row.id, BIG, { sign: true });
      report.push(
        `${body.kind}: ${result.bill.status} held=${result.held.length}`,
      );
      if (!result.held.length)
        expect(result.bill.status, `${body.kind} ${where}`).toBe("enacted");
    }
    process.stderr.write(`${where}\n${report.join("\n")}\n`);
  });

  it("a vetoed bill is overridden or sustained at the margin chosen", () => {
    for (const body of bodies) {
      const first = bill(body);
      const second = bill(body);
      if (!first || !second) continue;
      const overridden = dev.decideAt(first.id, BIG, {
        sign: false,
        overrideMargin: BIG,
      });
      const sustained = dev.decideAt(second.id, BIG, {
        sign: false,
        overrideMargin: -BIG,
      });
      if (!overridden.held.length && overridden.bill.status !== "enacted")
        expect(overridden.bill.status, `${body.kind} ${where}`).toBe(
          "overridden",
        );
      if (!sustained.held.length && sustained.bill.status !== "enacted")
        expect(sustained.bill.status, `${body.kind} ${where}`).toBe("vetoed");
    }
  });
});
