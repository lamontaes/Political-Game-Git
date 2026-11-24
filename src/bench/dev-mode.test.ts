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
import { lawChain, lawInForce, stateLawInForce } from "../core2/modules/laws";
import { corePlaceStateIdentities } from "../core2/place-lookup";
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

  it("sets another state's law, and that state's law in force reads it", () => {
    const api = coreAPI(core);
    const own = lawChain(api).stateKey;
    // Another of the 56, by the world's own seed (no state named here).
    const states = corePlaceStateIdentities()
      .map((row) => row.jurisdictionKey)
      .filter((key) => key !== own)
      .sort();
    const other = states[parseInt(seed.slice(0, 6), 16) % states.length]!;
    const before = stateLawInForce(api, other, "sales-tax");
    const stateRate = (answer: typeof before) =>
      answer.levels.find((l) => l.level === "state")?.row?.value ?? 0;
    const raised = stateRate(before) + 2;
    const { law } = dev.setLaw({
      level: "state",
      series: "sales-tax",
      value: raised,
      stateKey: other,
    });
    const after = stateLawInForce(api, other, "sales-tax");
    const row = after.levels.find((l) => l.level === "state")?.row;
    console.log(
      `${world.place.displayName}: ${other} sales tax ${stateRate(before)} -> ${row?.value} (${law.id})`,
    );
    expect(row?.id).toBe(law.id);
    expect(row?.value).toBe(raised);
    // The town's own state keeps its chain's level; a state key there is refused.
    expect(() =>
      dev.setLaw({
        level: "state",
        series: "sales-tax",
        value: 1,
        stateKey: own,
      }),
    ).toThrow();
  });

  it("sets a law the law engine reads and the minimum-wage raise follows", () => {
    const api = coreAPI(core);
    const floor = lawInForce(api, "minimum-wage").value ?? 0;
    const value = floor + 1000;
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
    const { law } = dev.setLaw({
      level: "federal",
      series: "public-pay-floor",
      value: 70000,
      unit: "dollars/year",
    });
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
    // The reach counts every row of every engine that applied the law: the raise
    // rows themselves are one side, and the law engine's applied rows for the
    // same jobs ("raised-to-pay-floor", "held-at-pay-floor") are others, so the
    // total is at least the raises, and the raises side is exactly them.
    const reach = dev.reach(law.id);
    const raisesSide = reach.by.find(
      (side) => side.engine === "core2-laws-v1" && side.what === "raises",
    );
    expect(raisesSide?.records ?? 0).toBe(raises.length);
    expect(reach.records).toBeGreaterThanOrEqual(raises.length);
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
