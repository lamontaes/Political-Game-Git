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
/** A margin that passes a bill in every body: the Senate's cloture needs three fifths, so Congress takes more than a bare majority. */
const marginFor = (level: string | null) => (level === "federal" ? 40 : 6);
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

  it("a bill passes at a chosen margin through every committee wherever no chair holds it", () => {
    const report: string[] = [];
    for (const body of bodies) {
      const row = bill(body);
      if (!row) continue;
      const result = dev.decideAt(row.id, marginFor(body.level), {
        sign: true,
      });
      report.push(
        `${body.kind}: ${result.bill.status}${result.bill.moot ? " moot=" + JSON.stringify(result.bill.moot) : ""} committees=${JSON.stringify(result.committees)} veto=${result.veto}`,
      );
      // A chair who never heard the bill is the game's own answer; any other committee reported it.
      const unheard = result.committees.some((c) => !c.heard);
      if (!unheard)
        expect(
          result.bill.status,
          `${body.kind} ${where}: ${report.at(-1)}`,
        ).toBe("enacted");
    }
    process.stderr.write(`${where}\n${report.join("\n")}\n`);
  });

  it("a veto is overridden or sustained at the margin chosen, and a body with no veto says so", () => {
    for (const body of bodies) {
      const first = bill(body);
      const second = bill(body);
      if (!first || !second) continue;
      const overridden = dev.decideAt(first.id, marginFor(body.level), {
        sign: false,
        overrideMargin: BIG,
      });
      const sustained = dev.decideAt(second.id, marginFor(body.level), {
        sign: false,
        overrideMargin: -BIG,
      });
      const unheard = [...overridden.committees, ...sustained.committees].some(
        (c) => !c.heard,
      );
      if (unheard) continue;
      if (!overridden.veto) {
        // No executive veto here: the bill is simply law, and the control says so.
        expect(sustained.veto, `${body.kind} ${where}`).toBe(false);
        expect(overridden.bill.status, `${body.kind} ${where}`).toBe("enacted");
      } else {
        expect(overridden.bill.status, `${body.kind} ${where}`).toBe(
          "overridden",
        );
        expect(sustained.bill.status, `${body.kind} ${where}`).toBe("vetoed");
      }
    }
  });
});
