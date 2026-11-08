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
  it("an offer runs through considerBribe; money moves only when the official takes it", () => {
    const rich = dev.wealthiest(10);
    const poor = [...world.core.people.values()]
      .filter((p) => p.alive && p.liquidMinor < 100_000)
      .slice(0, 150);
    const outcomes = new Set<string>();
    let taken = 0;
    for (const offerer of rich)
      for (const official of poor) {
        const { record, moved } = dev.forceBribe({
          offererId: offerer.personId,
          officialId: official.id,
          subjectId: "bill:dev-test",
          stakeMinor: 50_000_000,
        });
        outcomes.add(
          `${record.offered ? "offered" : "declined"}/${record.taken ? "taken" : "refused"}`,
        );
        if (record.taken) {
          taken += 1;
          expect(moved, where).toBeGreaterThan(0);
        } else expect(moved, where).toBe(0);
        expect(record.subjectId).toBe("bill:dev-test");
      }
    process.stderr.write(
      `${where}: ${[...outcomes].join(", ")}; taken=${taken}\n`,
    );
    expect(outcomes.size, where).toBeGreaterThan(1);
  });
});
