import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { generatedOpening } from "./tooling/generated-world";
import { collapseToTwoLevels, fullPeople } from "./residents";
import { representativeSample } from "./representative-sample";
import { countedDrift } from "./modules/counted-drift";
import { DEFAULT_DEEP_PAST_DATA } from "./deep-past";
import placeCitizenship from "./data/place-citizenship-2024.json" with { type: "json" };
import { advanceCore, createLifeCore } from "./life";
import { residentCounts, residentsRuntime } from "./modules/residents";
import { coreAPI, fillInPerson, personOrFillIn } from "./state";
import type { CoreInput } from "./types";
import { enactLaw, LAWS_MODULE } from "./modules/laws";
import { worldCoreData } from "./modules/world";

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

describe("right-to-work pooled dues", () => {
  it("removes only the private compulsory fee from the actual dues payment", () => {
    const date = "2026-01-01",
      placeId = "place:dues-fixture";
    const source = {
      tag: "ESTIMATED" as const,
      asOf: date,
      citation: "Technical pooled-dues fixture.",
      estimatedFrom: "Two workers, one private and one public.",
    };
    const people = ["private", "public"].map((id) => ({
      id,
      givenName: id,
      familyName: "Fixture",
      birthDate: "1980-01-01",
      placeId,
      householdId: `home:${id}`,
      tier: "monthly" as const,
      traits: {},
      liquidMinor: 0,
      livingCostDailyMinor: 0,
      familyIds: [],
      knownIds: [],
      jobId: `job:${id}`,
      source,
    }));
    const core = createLifeCore(
      {
        seed: "pooled-dues-fixture",
        startedAt: date,
        people,
        households: people.map((p) => ({
          id: p.householdId,
          placeId,
          memberIds: [p.id],
          source,
        })),
        organizations: [
          {
            id: "employer:private",
            classification: "enterprise:retail",
            kind: "employer",
          },
          {
            id: "employer:public",
            classification: "service:police",
            kind: "employer",
          },
          { id: "pool", classification: "", kind: "residents" },
          {
            id: "union",
            classification: "membership:labor-union",
            kind: "membership",
          },
        ].map((o) => ({
          ...o,
          placeId,
          name: o.id,
          liquidMinor: 1000000,
          source,
        })),
        jobs: people.map((p) => ({
          id: p.jobId,
          personId: p.id,
          organizationId: `employer:${p.id}`,
          title: "Worker",
          hourlyMinor: 2000,
          hoursDaily: 8,
          wageDailyMinor: 16000,
          source,
        })),
        residents: {
          version: "core2-residents-v1",
          accounts: [{ placeId, accountId: "pool" }],
          households: [],
          source,
          flows: [
            {
              id: "dues:union",
              kind: "purchase",
              financeKind: "household.union-dues",
              payerId: "pool",
              payeeId: "union",
              residentsId: "pool",
              placeId,
              amountMinor: 10000,
              firstAt: "2026-02-01",
              cadence: { kind: "months", every: 1, day: 1 },
              salesReceipt: false,
              marketAdjusted: false,
              source,
            },
          ],
        },
        focusPersonIds: [],
        focusPlaceIds: [],
        calendarDates: [],
        gaps: [],
      },
      { data: worldCoreData(), modules: [LAWS_MODULE], scheduledWork: false },
    );
    core.observer = true;
    const api = coreAPI(core);
    api
      .moduleState(LAWS_MODULE.id)
      .table("chain")
      .put({
        id: "chain",
        placeKey: "fixture",
        placeName: "Fixture",
        townPlaceId: placeId,
        stateKey: "state:fixture",
        countyGeoids: [],
        incorporated: false,
        levels: [{ level: "state", jurisdiction: "state:fixture" }],
      });
    const enact = (value: number) =>
      enactLaw(api, {
        jurisdiction: "state:fixture",
        level: "state",
        series: "us-policy-positions:labor-workforce.right-to-work",
        value,
        effectiveDate: core.date,
        measureId: `dues:${value}`,
        citation: source.citation,
      });
    enact(0);
    const money = () =>
      [...core.people.values(), ...core.organizations.values()].reduce(
        (n, p) => n + p.liquidMinor,
        0,
      );
    const total = money();
    advanceCore(core, "2026-02-02");
    const receipt = (prefix: string) =>
      [...core.cashJournal.detailedReceipts.values()].find((r) =>
        r.sourceRef.id.startsWith(prefix),
      );
    expect(receipt("dues:union@2026-02-01")?.grossDebitMinor).toBe(10450);
    const law = enact(1);
    advanceCore(core, "2026-03-02");
    expect(receipt(`dues:union@2026-03-01:${law.id}`)?.grossDebitMinor).toBe(
      10000,
    );
    expect(money()).toBe(total);
  });
});

