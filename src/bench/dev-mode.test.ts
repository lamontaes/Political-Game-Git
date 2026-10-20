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
import { residentsRuntime } from "../core2/modules/residents";
import { setBookkeeping } from "../core2/bookkeeping";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
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

  it("says when the cash journal's checks were skipped and how to turn them on", () => {
    const where = `${world.place.displayName} (seed ${seed})`;
    const before = dev.journalChecks();
    const previous = setBookkeeping(false);
    try {
      advanceCore(core, addDays(makeIsoDate(core.date), 14));
      const skipping = dev.journalChecks();
      expect(skipping.checking, where).toBe(false);
      expect(skipping.skipped, where).toBeGreaterThan(before.skipped);
      expect(skipping.rerunWith).toBe("CORE2_BOOKKEEPING=1");
      setBookkeeping(true);
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
      const checking = dev.journalChecks();
      expect(checking.checking, where).toBe(true);
      expect(checking.checked, where).toBeGreaterThan(skipping.checked);
      expect(checking.skipped, where).toBe(skipping.skipped);
    } finally {
      setBookkeeping(previous);
    }
  }, 240_000);

  it("sets a law the law engine reads and the minimum-wage raise follows", () => {
    const api = coreAPI(core);
    const floor = lawInForce(api, "minimum-wage").value ?? 0;
    // Above the town's lowest full-person wage, so some job is under it (a
    // floor raised by a fixed step can sit below every job in a town).
    const town = core.visiblePlaceIds;
    const lowest = Math.min(
      ...[...core.work.commitments.values()]
        .filter((row) => {
          const employer = core.organizations.get(row.organizationId);
          return (
            employer &&
            (!town.size || town.has(employer.placeId)) &&
            (row.endsAt === undefined || row.endsAt > core.date)
          );
        })
        .map((row) => row.hourlyMinor),
    );
    const value = Math.max(floor, lowest) + 1000;
    const { law, reach } = dev.setLaw({
      // The state level always counts; a place's floor needs the state's leave.
      level: "state",
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

  it("passes the $70,000 public pay floor as a law the law engine reads", () => {
    const before = dev.paySplit();
    const experiment = DevMode.experiments()[0]!;
    const { results } = dev.applySteps(experiment.id, experiment.steps);
    const { law } = results[0] as { law: { id: string; series: string } };
    expect(law.series).toBe("public-pay-floor");
    // The law engine's raises name the law; a counted job's wage flow pays it.
    const api = coreAPI(core);
    const raises = (
      api.moduleState("core2-laws-v1").table("raises").rows() as unknown as {
        jobId: string;
        toMinor: number;
        lawId: string;
      }[]
    ).filter((row) => row.lawId === law.id);
    const rt = residentsRuntime(core);
    for (const { jobId, toMinor } of raises) {
      const job = core.jobs.get(jobId) ?? rt?.jobs.get(jobId);
      expect(job?.hourlyMinor).toBe(toMinor);
    }
    expect(dev.reach(law.id).records).toBe(raises.length);
    const end = new Date(`${core.date}T00:00:00Z`);
    end.setUTCMonth(end.getUTCMonth() + 1);
    dev.advance(end.toISOString().slice(0, 10));
    if (raises.length)
      expect(dev.paySplit().publicMedianHourlyMinor).toBeGreaterThan(
        before.publicMedianHourlyMinor,
      );
    expect(devModeMarks(core).length).toBeGreaterThan(0);
  });
});
