/**
 * A twice-a-month payroll is two wage flows, each paying half on its own
 * day. A counted worker's hire, raise and end reach both: before, a layoff
 * dropped the worker from one flow only (the other kept paying them), a raise
 * reached one half, and a hire joined one. Played-world opening in places
 * drawn from all 56, place and seed named in every failure.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { generatedOpening } from "./tooling/generated-world";
import { advanceCore, createLifeCore } from "./life";
import { addDays } from "./kernel/dates";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import {
  addCountedJob,
  endCountedJob,
  rerateCountedJobs,
} from "./residents-economy";
import { residentsRuntime } from "./modules/residents";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("a counted worker's hire, raise and end reach both halves of a twice-a-month payroll", () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "counted-payroll-halves");
    const opening = generatedOpening(place, { twoLevel: true });
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const core = createLifeCore(opening);
    advanceCore(core, addDays(opening.startedAt, 3));
    const rt = residentsRuntime(core)!;
    const halves = (jobId: string) =>
      [...rt.flows.values()].filter(
        (flow) =>
          flow.kind === "wages" &&
          !flow.endedAt &&
          flow.perDayMinorByJob?.[jobId] !== undefined,
      );
    const jobId = [...rt.wageFlowByJob.keys()].find(
      (id) => halves(id).length === 2,
    );
    if (!jobId) {
      tried.push(where);
      continue;
    }
    const job = rt.jobs.get(jobId)!;
    const [first, second] = halves(jobId) as [
      ReturnType<typeof halves>[number],
      ReturnType<typeof halves>[number],
    ];
    const before = [first, second].map((flow) => ({
      perDay: flow.perDayMinorByJob![jobId]!,
      amount: flow.amountMinor,
      factor: flow.periodFactor!,
    }));
    // A raise to double reaches both halves by the same rule.
    expect(
      rerateCountedJobs(core, new Map([[jobId, job.hourlyMinor! * 2]])),
      where,
    ).toBe(1);
    [first, second].forEach((flow, i) => {
      expect(flow.perDayMinorByJob![jobId], `${where} half ${i}`).toBeCloseTo(
        before[i]!.perDay * 2,
        6,
      );
      expect(flow.amountMinor - before[i]!.amount, `${where} half ${i}`).toBe(
        Math.round(
          Object.values(flow.perDayMinorByJob!).reduce((n, v) => n + v, 0) *
            before[i]!.factor,
        ) - before[i]!.amount,
      );
      expect(flow.amountMinor, `${where} half ${i}`).toBeGreaterThan(
        before[i]!.amount,
      );
    });
    // A hire at the same employer joins both halves.
    const hired = {
      ...job,
      id: "job:test-hired",
      personId: "person:test-hired",
    };
    expect(addCountedJob(core, hired, jobId), where).toBe(true);
    expect(
      rt.flows.get(first.id)!.perDayMinorByJob!["job:test-hired"],
      where,
    ).toBeDefined();
    const together = halves("job:test-hired");
    expect(together.length, where).toBeGreaterThanOrEqual(1);
    // An end drops the worker from both halves.
    expect(endCountedJob(core, jobId), where).toBeDefined();
    expect(halves(jobId), `${where}: still paid by a half`).toHaveLength(0);
    for (const flow of [first, second])
      expect(flow.jobIds, where).not.toContain(jobId);
    return;
  }
  throw new Error(
    `no drawn place had a worker paid through two flows (seed ${seed}): ${tried.join("; ")}`,
  );
}, 900_000);

it("after a played year the two halves of every twice-a-month payroll still list the same workers at the same pay", () => {
  const tried: string[] = [];
  let checked = 0;
  for (let attempt = 0; attempt < 6 && checked < 3; attempt += 1) {
    const place = drawPlace(`${seed}:year:${attempt}`, "counted-payroll-year");
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    advanceCore(core, addDays(core.date, 365));
    const rt = residentsRuntime(core)!;
    const byPayroll = new Map<
      string,
      typeof rt.flows extends Map<string, infer F> ? F[] : never
    >();
    for (const flow of rt.flows.values()) {
      if (flow.kind !== "wages" || flow.endedAt || !/:\d+$/.test(flow.id))
        continue;
      if (flow.cadence.kind !== "months") continue;
      const key = flow.id.replace(/:\d+$/, "");
      byPayroll.set(key, [...(byPayroll.get(key) ?? []), flow]);
    }
    const pairs = [...byPayroll].filter(([, flows]) => flows.length === 2);
    if (!pairs.length) {
      tried.push(where);
      continue;
    }
    checked += 1;
    for (const [key, [a, b]] of pairs) {
      expect([...(a!.jobIds ?? [])].sort(), `${where}: ${key} workers`).toEqual(
        [...(b!.jobIds ?? [])].sort(),
      );
      for (const [jobId, perDay] of Object.entries(a!.perDayMinorByJob ?? {}))
        expect(
          b!.perDayMinorByJob?.[jobId],
          `${where}: ${key} ${jobId}`,
        ).toBeCloseTo(perDay, 4);
    }
  }
  if (!checked)
    throw new Error(
      `no drawn place had a twice-a-month payroll (seed ${seed}): ${tried.join("; ")}`,
    );
}, 1_800_000);

it("after a played year every wage flow lists only workers whose counted job is still open, at the pay its amount adds up to", () => {
  const tried: string[] = [];
  let checked = 0;
  for (let attempt = 0; attempt < 6 && checked < 3; attempt += 1) {
    const place = drawPlace(
      `${seed}:books:${attempt}`,
      "counted-payroll-books",
    );
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    advanceCore(core, addDays(core.date, 365));
    const rt = residentsRuntime(core)!;
    const flows = [...rt.flows.values()].filter(
      (flow) => flow.kind === "wages" && !flow.endedAt && flow.perDayMinorByJob,
    );
    if (!flows.length) {
      tried.push(where);
      continue;
    }
    checked += 1;
    for (const flow of flows) {
      const per = flow.perDayMinorByJob!;
      const sum = Object.values(per).reduce((n, v) => n + v, 0);
      expect(
        Math.abs(flow.amountMinor - Math.round(sum * (flow.periodFactor ?? 1))),
        `${where}: ${flow.id} amount`,
      ).toBeLessThanOrEqual(1);
      expect([...(flow.jobIds ?? [])].sort(), `${where}: ${flow.id}`).toEqual(
        Object.keys(per).sort(),
      );
      for (const jobId of Object.keys(per)) {
        const job = rt.jobs.get(jobId);
        expect(job, `${where}: ${jobId} has a counted job`).toBeDefined();
        expect(
          job!.endsAt,
          `${where}: ${jobId} ended but still paid`,
        ).toBeUndefined();
        expect(
          core.jobs.has(jobId),
          `${where}: ${jobId} is also a full job`,
        ).toBe(false);
      }
    }
  }
  if (!checked)
    throw new Error(
      `no drawn place had a counted wage flow (seed ${seed}): ${tried.join("; ")}`,
    );
}, 1_800_000);
