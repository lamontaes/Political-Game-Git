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

  it("a picked answer decides at the engine's own point and is kept beside what the engine said", () => {
    const [offerer] = dev.wealthiest(1);
    // The player's own seat is passed over: an offer made to it is put to the player to answer in a
    // scene (a pending record, nothing taken), so a picked "takes" cannot decide it. In a new life
    // the player is often the first person with little money, so the draw would land on them.
    const official = [...world.core.people.values()].find(
      (p) =>
        p.alive &&
        p.id !== offerer!.personId &&
        p.id !== world.core.playerId &&
        p.liquidMinor < 100_000,
    )!;
    const base = {
      offererId: offerer!.personId,
      officialId: official.id,
      stakeMinor: 50_000_000,
    };
    const takes = dev.forceBribe({
      ...base,
      subjectId: "bill:dev-pick-takes",
      answer: "takes",
    });
    expect(takes.record.offered, where).toBe(true);
    expect(takes.record.taken, where).toBe(true);
    expect(takes.moved, where).toBeGreaterThan(0);
    expect(takes.record.reasons.take?.picked, where).toBe(1);
    expect(takes.record.reasons.take?.engineSaid, where).toBeDefined();
    const refuses = dev.forceBribe({
      ...base,
      subjectId: "bill:dev-pick-refuses",
      answer: "refuses",
    });
    expect(refuses.record.offered, where).toBe(true);
    expect(refuses.record.taken, where).toBe(false);
    expect(refuses.moved, where).toBe(0);
    expect(refuses.record.reasons.take?.picked, where).toBe(-1);
  });

  it("an offer for a bill goes only to someone with a say on it; anyone else is refused in words", () => {
    const bodies = dev.lawmakingBodies().filter((b) => b.members.length > 2);
    const federal = bodies.find((b) => b.level === "federal");
    // The first town or county body whose law lets the bill be introduced at all.
    let local: (typeof bodies)[number] | undefined;
    let row: ReturnType<typeof dev.introduce>["bill"] | undefined;
    for (const body of bodies.filter(
      (b) => b.level === "city" || b.level === "county",
    ))
      for (const series of ["minimum-wage", "property-tax", "sales-tax"]) {
        if (local) break;
        const tried = dev.introduce({
          bodyOfficeId: body.id,
          sponsorId: body.members[0]!.key,
          series,
          value: 20,
        }).bill;
        if (tried.status !== "blocked") {
          local = body;
          row = tried;
        }
      }
    expect(local && federal && row, where).toBeTruthy();
    const [offerer] = dev.wealthiest(1);
    const ask = (officialId: string) => ({
      offererId: offerer!.personId,
      officialId,
      subjectId: row!.id,
      stakeMinor: 50_000_000,
      answer: "takes" as const,
    });
    // The panel's Official list holds that body's members (and its signer), and no member of Congress.
    const deciders = new Set(dev.billDeciders(row!.id).map((p) => p.personId));
    for (const m of local!.members)
      expect(deciders.has(m.personId!), where).toBe(true);
    for (const m of federal!.members)
      expect(deciders.has(m.personId!), where).toBe(false);
    // A member of the bill's own body can be asked.
    const member = local!.members.find(
      (m) => m.personId !== offerer!.personId,
    )!;
    expect(() => dev.forceBribe(ask(member.personId!)), where).not.toThrow();
    // A member of Congress has no say on a town's bill: refused in words, no record, no money.
    const outsider = federal!.members.find(
      (m) => m.personId !== offerer!.personId,
    )!;
    const records = world.core.durableLog.size;
    const cash = world.core.people.get(offerer!.personId)!.liquidMinor;
    expect(() => dev.forceBribe(ask(outsider.personId!)), where).toThrow(
      /no vote or signature on this bill/,
    );
    expect(world.core.people.get(offerer!.personId)!.liquidMinor, where).toBe(
      cash,
    );
    expect(world.core.durableLog.size, where).toBe(records);
  });
});
