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
