import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { generatedOpening } from "./tooling/generated-world";
import { collapseToTwoLevels, fullPeople } from "./residents";
import { representativeSample } from "./representative-sample";
import { countedMoves } from "./modules/counted-moves";
import placeCitizenship from "./data/place-citizenship-2024.json" with { type: "json" };
import { advanceCore, createLifeCore } from "./life";
import {
  rerateCountedRetirement,
  residentCounts,
  residentsRuntime,
} from "./modules/residents";
import { coreAPI, fillInPerson, personOrFillIn } from "./state";
import { countedResidents } from "./electorate";
import { citizenShareOf } from "./electorate-places";
import { corePlaceByKey } from "./place-lookup";
import { addDays } from "./kernel/dates";
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
  // A day this many days after the opening, whatever date the game starts on.
  const daysIn = (days: number) => addDays(two.startedAt, days);
  // The first opening, this describe's own place and then further draws from
  // the seed, that has the case a test reads (a retiree, an early payday): a
  // place without it is passed over, and none having it fails by name.
  const openingWith = (
    salt: string,
    has: (input: CoreInput) => boolean,
  ): CoreInput => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const drawn =
        attempt === 0 ? place : drawPlace(`${seed}:${attempt}`, salt);
      const input =
        attempt === 0 ? two : generatedOpening(drawn, { twoLevel: true });
      if (has(input)) return input;
      tried.push(drawn.name);
    }
    throw new Error(
      `no drawn place had the case (${salt}, seed ${seed}): ${tried.join("; ")}`,
    );
  };
  const hasRetiree = (input: CoreInput) =>
    input.residents!.flows.some(
      (row) => row.kind === "retirement" && !row.endedAt,
    ) &&
    input.residents!.households.some((row) =>
      row.contracts.some((contract) => contract.recipientIncome),
    );
  beforeAll(() => {
    full = generatedOpening(place);
    // The game's opening keeps a representative sample full too.
    const keep = fullPeople(full);
    collapsed = collapseToTwoLevels(full, {
      keep: new Set([...keep, ...representativeSample(full, keep).personIds]),
    });
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
    advanceCore(core, daysIn(31));
    let closing = 0,
      outside = 0;
    for (const row of core.people.values()) closing += row.liquidMinor;
    for (const row of core.organizations.values()) closing += row.liquidMinor;
    for (const row of core.cashJournal.externalFlowsByOwner.values())
      outside += row.netMinor;
    expect(closing).toBe(opening - outside);
    const counts = residentCounts(core);
    // The counts change only by the counted moves (births and deaths belong to the renewal engine, which a plain life core does not run).
    let drift = 0;
    for (const row of countedMoves(coreAPI(core)))
      drift += row.direction === "in" ? row.people : -row.people;
    expect(counts.reduce((n, row) => n + row.people, 0)).toBe(
      full.people.length - two.people.length + drift,
    );
    const sales = [...core.finance.businesses.values()].reduce(
      (n, row) => n + row.salesReceivedMinor,
      0,
    );
    expect(sales).toBeGreaterThan(0);
  }, 300_000);

  it("pays counted workers only for days worked since the opening", () => {
    const hasEarlyPayday = (input: CoreInput) =>
      input.residents!.flows.some(
        (row) =>
          row.kind === "wages" &&
          Object.values(row.earnedDaysByDue ?? {}).includes(0),
      );
    const two = openingWith("core2-residents-early-payday", hasEarlyPayday);
    const start = two.startedAt;
    const wages = two.residents!.flows.filter((row) => row.kind === "wages");
    const early = wages.filter(
      (row) => Object.keys(row.earnedDaysByDue ?? {}).length,
    );
    for (const row of wages) expect(row.firstAt >= start).toBe(true);
    for (const row of early)
      for (const [due, days] of Object.entries(row.earnedDaysByDue!)) {
        expect(due >= start).toBe(true);
        expect(days).toBeGreaterThanOrEqual(0);
        expect(days).toBeLessThanOrEqual(31);
      }
    // A payday whose whole period came before the opening pays nothing.
    const flow = early.find((row) =>
      Object.values(row.earnedDaysByDue!).includes(0),
    )!;
    const due = Object.entries(flow.earnedDaysByDue!).find(
      ([, days]) => days === 0,
    )![0];
    const core = createLifeCore(two);
    if (due <= start) {
      // The opening day isn't run: that payday passes and the calendar holds.
      // A twice-a-month payroll is two flows sharing one table of earned
      // days; each flow keeps only the paydays on its own day of the month.
      const cadence = flow.cadence;
      const next = Object.keys(flow.earnedDaysByDue!)
        .filter(
          (date) =>
            date > start &&
            (cadence.kind !== "months" ||
              Number(date.slice(8)) === cadence.day),
        )
        .sort()[0];
      if (next)
        expect(residentsRuntime(core)!.flows.get(flow.id)!.nextAt).toBe(next);
      return;
    }
    advanceCore(core, due);
    const state = residentsRuntime(core)!.flows.get(flow.id)!;
    expect(state.earnedDaysByDue?.[due]).toBeUndefined();
    expect(state.arrearsMinor).toBe(0);
  }, 900_000);

  it("fills in a counted worker who matches the employer's books", () => {
    const core = createLifeCore(two);
    advanceCore(core, daysIn(14));
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
    advanceCore(core, daysIn(31));
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
    const core = createLifeCore(
      openingWith("core2-residents-retiree", hasRetiree),
    );
    advanceCore(core, daysIn(4));
    const record = [...residentsRuntime(core)!.households.values()].find(
      (row) => row.contracts.some((contract) => contract.recipientIncome),
    )!;
    expect(record).toBeDefined();
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
    advanceCore(core, daysIn(63));
    expect(core.people.get(retireeId)!.liquidMinor).not.toBe(cashBefore);
    expect(own.arrearsMinor).toBe(0);
    expect(total()).toBe(start);
  }, 900_000);

  it("pays counted and filled-in retirees at the benefit level in force", () => {
    const core = createLifeCore(
      openingWith("core2-residents-retiree", hasRetiree),
    );
    advanceCore(core, daysIn(4));
    const flows = () =>
      [...residentsRuntime(core)!.flows.values()].filter(
        (flow) => flow.kind === "retirement" && !flow.endedAt,
      );
    expect(flows().length).toBeGreaterThan(0);
    const record = [...residentsRuntime(core)!.households.values()].find(
      (row) => row.contracts.some((contract) => contract.recipientIncome),
    );
    if (record)
      fillInPerson(
        core,
        record.contracts.find((row) => row.recipientIncome)!.recipientIncome!
          .personId,
      );
    const base = new Map(flows().map((flow) => [flow.id, flow.amountMinor]));
    // A cut to nine-tenths reaches both tiers by one rule.
    rerateCountedRetirement(core, 0.9);
    // Each award rounds to the cent on its own.
    const awards = (flow: { amountByContract?: Record<string, number> }) =>
      Object.keys(flow.amountByContract ?? { own: 0 }).length;
    for (const flow of flows()) {
      expect(
        Math.abs(flow.amountMinor - base.get(flow.id)! * 0.9),
      ).toBeLessThanOrEqual(awards(flow));
      if (flow.amountByContract)
        expect(
          Object.values(flow.amountByContract).reduce((n, v) => n + v, 0),
        ).toBe(flow.amountMinor);
    }
    // Restoring the line restores the base, within a cent an award.
    rerateCountedRetirement(core, 1);
    for (const flow of flows())
      expect(
        Math.abs(flow.amountMinor - base.get(flow.id)!),
      ).toBeLessThanOrEqual(awards(flow));
  }, 900_000);

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

  it("keeps no past in the counts and builds the same one at every fill-in", () => {
    // One model, two tiers: a counted person is an identity in a group's
    // columns; their past exists only once they are filled in, built from
    // the world's seed, so the same person comes back with the same past.
    const core = createLifeCore(two);
    const records = [...residentsRuntime(core)!.households.values()];
    expect(
      records.every((row) =>
        row.people.every((person) => !person.pastFacts?.length),
      ),
    ).toBe(true);
    const person = records.find((row) => row.people.length > 1)!.people[0]!;
    fillInPerson(core, person.id);
    const again = createLifeCore(two);
    fillInPerson(again, person.id);
    const past = (facts: readonly { id: string }[] | undefined) =>
      JSON.stringify(facts ?? []);
    expect(core.people.get(person.id)!.pastFacts?.length).toBeGreaterThan(0);
    expect(past(core.people.get(person.id)!.pastFacts)).toBe(
      past(again.people.get(person.id)!.pastFacts),
    );
    const traits: Record<string, number> = {};
    for (const key in person.traits) traits[key] = person.traits[key]!;
    expect(core.people.get(person.id)!.traits).toEqual(traits);
  }, 300_000);

  it("re-rates full and counted workers from today", () => {
    const core = createLifeCore(two),
      api = coreAPI(core);
    advanceCore(core, daysIn(9));
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
    // A counted job paid by the hour can be re-rated; a salaried one has no hourly pay to change.
    const hourlyJob = (row: { kind: string; jobIds?: readonly string[] }) =>
      row.kind === "wages"
        ? row.jobIds?.find((id) => (rt.jobs.get(id)?.hourlyMinor ?? 0) > 0)
        : undefined;
    const flow = [...rt.flows.values()].find((row) => hourlyJob(row))!;
    const jobId = hourlyJob(flow)!,
      counted = rt.jobs.get(jobId)!,
      before = flow.amountMinor;
    api.rerateJob(jobId, counted.hourlyMinor! * 2, source);
    // A payroll paid twice a month is two flows over the same jobs: a new rate reaches both.
    const halvesAgree = () =>
      [...rt.flows.values()].every((row) =>
        (row.partnerFlowIds ?? []).every((id) => {
          const other = rt.flows.get(id)!;
          return (
            JSON.stringify(row.perDayMinorByJob) ===
              JSON.stringify(other.perDayMinorByJob) &&
            [...(row.jobIds ?? [])].sort().join() ===
              [...(other.jobIds ?? [])].sort().join()
          );
        }),
      );
    expect(halvesAgree()).toBe(true);
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
    expect(halvesAgree()).toBe(true);
    advanceCore(core, daysIn(30));
    expect(halvesAgree()).toBe(true);
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
    advanceCore(core, daysIn(31));
    expect(sales).toBeGreaterThan(0);
    expect(counted).toBeGreaterThan(0);
    expect(core.organizations.get(treasury.id)!.liquidMinor).toBe(remitted);
    expect(remitted).toBeGreaterThan(0.04 * sales);
  }, 300_000);

  it("lets a full person's relative wait in the counts as a husk", () => {
    const full = two.people.find((row) => row.id === two.playerId)!;
    // Someone the opening hasn't already made a husk (the builder does that for
    // a kept person's own relatives, e.g. seed dc27fe8a0505956b38264457df7fbb42).
    const waiting = new Set((two.husks ?? []).map((row) => row.id));
    expect(waiting.size).toBe((two.husks ?? []).length);
    const relative = two
      .residents!.households.flatMap((row) => row.people)
      .find((row) => !waiting.has(row.id))!;
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

  it("votes the counted adults from their own records, and fill-in moves them to the named route", () => {
    const start = Number(two.startedAt.slice(0, 4));
    const town = two.people.find((row) => row.id === two.playerId)!.placeId;
    const core = createLifeCore(two);
    const counted = () =>
      countedResidents(core).filter(
        (row) =>
          row.placeId === town &&
          start - Number(row.birthDate.slice(0, 4)) >= 18,
      ).length;
    // Counted votes stand for the town's citizens: the place's ACS share of
    // adults, blended with its state's.
    const usps =
      corePlaceByKey(two.placeMetadata!.placeKey!)?.stateJurisdictionKey?.slice(
        3,
      ) ?? "";
    const share = citizenShareOf(two.placeMetadata!.placeKey!, usps);
    expect(share).toBeGreaterThan(0);
    expect(share).toBeLessThanOrEqual(1);
    const citizens = (
      placeCitizenship.byPlace as unknown as Record<string, [number, number]>
    )[two.placeMetadata!.placeKey!];
    if (citizens)
      expect(share).toBeGreaterThan(
        Math.min(0.75, (0.8 * citizens[0]) / citizens[1]),
      );
    const record = two.residents!.households.find(
      (row) =>
        row.household.placeId === town &&
        row.people.some(
          (person) => start - Number(person.birthDate.slice(0, 4)) >= 25,
        ),
    )!;
    const before = counted();
    fillInPerson(core, record.people[0]!.id);
    const grown = record.people.filter(
      (person) => start - Number(person.birthDate.slice(0, 4)) >= 18,
    ).length;
    expect(before - counted()).toBe(grown);
  }, 300_000);
});
