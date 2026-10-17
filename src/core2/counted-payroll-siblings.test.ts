/**
 * One model, two tiers: a counted worker on a payroll paid twice a month is
 * in two wage flows, each paying half. A raise, a hire and an ending reach
 * both, or the worker is paid half. A drawn place whose employers pay twice a
 * month, opened as the game opens it.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { generatedOpening } from "./tooling/generated-world";
import { advanceCore, createLifeCore } from "./life";
import { addDays } from "./kernel/dates";
import { addCountedJob, endCountedJob } from "./residents-economy";
import { residentsRuntime } from "./modules/residents";
import { coreAPI } from "./state";

const base = (id: string) => id.replace(/:\d+$/, "");

it("a raise, a hire and an ending reach every flow of a twice-monthly payroll", () => {
  for (let attempt = 0; attempt < 8; attempt++) {
    const seed = randomBytes(8).toString("hex");
    const place = drawPlace(seed, "payroll-siblings");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const two = generatedOpening(place, { twoLevel: true });
    const core = createLifeCore(two);
    const api = coreAPI(core);
    advanceCore(core, addDays(two.startedAt, 9));
    const rt = residentsRuntime(core)!;
    const groups = new Map<
      string,
      typeof rt.flows extends Map<string, infer F> ? F[] : never
    >();
    for (const flow of rt.flows.values())
      if (flow.kind === "wages" && !flow.endedAt)
        groups.set(base(flow.id), [...(groups.get(base(flow.id)) ?? []), flow]);
    const split = [...groups.values()].find(
      (flows) =>
        flows.length === 2 &&
        flows[0]!.jobIds?.some((id) => (rt.jobs.get(id)?.hourlyMinor ?? 0) > 0),
    );
    if (!split) continue;
    const total = (flow: (typeof split)[number]) =>
      Math.round(
        Object.values(flow.perDayMinorByJob ?? {}).reduce((n, v) => n + v, 0) *
          (flow.periodFactor ?? 1),
      );
    const jobId = split[0]!.jobIds!.find(
      (id) => (rt.jobs.get(id)?.hourlyMinor ?? 0) > 0,
    )!;
    const job = rt.jobs.get(jobId)!;
    const source = {
      tag: "SOURCED" as const,
      asOf: core.date,
      citation: "Test.",
    };

    // A raise: both flows carry the new pay for the job.
    const before = split.map((flow) => flow.perDayMinorByJob![jobId]!);
    api.rerateJob(jobId, job.hourlyMinor! * 2, source);
    split.forEach((flow, at) => {
      expect(
        flow.perDayMinorByJob![jobId],
        `${where}: raise in ${flow.id}`,
      ).toBeCloseTo(before[at]! * 2, 6);
      expect(flow.amountMinor, `${where}: ${flow.id}`).toBe(total(flow));
    });

    // An ending: no flow of the payroll pays the job any more.
    expect(endCountedJob(core, jobId), where).toBeDefined();
    for (const flow of split) {
      expect(flow.jobIds, `${where}: ending in ${flow.id}`).not.toContain(
        jobId,
      );
      expect(
        flow.perDayMinorByJob![jobId],
        `${where}: ${flow.id}`,
      ).toBeUndefined();
      expect(flow.amountMinor, `${where}: ${flow.id}`).toBe(total(flow));
    }

    // A hire: both flows pay their half, which together make the job's pay.
    const amounts = split.map((flow) => flow.amountMinor);
    const hired = {
      ...job,
      id: `work-relationship_siblings-test-${seed}`,
      endsAt: undefined,
      wageDailyMinor: 20_000,
    };
    expect(
      addCountedJob(core, hired as never, split[0]!.jobIds![0]),
      where,
    ).toBe(true);
    const added = split.reduce(
      (n, flow, at) => n + (flow.amountMinor - amounts[at]!),
      0,
    );
    const monthly = (hired.wageDailyMinor * 365) / 12;
    split.forEach((flow) =>
      expect(flow.jobIds, `${where}: hire in ${flow.id}`).toContain(hired.id),
    );
    expect(
      Math.abs(added - monthly),
      `${where}: pay added ${added} against ${monthly}`,
    ).toBeLessThanOrEqual(2);
    return;
  }
  throw new Error("no drawn place with a twice-monthly payroll in 8 places");
}, 900_000);
