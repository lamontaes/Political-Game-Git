/**
 * Dev mode's bribe: someone wants a vote from a member, and the offer runs through the game's own
 * considerBribe. The offerer and the official each decide as the engine decides; a taken bribe
 * moves the money and leaves a record. A random place and seed each run, named so a failure can
 * be replayed.
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

describe(`dev bribe: ${where}`, () => {
  it("an offer for a pending vote runs through considerBribe and money moves only if taken", () => {
    const body = dev
      .lawmakingBodies()
      .find((b) => b.members.filter((m) => m.personId).length > 2);
    expect(body, where).toBeDefined();
    const ids = body!.members.flatMap((m) => (m.personId ? [m.personId] : []));
    const { bill } = dev.introduce({
      bodyOfficeId: body!.id,
      sponsorId: body!.members[0]!.key,
      series: "minimum-wage",
      value: 22.5,
    });
    const rows: string[] = [];
    for (const offererId of ids)
      for (const officialId of ids) {
        if (offererId === officialId) continue;
        let out;
        try {
          out = dev.forceBribe({
            offererId,
            officialId,
            subjectId: bill.id,
            stakeMinor: 100_000_00,
          });
        } catch {
          continue;
        }
        const { record, moved } = out;
        rows.push(
          `${record.offered ? "offered" : "declined"} ${record.taken ? "taken" : "refused"} moved=${moved}`,
        );
        if (record.taken) expect(moved, where).toBeGreaterThan(0);
        else expect(moved, where).toBe(0);
        expect(record.subjectId).toBe(bill.id);
      }
    process.stderr.write(
      `${where}\n${[...new Set(rows)].join("\n")}\ncount=${rows.length}\n`,
    );
    expect(rows.length, where).toBeGreaterThan(0);
  });
});