describe(`two-level population in ${place.name} (seed ${seed})`, () => {
  let full: CoreInput, two: CoreInput;
  let collapsed: CoreInput;
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
    advanceCore(core, "2021-02-01");
    let closing = 0,
      outside = 0;
    for (const row of core.people.values()) closing += row.liquidMinor;
    for (const row of core.organizations.values()) closing += row.liquidMinor;
    for (const row of core.cashJournal.externalFlowsByOwner.values())
      outside += row.netMinor;
    expect(closing).toBe(opening - outside);
    const counts = residentCounts(core);
    // The counts change on the 1st (counted drift).
    let drift = 0;
    for (const row of countedDrift(core).values())
      drift += row.births - row.deaths + row.movedIn - row.movedOut;
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
    );
    if (!flow) return;
    const due = Object.entries(flow.earnedDaysByDue!).find(
      ([, days]) => days === 0,
    )![0];
    const core = createLifeCore(two);
    if (due <= start) {
      // The opening day isn't run: that payday passes and the calendar holds.
      const next = Object.keys(flow.earnedDaysByDue!)
        .filter((date) => date > start)
        .sort()[0];
      if (next)
        expect(residentsRuntime(core)!.flows.get(flow.id)!.nextAt).toBe(next);
      return;
    }
    advanceCore(core, due);
    const state = residentsRuntime(core)!.flows.get(flow.id)!;
    expect(state.earnedDaysByDue?.[due]).toBeUndefined();
    expect(state.arrearsMinor).toBe(0);
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

  it("keeps no past in the counts and rebuilds it at fill-in, as the opening built it", () => {
    const core = createLifeCore(two);
    const records = [...residentsRuntime(core)!.households.values()];
    expect(
      records.every((row) =>
        row.people.every(
          (person) =>
            !person.pastFacts?.some((fact) =>
              fact.id.startsWith(
                `${person.id}:${DEFAULT_DEEP_PAST_DATA.version}:`,
              ),
            ),
        ),
      ),
    ).toBe(true);
    const fullById = new Map(full.people.map((row) => [row.id, row]));
    const record = records.find((row) =>
      row.people.some((person) => fullById.get(person.id)?.pastFacts?.length),
    )!;
    const person = record.people.find(
      (row) => fullById.get(row.id)?.pastFacts?.length,
    )!;
    fillInPerson(core, person.id);
    // Counted households have light customer terms, so a full opening's
    // where-they-shop facts aren't part of the past being rebuilt.
    const past = (facts: readonly { id: string }[] | undefined) =>
      JSON.stringify(
        (facts ?? []).filter(
          (fact) => !fact.id.startsWith("p8-opening-customer-builder"),
        ),
      );
    for (const row of record.people)
      expect(past(core.people.get(row.id)!.pastFacts)).toBe(
        past(fullById.get(row.id)!.pastFacts),
      );
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

  it("gives the counted adults voter groups, and fill-in moves them out", () => {
    const groups = two.voterGroups ?? [];
    const start = Number(two.startedAt.slice(0, 4));
    // Groups are the town's counted adults who are citizens (CPS 2024 share by
    // state and age band); relatives counted elsewhere vote where they live.
    const town = two.people.find((row) => row.id === two.playerId)!.placeId;
    const adults = two
      .residents!.households.filter((row) => row.household.placeId === town)
      .reduce(
        (n, row) =>
          n +
          row.people.filter(
            (person) => start - Number(person.birthDate.slice(0, 4)) >= 18,
          ).length,
        0,
      );
    const eligible = groups.reduce((n, row) => n + row.size, 0);
    expect(groups.every((row) => row.placeId === town)).toBe(true);
    expect(eligible).toBeLessThanOrEqual(adults);
    // The town's own ACS citizen share of adults sets the floor.
    const citizens = (
      placeCitizenship.byPlace as unknown as Record<string, [number, number]>
    )[two.placeMetadata!.placeKey!];
    const floor = citizens
      ? Math.min(0.75, (0.8 * citizens[0]) / citizens[1])
      : 0.75;
    expect(eligible).toBeGreaterThan(adults * floor);
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
    const record = two.residents!.households.find(
      (row) =>
        row.household.placeId === town &&
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
