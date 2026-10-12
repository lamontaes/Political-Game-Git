import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { generatedOpening } from "./tooling/generated-world";
import { collapseToTwoLevels } from "./residents";
import { advanceCore, createLifeCore } from "./life";
import { residentCounts, residentsRuntime } from "./modules/residents";
import { coreAPI, fillInPerson } from "./state";
import type { CoreInput } from "./types";

// One random place from all 56, named with its seed in the test title.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-residents");

const cash = (input: CoreInput) =>
  input.people.reduce((n, row) => n + row.liquidMinor, 0) +
  input.organizations.reduce((n, row) => n + row.liquidMinor, 0);
const monthlyHouseholdPurchases = (input: CoreInput) =>
  (input.finance?.contracts ?? [])
    .filter((row) => row.kind.startsWith("household."))
    .reduce((n, row) => n + row.amountMinor / row.periodMonths, 0);

describe(`two-level population in ${place.name} (seed ${seed})`, () => {
  let full: CoreInput, two: CoreInput;
  let collapsed: CoreInput;
  beforeAll(() => {
    full = generatedOpening(place);
    collapsed = collapseToTwoLevels(full);
    // The opening the game uses: counted households get light economy terms.
    two = generatedOpening(place, { twoLevel: true });
  }, 600_000);

  it("gives counted households the same money as a full opening", () => {
    const flows = (input: CoreInput) => {
      const bySeller = new Map<string, number>();
      for (const row of input.residents!.flows)
        bySeller.set(
          `${row.kind}:${row.payerId}:${row.payeeId}`,
          (bySeller.get(`${row.kind}:${row.payerId}:${row.payeeId}`) ?? 0) +
            row.amountMinor,
        );
      return [...bySeller].sort();
    };
    expect(flows(two)).toEqual(flows(collapsed));
    expect(two.people.map((row) => row.id)).toEqual(
      collapsed.people.map((row) => row.id),
    );
    expect(cash(two)).toBe(cash(collapsed));
  });

  it("keeps every person, dollar and purchase", () => {
    const counted = two.residents!.households.reduce(
      (n, row) => n + row.people.length,
      0,
    );
    expect(two.people.length + counted).toBe(full.people.length);
    expect(two.people.length).toBeLessThan(full.people.length);
    expect(cash(two)).toBe(cash(full));
    const purchases = two.residents!.flows.filter(
      (row) => row.kind === "purchase",
    );
    const merged = purchases.reduce(
      (n, row) =>
        n +
        row.amountMinor /
          (row.cadence.kind === "months" ? row.cadence.every : 1),
      0,
    );
    expect(merged + monthlyHouseholdPurchases(two)).toBeCloseTo(
      monthlyHouseholdPurchases(full),
      0,
    );
  });

  it("keeps the player's whole household and circle", () => {
    const ids = new Set(two.people.map((row) => row.id));
    const player = full.people.find((row) => row.id === full.playerId)!;
    for (const id of [...player.familyIds, ...player.knownIds])
      expect(ids.has(id) || two.husks?.some((row) => row.id === id)).toBe(true);
    for (const id of player.knownIds) expect(ids.has(id)).toBe(true);
    const home = full.households.find((row) =>
      row.memberIds.includes(full.playerId!),
    )!;
    for (const id of home.memberIds) expect(ids.has(id)).toBe(true);
  });

  it("runs a month with every dollar balanced and the counts read back", () => {
    const core = createLifeCore(two);
    const opening = cash(two);
    advanceCore(core, "2021-02-01");
    let closing = 0,
      outside = 0;
    for (const row of core.people.values()) closing += row.liquidMinor;
    for (const row of core.organizations.values()) closing += row.liquidMinor;
    for (const row of core.cashJournal.externalFlowsByOwner.values())
      outside += row.netMinor;
    expect(closing).toBe(opening - outside);
    const counts = residentCounts(core);
    expect(counts.reduce((n, row) => n + row.people, 0)).toBe(
      full.people.length - two.people.length,
    );
    const sales = [...core.finance.businesses.values()].reduce(
      (n, row) => n + row.salesReceivedMinor,
      0,
    );
    expect(sales).toBeGreaterThan(0);
  }, 300_000);

  it("fills in a counted worker who matches the employer's books", () => {
    const core = createLifeCore(two);
    advanceCore(core, "2021-01-15");
    const record = two.residents!.households.find((row) => row.jobs.length)!;
    const job = record.jobs[0]!;
    const before = residentCounts(core),
      people = core.people.size;
    const counted = (rows: typeof before) =>
      rows.reduce((n, row) => n + row.people, 0);
    const atEmployer = (rows: typeof before) =>
      rows.reduce(
        (n, row) => n + (row.workersByOrganization[job.organizationId] ?? 0),
        0,
      ) +
      [...core.jobs.values()].filter(
        (row) => row.organizationId === job.organizationId && !row.endsAt,
      ).length;
    const employed = atEmployer(before);
    const person = fillInPerson(core, job.personId);
    expect(person.id).toBe(job.personId);
    expect(person.jobId).toBe(job.id);
    expect(core.jobs.get(job.id)).toMatchObject({
      organizationId: job.organizationId,
      title: job.title,
      wageDailyMinor: job.wageDailyMinor,
    });
    // Moving from the counts to the people keeps every total.
    const after = residentCounts(core);
    expect(core.people.size - people).toBe(record.people.length);
    expect(counted(before) - counted(after)).toBe(record.people.length);
    expect(atEmployer(after)).toBe(employed);
    // The same person comes back: filling in again changes nothing.
    expect(fillInPerson(core, job.personId)).toBe(person);
    // Their working life is now their own: shifts, pay and cash.
    expect(residentsRuntime(core)!.wageFlowByJob.has(job.id)).toBe(false);
    const opening = cash(two);
    advanceCore(core, "2021-02-01");
    expect(core.work.lastAttendanceByJob.get(job.id)).toBeDefined();
    // Their shifts are scheduled; whether they go is their own choice.
    expect(core.work.totalsByJob.get(job.id)!.plannedMinutes).toBeGreaterThan(
      0,
    );
    let closing = 0,
      outside = 0;
    for (const row of core.people.values()) closing += row.liquidMinor;
    for (const row of core.organizations.values()) closing += row.liquidMinor;
    for (const row of core.cashJournal.externalFlowsByOwner.values())
      outside += row.netMinor;
    expect(closing).toBe(opening - outside);
  }, 300_000);

  it("re-rates full and counted workers from today", () => {
    const core = createLifeCore(two),
      api = coreAPI(core);
    advanceCore(core, "2021-01-10");
    const source = {
      tag: "SOURCED" as const,
      asOf: core.date,
      citation: "Test pay change.",
    };
    const full = [...core.jobs.values()].find(
      (job) =>
        job.endsAt === undefined &&
        [...(core.work.commitmentsByPerson.get(job.personId) ?? [])].length,
    )!;
    const old = core.work.lastAttendanceByJob.get(full.id);
    const hourly = full.hourlyMinor! + 100;
    api.rerateJob(full.id, hourly, source);
    const rt = residentsRuntime(core)!;
    const flow = [...rt.flows.values()].find(
      (row) => row.kind === "wages" && row.jobIds?.length,
    )!;
    const jobId = flow.jobIds![0]!,
      counted = rt.jobs.get(jobId)!,
      before = flow.amountMinor;
    api.rerateJob(jobId, counted.hourlyMinor! * 2, source);
    const share = flow.perDayMinorByJob![jobId]! / 2;
    expect(flow.amountMinor - before).toBe(
      Math.round(
        Object.values(flow.perDayMinorByJob!).reduce((n, v) => n + v, 0) *
          flow.periodFactor!,
      ) -
        Math.round(
          (Object.values(flow.perDayMinorByJob!).reduce((n, v) => n + v, 0) -
            share) *
            flow.periodFactor!,
        ),
    );
    advanceCore(core, "2021-01-31");
    const latest = core.work.lastAttendanceByJob.get(full.id);
    if (old && latest && latest.attendedMinutes > 0)
      expect(latest.earnedMinor / (latest.attendedMinutes / 60)).toBeCloseTo(
        hourly,
        -1,
      );
  }, 300_000);
});
