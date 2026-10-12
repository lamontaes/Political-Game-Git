import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { generatedOpening } from "./tooling/generated-world";
import { collapseToTwoLevels } from "./residents";
import { advanceCore, createLifeCore } from "./life";
import { residentCounts, residentsRuntime } from "./modules/residents";
import { coreAPI, fillInPerson, personOrFillIn } from "./state";
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
      (row) =>
        row.kind === "purchase" &&
        row.financeKind !== "household.outside-living-costs",
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

  it("pays a filled-in retiree their own retirement income", () => {
    const core = createLifeCore(two);
    advanceCore(core, "2021-01-05");
    const record = [...residentsRuntime(core)!.households.values()].find(
      (row) => row.contracts.some((contract) => contract.recipientIncome),
    );
    if (!record) return; // No counted retiree in this place.
    const contract = record.contracts.find((row) => row.recipientIncome)!;
    const retireeId = contract.recipientIncome!.personId;
    const outsideNet = () =>
      [...core.cashJournal.externalFlowsByOwner.values()].reduce(
        (n, row) => n + row.netMinor,
        0,
      );
    const total = () =>
      [...core.people.values(), ...core.organizations.values()].reduce(
        (n, row) => n + row.liquidMinor,
        0,
      ) + outsideNet();
    const pooled = () =>
      [...residentsRuntime(core)!.flows.values()]
        .filter((flow) => flow.kind === "retirement" && !flow.endedAt)
        .reduce((n, flow) => n + flow.amountMinor, 0);
    const before = pooled(),
      start = total();
    fillInPerson(core, retireeId);
    const own = [...residentsRuntime(core)!.flows.values()].find(
      (flow) => flow.kind === "retirement" && flow.payeeId === retireeId,
    )!;
    expect(own.amountMinor).toBe(contract.amountMinor);
    // The pooled flows shrink by exactly what moved to the retiree.
    expect(pooled()).toBe(before);
    const cashBefore = core.people.get(retireeId)!.liquidMinor;
    advanceCore(core, "2021-03-05");
    expect(core.people.get(retireeId)!.liquidMinor).not.toBe(cashBefore);
    expect(own.arrearsMinor).toBe(0);
    expect(total()).toBe(start);
  }, 300_000);

  it("fills in a clicked counted person, and returns full people as they are", () => {
    const core = createLifeCore(two);
    const counted = [...residentsRuntime(core)!.households.values()][0]!
      .people[0]!;
    expect(core.people.has(counted.id)).toBe(false);
    const person = personOrFillIn(core, counted.id)!;
    expect(person.id).toBe(counted.id);
    expect(personOrFillIn(core, counted.id)).toBe(person);
    expect(personOrFillIn(core, core.playerId!)).toBe(
      core.people.get(core.playerId!),
    );
    expect(personOrFillIn(core, "person:nobody")).toBeUndefined();
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

  it("offers every paid sale to modules, e.g. to remit sales tax", () => {
    let sales = 0,
      remitted = 0,
      counted = 0;
    const treasury = {
      id: "treasury:test",
      placeId: two.people[0]!.placeId,
      name: "Test treasury",
      kind: "government",
      liquidMinor: 0,
      source: two.residents!.source,
    };
    const core = createLifeCore(
      { ...two, organizations: [...two.organizations, treasury] },
      {
        modules: [
          {
            id: "test-sales-tax",
            onSalesReceipt(api, sale) {
              sales += sale.paidMinor;
              if (sale.counted) counted++;
              const tax = Math.floor(sale.paidMinor * 0.05);
              const accounts = api.accounts();
              remitted += accounts.transfer({
                id: `tax:${sale.id}`,
                from: accounts.main(sale.sellerId),
                to: accounts.main(treasury.id),
                amountMinor: tax,
                reasonKey: "tax.sales",
                source: two.residents!.source,
                partial: true,
              }).paidMinor;
            },
          },
        ],
      },
    );
    advanceCore(core, "2021-02-01");
    expect(sales).toBeGreaterThan(0);
    expect(counted).toBeGreaterThan(0);
    expect(core.organizations.get(treasury.id)!.liquidMinor).toBe(remitted);
    expect(remitted).toBeGreaterThan(0.04 * sales);
  }, 300_000);

  it("lets a full person's relative wait in the counts as a husk", () => {
    const full = two.people.find((row) => row.id === two.playerId)!;
    const relative = two.residents!.households[0]!.people[0]!;
    const input = {
      ...two,
      people: two.people.map((row) =>
        row.id === full.id
          ? { ...row, familyIds: [...row.familyIds, relative.id] }
          : row,
      ),
      husks: [
        ...(two.husks ?? []),
        {
          id: relative.id,
          givenName: relative.givenName,
          familyName: relative.familyName,
          placeId: relative.placeId,
          looks: {},
          said: [],
          birthDate: relative.birthDate,
          source: relative.source,
        },
      ],
    };
    const core = createLifeCore(input);
    expect(core.husks.has(relative.id)).toBe(true);
    fillInPerson(core, relative.id);
    expect(core.husks.has(relative.id)).toBe(false);
    expect(
      core.relationships.has([full.id, relative.id].sort().join(":")),
    ).toBe(true);
  }, 300_000);

  it("gives the counted adults voter groups, and fill-in moves them out", () => {
    const groups = two.voterGroups ?? [];
    const start = Number(two.startedAt.slice(0, 4));
    const adults = two.residents!.households.reduce(
      (n, row) =>
        n +
        row.people.filter(
          (person) => start - Number(person.birthDate.slice(0, 4)) >= 18,
        ).length,
      0,
    );
    expect(groups.reduce((n, row) => n + row.size, 0)).toBe(adults);
    for (const row of groups) {
      expect(row.turnout).toBeGreaterThan(0);
      expect(row.turnout).toBeLessThanOrEqual(1);
      expect(Math.abs(row.lean)).toBeLessThanOrEqual(1);
    }
    const core = createLifeCore(two);
    const total = () =>
      groups.reduce(
        (n, row) => n + (coreAPI(core).voterGroups().get(row.id)?.size ?? 0),
        0,
      );
    const record = two.residents!.households.find((row) =>
      row.people.some(
        (person) => start - Number(person.birthDate.slice(0, 4)) >= 25,
      ),
    )!;
    const before = total();
    fillInPerson(core, record.people[0]!.id);
    const grown = record.people.filter(
      (person) => start - Number(person.birthDate.slice(0, 4)) >= 18,
    ).length;
    expect(before - total()).toBe(grown);
  }, 300_000);
});
