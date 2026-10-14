/**
 * Dev mode in the played world: a law set here is the law every engine reads,
 * a picked choice is the person's next decision, and the $70,000 experiment
 * reaches public jobs through the core's pay records. A random place and seed
 * each run, named so a failure can be replayed.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { lawInForce } from "../core2/modules/laws";
import { BenchPlayer } from "./player";
import { DevMode, devModeMarks } from "./dev-mode";

const seed = process.env.DEV_MODE_SEED ?? randomBytes(8).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);

describe(`dev mode: ${world.place.displayName} (seed ${seed})`, () => {
  it("reads without spending time or writing records", () => {
    const date = core.date;
    const records = core.durableLog.size;
    const laws = dev.laws();
    dev.watchView();
    expect(laws.series.map((s) => s.series)).toContain("minimum-wage");
    expect(laws.levels.map((l) => l.level)).toEqual(
      expect.arrayContaining(["federal", "state"]),
    );
    expect(core.date).toBe(date);
    expect(core.durableLog.size).toBe(records);
  });

  it("sets a law the law engine reads and the minimum-wage raise follows", () => {
    const api = coreAPI(core);
    const floor = lawInForce(api, "minimum-wage").value ?? 0;
    const value = floor + 1000;
    const { law, reach } = dev.setLaw({
      level: "city",
      series: "minimum-wage",
      value,
    });
    expect(law.terms?.provenance).toBe("dev-mode");
    expect(lawInForce(api, "minimum-wage").value).toBe(value);
    // The laws engine raised jobs under the new floor, naming this law.
    expect(reach.records).toBeGreaterThan(0);
  });

  it("makes an offered choice a person's next decision", () => {
    const person = [...core.people.values()].find(
      (p) => p.alive && dev.offers(p.id).offers.length > 1,
    )!;
    const offer = dev.offers(person.id).offers.at(-1)!;
    dev.choose(person.id, offer.key);
    expect(() => dev.choose(person.id, "no-such-act:nobody")).toThrow();
    const end = new Date(`${core.date}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 14);
    dev.advance(end.toISOString().slice(0, 10));
    const taken = dev
      .marks()
      .filter(
        (m) =>
          m.control.startsWith("decision") &&
          m.control !== "decision-picked" &&
          m.facts.personId === person.id,
      );
    expect(taken.length).toBeGreaterThan(0);
    expect(dev.pending.has(person.id)).toBe(false);
  });

  it("runs the $70,000 public-salary experiment through the core's pay records", () => {
    const before = dev.paySplit();
    const experiment = DevMode.experiments()[0]!;
    const { results } = dev.applySteps(experiment.id, experiment.steps);
    const floor = results[0] as {
      covered: number;
      raised: { jobId: string; toMinor: number }[];
    };
    expect(floor.covered).toBe(before.publicJobs);
    for (const { jobId, toMinor } of floor.raised) {
      const changes = core.work.payChanges.get(jobId) ?? [];
      expect(changes.at(-1)?.hourlyMinor).toBe(toMinor);
    }
    const end = new Date(`${core.date}T00:00:00Z`);
    end.setUTCMonth(end.getUTCMonth() + 1);
    dev.advance(end.toISOString().slice(0, 10));
    if (floor.raised.length)
      expect(dev.paySplit().publicMedianHourlyMinor).toBeGreaterThan(
        before.publicMedianHourlyMinor,
      );
    expect(devModeMarks(core).length).toBeGreaterThan(0);
  });
});
