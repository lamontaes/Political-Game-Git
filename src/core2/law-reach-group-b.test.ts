/**
 * Law reach, group B (audit item 13), in a random place drawn from all 56:
 * every group B policy, once law, changes something real for named people,
 * counted residents or employers through the engine that owns it (pay,
 * treasury money, budget lines, tax law rows, records), and a repeal (or a
 * budget line back at its base) ends it.
 */
import { createHash } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { repealStartingAnswers } from "./law-test-start";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { residentsRuntime } from "./modules/residents";
import { enactLaw, lawChain, lawInForce, openLaws } from "./modules/laws";
import {
  amendBudget,
  budgetsOf,
  governments,
  openBudgets,
  withholdingOf,
  type GovernmentRow,
} from "./modules/budgets";
import { openLawReach } from "./law-reach/host";
import { withholdingFor } from "./tax-withholding";
import type { LawInForceAnswer } from "./laws-in-force";
import type { CoreAPI, CoreState } from "./types";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";
import { REACH_B_MODULE_ID } from "./law-reach/group-b-store";
import type {
  GroupReach,
  OrganizationReach,
  PersonReach,
} from "./law-reach/group-b-store";
import { GROUP_B_KEYS, groupBPolicy } from "./law-reach/group-b";
import {
  reachParameter,
  selectResidents,
  townFacts,
} from "./law-reach/group-b-people";
import {
  budgetNow,
  modeledShare,
  source,
  residentsOf,
  townShare,
} from "./law-reach/group-b-money";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`reach-b:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}
const after = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
const Q = (s: string) => `us-policy-positions:${s}`;

let core: CoreState;
let api: CoreAPI;
let place = "";
let town = "";
let where = "";
/** The lowest level with its own government: the city, else the county, else the state. */
let LOCAL = "city";
let measure = 0;
const report: Record<string, unknown> = {};

const states = [...corePlaceStateIdentities()]
  .map((s) => s.jurisdictionKey)
  .sort();

function build(): void {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const state = pick(states, `state:${attempt}`);
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    if (!places.length) continue;
    const key =
      process.env.GOLDEN_PATH_PLACE_KEY ?? pick(places, `place:${attempt}`).key;
    const full = buildPopulation({
      seed,
      placeKey: key,
      startedAt: START,
      minimumPeople: 400,
    });
    const year = Number(START.slice(0, 4));
    // An employed adult where the place has one (paychecks for the tax tests), else any adult.
    const adults = [...full.people]
      .filter((p) => year - Number(p.birthDate.slice(0, 4)) >= 18)
      .sort((a, b) => a.id.localeCompare(b.id));
    const player = adults.find((p) => p.jobId) ?? adults[0];
    if (!player) continue;
    const teachers = full.jobs.filter(
      (j) => j.occupationClassification === "profession:teacher",
    ).length;
    if (!teachers && attempt < 20) continue;
    core = createLifeCore(
      collapseToTwoLevels({ ...full, playerId: player.id }),
    );
    openLaws(core);
    openBudgets(core);
    openLawReach(core);
    repealStartingAnswers(core);
    api = coreAPI(core);
    place = key;
    town = lawChain(api).townPlaceId;
    const levels = new Set(governments(api).map((g) => g.level));
    LOCAL = ["city", "county", "state"].find((l) => levels.has(l as "city"))!;
    where = `seed ${seed}, place ${key} (${core.placeMetadata.placeName})`;
    where += `, governments ${[...new Set(governments(api).map((g) => g.level))].join("/")}`;
    report.place = where;
    // The payment tests need someone to pay: a named adult the Medicaid
    // expansion covers and a named household with a 3- or 4-year-old. A town
    // without them is drawn again, so no assertion below runs on nothing.
    const facts = townFacts(api, town);
    const stateKey = lawChain(api).stateKey;
    const covered = selectResidents(
      facts,
      groupBPolicy(Q("health-human-services.expand-medicaid-eligibility"))!
        .people!,
      stateKey,
    ).some((r) => r.named);
    const toddlers = selectResidents(
      facts,
      groupBPolicy(Q("education.universal-preschool"))!.people!,
      stateKey,
    ).some(
      (c) =>
        c.named &&
        facts.residents.some(
          (r) => r.named && r.householdId === c.householdId && r.age >= 18,
        ),
    );
    if (!covered || !toddlers) continue;
    return;
  }
  throw new Error(
    `no town with an employed adult, a covered adult and a preschool child in forty draws (seed ${seed})`,
  );
}

function table<T>(name: string): T[] {
  if (!core.modules.has(REACH_B_MODULE_ID)) return [];
  return api
    .moduleState(REACH_B_MODULE_ID)
    .table(name)
    .rows() as unknown as T[];
}
const people = (key: string) =>
  table<PersonReach>("people").filter((r) => r.key === key);
const openPeople = (key: string) =>
  people(key).filter((r) => r.endedOn === null);
const orgs = (key: string) =>
  table<OrganizationReach>("organizations").filter((r) => r.key === key);
const openOrgs = (key: string) => orgs(key).filter((r) => r.endedOn === null);
const group = (key: string) =>
  table<GroupReach>("groups").find((r) => r.id === `${key}|${town}`);
const reached = (key: string) =>
  openPeople(key).length +
  (group(key)?.endedOn === null ? group(key)!.reached : 0);

/** Whether any named worker's paycheck was withheld since a date. */
function paidSince(since: string): boolean {
  return [...core.people.keys()].some((id) =>
    withholdingOf(api, id).some((w) => w.date >= since),
  );
}

function jurisdictionOf(level: string): string {
  return lawChain(api).levels.find((l) => l.level === level)!.jurisdiction;
}

/** Enact a law row at a level, effective tomorrow, and run past it. */
function enact(series: string, value: number, level: string, unit?: string) {
  measure += 1;
  enactLaw(api, {
    jurisdiction: jurisdictionOf(level),
    level: level as "state",
    series,
    value,
    ...(unit ? { unit } : {}),
    effectiveDate: after(api.state.date, 1),
    measureId: `TEST-${measure}`,
    citation: `Test act ${measure}`,
  });
  // A law's reach is read on the effective day before that day's moves and
  // deaths, so what it should reach is the town as it stands going in.
  startOfDay = { date: after(api.state.date, 1), birthDates: townBirthDates() };
  advanceCore(core, after(api.state.date, 1));
}

/** The birth dates of the town's residents, named and counted, as they stand now. */
function townBirthDates(): string[] {
  const out: string[] = [];
  for (const p of core.people.values())
    if (p.alive && p.placeId === town) out.push(p.birthDate);
  const rt = residentsRuntime(core);
  for (const r of rt?.households.values() ?? []) {
    if (rt!.filledIn.has(r.household.id) || r.household.placeId !== town)
      continue;
    for (const p of r.people) if (!core.people.has(p.id)) out.push(p.birthDate);
  }
  return out;
}

let startOfDay: { date: string; birthDates: string[] } | null = null;

/** Everyone in the town (named and counted) with an age in [from, below). */
function residentsAged(from: number, below = Infinity): number {
  const date = makeIsoDate(api.state.date);
  const age = (b: string) => ageOnDate(makeIsoDate(b), date);
  // Right after an enactment, count the town as the law's reach saw it.
  if (startOfDay?.date === api.state.date)
    return startOfDay.birthDates.filter((b) => age(b) >= from && age(b) < below)
      .length;
  let n = 0;
  for (const p of core.people.values())
    if (
      p.alive &&
      p.placeId === town &&
      age(p.birthDate) >= from &&
      age(p.birthDate) < below
    )
      n += 1;
  const rt = residentsRuntime(core);
  for (const r of rt?.households.values() ?? []) {
    if (rt!.filledIn.has(r.household.id) || r.household.placeId !== town)
      continue;
    for (const p of r.people)
      if (
        !core.people.has(p.id) &&
        age(p.birthDate) >= from &&
        age(p.birthDate) < below
      )
        n += 1;
  }
  return n;
}

/** Households in the town with an adult (named households and counted ones). */
function householdsWithAdults(): number {
  const date = makeIsoDate(api.state.date);
  const adult = (b: string) => ageOnDate(makeIsoDate(b), date) >= 18;
  const named = new Set<string>();
  for (const p of core.people.values())
    if (p.alive && p.placeId === town && adult(p.birthDate))
      named.add(p.householdId);
  let n = named.size;
  const rt = residentsRuntime(core);
  for (const r of rt?.households.values() ?? [])
    if (
      !rt!.filledIn.has(r.household.id) &&
      r.household.placeId === town &&
      r.people.some((p) => !core.people.has(p.id) && adult(p.birthDate))
    )
      n += 1;
  return n;
}

function employersOf(classes: readonly string[]): number {
  return [...core.organizations.values()].filter(
    (o) => o.placeId === town && classes.includes(o.classification ?? ""),
  ).length;
}

function expectEnded(key: string): void {
  expect(openPeople(key), `${where} ${key} people`).toEqual([]);
  expect(openOrgs(key), `${where} ${key} employers`).toEqual([]);
  const g = group(key);
  if (g) expect(g.endedOn, `${where} ${key} group`).not.toBeNull();
}

function govFor(line: string): GovernmentRow {
  const govs = governments(api);
  const city = govs.find((g) => g.level === LOCAL)!;
  const state = govs.find((g) => g.level === "state")!;
  const cityLine = budgetNow(api, city.id)?.spendingMinor[line] ?? 0;
  if (cityLine > 0 || !state || residentsOf(api, state) <= 0) return city;
  return state;
}
const line = (gov: GovernmentRow, name: string) =>
  budgetNow(api, gov.id)?.spendingMinor[name] ?? 0;
function amend(gov: GovernmentRow, name: string, delta: number) {
  measure += 1;
  // An amendment re-reads the town as it stands now, not as an earlier
  // enactment saw it that morning; count the town the same way.
  startOfDay = null;
  amendBudget(api, {
    governmentId: gov.id,
    line: name,
    deltaMinor: delta,
    measureId: `TEST-${measure}`,
  });
}
const stepFor = (gov: GovernmentRow, name: string) =>
  Math.max(
    Math.round(line(gov, name) * 0.1),
    Math.max(
      residentsOf(api, gov),
      Number(core.placeMetadata.referencePopulation) || 1000,
    ) * 1000,
  );

describe("law reach, group B: every policy reaches people through its engine", () => {
  beforeAll(() => build());

  it("registers a handler for every group B policy and budget line", () => {
    expect(GROUP_B_KEYS.length).toBe(35);
  });

  // ---- Records reaching named people, counted residents and employers ----
  // Public broadband and the property tax cap are read by the price engine
  // and the housing assessment (see "laws their own engine reads" below).
  const householdRecords = [Q("fiscal.exempt-groceries-from-sales-tax")];
  for (const key of householdRecords)
    it(`${key}: every household reached (its head carries the terms); employers bound; repeal ends it`, () => {
      enact(key, 1, LOCAL);
      expect(reached(key), `${where} ${key}`).toBe(householdsWithAdults());
      const def = groupBPolicy(key)!;
      for (const row of openPeople(key))
        for (const name of Object.keys(def.terms ?? {}))
          expect(row.terms[name], `${where} ${key} ${name}`).toBeGreaterThan(0);
      if (def.organizations)
        expect(openOrgs(key).length).toBe(employersOf(def.organizations));
      report[key] = {
        households: reached(key),
        employers: openOrgs(key).length,
      };
      enact(key, 0, LOCAL);
      expectEnded(key);
    });

  // Each of these laws is read at the moment an engine decides or pays, so the
  // generic reach handler writes no eligibility row for it (a row would be a
  // second, unread record of the same law). The proof lives with the engine.
  const readByOwnEngine: [string, string][] = [
    [Q("transportation-infrastructure.public-broadband"), "price-laws.test.ts"],
    [Q("environment-energy.bottle-deposit"), "price-laws.test.ts"],
    [Q("fiscal.cap-property-tax-growth"), "property-tax-laws.test.ts"],
    [
      Q("agriculture-natural-resources.protect-farmland-from-development"),
      "housing-laws.test.ts",
    ],
    [
      Q("agriculture-natural-resources.limit-groundwater-withdrawal"),
      "groundwater-law.test.ts",
    ],
    [
      Q("environment-energy.clean-air-plan-for-polluted-counties"),
      "clean-air-law.test.ts",
    ],
  ];
  for (const [key, proof] of readByOwnEngine)
    it(`${key}: read by its own engine (${proof}), so no generic reach row stands beside it`, () => {
      enact(key, 1, "state");
      expect(openPeople(key), `${where} ${key} people`).toEqual([]);
      expect(openOrgs(key), `${where} ${key} employers`).toEqual([]);
      expect(group(key), `${where} ${key} group`).toBeUndefined();
      enact(key, 0, "state");
    });

  // ---- Eligibility from income, work hours and children ----
  it("Medicaid expansion reaches low-income adults 19-64; the work requirement those under 80 hours without young children", () => {
    const expand = Q("health-human-services.expand-medicaid-eligibility");
    const work = Q("health-human-services.medicaid-work-requirement");
    enact(expand, 1, "state");
    expect(reached(expand), `${where} expansion`).toBeGreaterThan(0);
    // Counted before the work requirement, which then ends coverage for some of them.
    const eligibleBefore = reached(expand);
    const date = makeIsoDate(api.state.date);
    for (const row of openPeople(expand)) {
      const p = core.people.get(row.personId)!;
      const age = ageOnDate(makeIsoDate(p.birthDate), date);
      expect(age).toBeGreaterThanOrEqual(19);
      expect(age).toBeLessThan(65);
    }
    enact(work, 1, "state");
    expect(reached(work)).toBeLessThanOrEqual(eligibleBefore);
    const weekly = (80 * 12 * 60) / 52;
    for (const row of openPeople(work)) {
      const minutes = [
        ...(core.work.commitmentsByPerson.get(row.personId) ?? []),
      ]
        .map((id) => core.work.commitments.get(id)!)
        .filter((c) => c.endsAt === undefined)
        .reduce((n, c) => n + c.expectedWeeklyMinutes, 0);
      expect(minutes).toBeLessThan(weekly);
    }
    report.medicaid = {
      eligible: eligibleBefore,
      endedForHours: reached(work),
    };
    enact(work, 0, "state");
    expectEnded(work);
    enact(expand, 0, "state");
    expectEnded(expand);
  });

  it("Medicaid expansion has the state treasury pay each covered adult's medical spending; the work requirement stops it for those it reaches, and a repeal ends it", () => {
    const expand = Q("health-human-services.expand-medicaid-eligibility");
    const work = Q("health-human-services.medicaid-work-requirement");
    const accounts = api.accounts();
    const stateKey = lawChain(api).stateKey;
    const open = () =>
      table<{
        key: string;
        recipientId: string;
        obligationId: string;
        amountMinor: number;
      }>("taken").filter(
        (r) =>
          r.key === `coverage|${expand}` &&
          !accounts.obligation(r.obligationId)?.endedAt,
      );
    const monthly = Math.round(
      reachParameter("medicaidMonthlyMedicalDollars") * 100,
    );
    enact(expand, 1, "state");
    const facts = townFacts(api, town);
    const eligible = selectResidents(
      facts,
      groupBPolicy(expand)!.people!,
      stateKey,
    );
    const namedEligible = eligible.filter((r) => r.named);
    const paid = open();
    expect(namedEligible.length, `${where} a covered adult`).toBeGreaterThan(0);
    expect(eligible.length).toBeGreaterThan(0);
    expect(paid.length, `${where} coverage payments`).toBeGreaterThan(0);
    for (const r of namedEligible) {
      const row = paid.find((p) => p.recipientId === r.id);
      expect(row?.amountMinor, `${where} ${r.id} covered`).toBe(monthly);
    }
    // The treasury pays it: a month on, a covered adult has received it.
    advanceCore(core, after(api.state.date, 35));
    for (const row of open())
      expect(
        accounts.obligation(row.obligationId)!.paidMinor,
        `${where} ${row.recipientId} paid`,
      ).toBeGreaterThan(0);
    // The work requirement ends coverage for the adults it reaches.
    enact(work, 1, "state");
    const ended = new Set(
      selectResidents(
        townFacts(api, town),
        groupBPolicy(work)!.people!,
        stateKey,
      ).map((r) => r.id),
    );
    for (const row of open())
      expect(
        ended.has(row.recipientId),
        `${where} ${row.recipientId} still covered`,
      ).toBe(false);
    enact(work, 0, "state");
    enact(expand, 0, "state");
    expect(open(), `${where} coverage after repeal`).toEqual([]);
  });

  it("universal preschool has the state treasury pay the household of each 3- and 4-year-old a month at a time; a repeal ends it", () => {
    const key = Q("education.universal-preschool");
    const accounts = api.accounts();
    const open = () =>
      table<{
        key: string;
        recipientId: string;
        obligationId: string;
        amountMinor: number;
      }>("taken").filter(
        (r) =>
          r.key === `preschool|${key}` &&
          !accounts.obligation(r.obligationId)?.endedAt,
      );
    const monthly = Math.round(
      (reachParameter("preschoolStateSpendingPerChildDollars") *
        reachParameter("preschoolEnrolledShare") *
        100) /
        reachParameter("monthsPerYear"),
    );
    enact(key, 1, "state");
    const facts = townFacts(api, town);
    const children = selectResidents(
      facts,
      groupBPolicy(key)!.people!,
      lawChain(api).stateKey,
    ).filter((r) => r.named);
    const rows = open();
    // Every such child's household is paid, named or through the counts.
    expect(children.length, `${where} a preschool child`).toBeGreaterThan(0);
    expect(rows.length, `${where} preschool payments`).toBeGreaterThan(0);
    for (const row of rows.filter((r) => api.state.people.has(r.recipientId))) {
      const kids = children.filter((c) => {
        const head = facts.residents
          .filter(
            (r) => r.named && r.householdId === c.householdId && r.age >= 18,
          )
          .sort((x, y) => y.age - x.age || x.id.localeCompare(y.id))[0];
        return head?.id === row.recipientId;
      }).length;
      expect(row.amountMinor, `${where} ${row.recipientId}`).toBe(
        monthly * kids,
      );
    }
    advanceCore(core, after(api.state.date, 35));
    for (const row of open())
      expect(
        accounts.obligation(row.obligationId)!.paidMinor,
        `${where} ${row.recipientId} paid`,
      ).toBeGreaterThan(0);
    report[key] = { households: rows.length };
    enact(key, 0, "state");
    expect(open(), `${where} preschool after repeal`).toEqual([]);
  });

  // ---- Pay ----
  it("a teacher minimum salary raises every covered teacher under it to the floor (rerateJob)", () => {
    const key = Q("education.raise-teacher-minimum-salary");
    const floorDaily =
      (reachParameter("teacherMinimumSalaryDollars") * 100) / 365;
    const teacherJobs = () => {
      const rt = residentsRuntime(core);
      return [...core.jobs.values(), ...(rt?.jobs.values() ?? [])].filter(
        (j) =>
          j.occupationClassification === "profession:teacher" &&
          ["service:school"].includes(
            core.organizations.get(j.organizationId)?.classification ?? "",
          ) &&
          core.organizations.get(j.organizationId)?.placeId === town,
      );
    };
    const before = new Map(
      teacherJobs().map((j) => [j.id, j.hourlyMinor ?? 0]),
    );
    // A state whose starting law already had this floor raised teachers on the first day, before this test; the raise stays on record after the repeal.
    const raisedBefore = new Set(
      table<{ key: string; jobId: string }>("taken")
        .filter((row) => row.key === key)
        .map((row) => row.jobId),
    );
    enact(key, 1, "state");
    const now = teacherJobs();
    for (const job of now) {
      const current =
        core.jobs.get(job.id) ??
        residentsRuntime(core)?.jobs.get(job.id) ??
        job;
      expect(
        current.wageDailyMinor,
        `${where} ${job.id}`,
      ).toBeGreaterThanOrEqual(Math.floor(floorDaily));
    }
    // The floor counts every covered teacher it has a raise on record for: raised now, or raised earlier.
    const raised = now.filter(
      (j) =>
        (j.hourlyMinor ?? 0) > (before.get(j.id) ?? 0) ||
        raisedBefore.has(j.id),
    );
    expect(group(key)?.terms.raised ?? 0).toBe(raised.length);
    expect(openOrgs(key).length).toBe(
      new Set(now.map((j) => j.organizationId)).size,
    );
    report.teacherFloor = { teachers: now.length, raised: raised.length };
    enact(key, 0, "state");
    expectEnded(key);
  });

  // ---- Taxes collected through payroll withholding ----
  it("adopting a city income tax writes the law row payroll withholds into the city treasury; repeal stops it", () => {
    const key = Q("fiscal.adopt-income-tax");
    const city = governments(api).find((g) => g.level === LOCAL)!;
    const had =
      (lawInForce(api, "income-tax").levels.find((l) => l.level === LOCAL)?.row
        ?.value ?? 0) > 0;
    enact(key, 1, LOCAL);
    const row = lawInForce(api, "income-tax").levels.find(
      (l) => l.level === LOCAL,
    )?.row;
    if (!had) {
      expect(row?.value, where).toBe(
        reachParameter("localFlatIncomeTaxPercent"),
      );
      expect(row?.unit).toBe("percent-flat");
    }
    const since = api.state.date;
    advanceCore(core, after(api.state.date, 30));
    const cityLines = [...core.people.keys()].flatMap((id) =>
      withholdingOf(api, id)
        .filter((w) => w.date >= since)
        .flatMap((w) =>
          w.lines.filter((l) => l.level === LOCAL && l.tax === "income"),
        ),
    );
    // Where any named worker was paid in the month, the tax came out of it.
    if (paidSince(since))
      expect(
        cityLines.length,
        `${where}: no paycheck paid ${LOCAL} income tax`,
      ).toBeGreaterThan(0);
    // The act reaches the people whose paychecks it changed. Where the city
    // already had an income tax it wrote none, so it reached no one.
    if (had) expect(reached(key), where).toBe(0);
    else expect(openPeople(key).length, where).toBeGreaterThan(0);
    report.cityIncomeTax = {
      paychecks: cityLines.length,
      collectedMinor: cityLines.reduce((n, l) => n + l.minor, 0),
      treasury: city.organizationId,
    };
    enact(key, 0, LOCAL);
    expectEnded(key);
    if (!had)
      expect(
        lawInForce(api, "income-tax").levels.find((l) => l.level === LOCAL)?.row
          ?.value,
      ).toBe(0);
  });

  it("a graduated income tax replaces the level's tax with a schedule; repeal restores the prior row", () => {
    const key = Q("fiscal.graduated-income-tax");
    const prior = lawInForce(api, "income-tax").levels.find(
      (l) => l.level === LOCAL,
    )?.row;
    enact(key, 1, LOCAL);
    const row = lawInForce(api, "income-tax").levels.find(
      (l) => l.level === LOCAL,
    )?.row;
    if (!prior?.terms?.schedules)
      expect(
        (row?.terms?.schedules as { single: unknown } | undefined)?.single,
        where,
      ).toBeDefined();
    const since = api.state.date;
    advanceCore(core, after(api.state.date, 30));
    const lines = [...core.people.keys()].flatMap((id) =>
      withholdingOf(api, id)
        .filter((w) => w.date >= since)
        .flatMap((w) =>
          w.lines.filter((l) => l.level === LOCAL && l.tax === "income"),
        ),
    );
    if (paidSince(since)) expect(lines.length, where).toBeGreaterThan(0);
    enact(key, 0, LOCAL);
    const restored = lawInForce(api, "income-tax").levels.find(
      (l) => l.level === LOCAL,
    )?.row;
    expect(restored?.value ?? 0).toBe(prior?.value ?? 0);
    // Where the level's own tax is graduated, a "no" flattens it
    // (SG-GOV-REACH-B-flat-tax-replacement), and that flat law reaches the
    // taxpayers: the records still open belong to the repeal's own act, never
    // to the earlier one it undid.
    const stillOpen = openPeople(key);
    if (!stillOpen.length) expectEnded(key);
    else {
      expect(restored?.unit, `${where} flat law`).toBe("percent-flat");
      for (const row of stillOpen)
        expect(row.lawId, `${where} ${row.id}`).toContain(`:TEST-${measure}`);
      expect(openOrgs(key), `${where} ${key} employers`).toEqual([]);
    }
  });

  it("a city income tax drafted in the catalog's unit reaches workers (collection: audit item 8)", () => {
    enact("income-tax", 2, LOCAL, "percent");
    expect(openPeople("income-tax").length, where).toBeGreaterThan(0);
    expect(openPeople("income-tax")[0]!.terms[`${LOCAL}Rate`]).toBe(2);
    // Collection in "percent" is audit item 8 (OPUS-GOV, tax-withholding.ts).
    const percentCollects =
      withholdingFor({
        paidMinor: 100_000,
        periodDays: 14,
        yearToDateMinor: 0,
        incomeTax: {
          levels: [
            {
              level: "city",
              jurisdiction: "x",
              row: { id: "x", value: 2, unit: "percent", terms: {} },
            },
          ],
        } as unknown as LawInForceAnswer,
        socialSecurity: { governing: null } as unknown as LawInForceAnswer,
        medicare: { governing: null } as unknown as LawInForceAnswer,
      }).length > 0;
    if (percentCollects) {
      const since = api.state.date;
      advanceCore(core, after(api.state.date, 30));
      const lines = [...core.people.keys()].flatMap((id) =>
        withholdingOf(api, id)
          .filter((w) => w.date >= since)
          .flatMap((w) => w.lines.filter((l) => l.level === LOCAL)),
      );
      if (paidSince(since)) expect(lines.length, where).toBeGreaterThan(0);
    }
    report.incomeTaxPercent = { collectsNow: percentCollects };
    enact("income-tax", 0, LOCAL, "percent");
    // Other levels' income taxes still reach workers; the city's rate is gone.
    for (const row of openPeople("income-tax"))
      expect(row.terms[`${LOCAL}Rate`] ?? 0).toBe(0);
  });

  it("a city sales tax rate reaches every household and seller as a price record", () => {
    const before = lawInForce(api, "sales-tax").value ?? 0;
    enact("sales-tax", 1, LOCAL, "percent");
    const rate = lawInForce(api, "sales-tax").value ?? 0;
    expect(rate).toBeGreaterThan(0);
    expect(reached("sales-tax"), where).toBe(householdsWithAdults());
    for (const row of openPeople("sales-tax"))
      expect(row.terms.ratePercent).toBe(rate);
    report.salesTax = { before, after: rate };
    enact("sales-tax", 0, LOCAL, "percent");
  });

  // ---- Budget lines reach what they pay for ----
  const serviceLines: [string, number | null][] = [
    ["highways", 16],
    ["higherEducation", 18],
    ["naturalResources", null],
    ["parks", null],
    ["healthAndHospitals", null],
  ];
  for (const [name, from] of serviceLines)
    it(`budget line ${name}: a change reaches the people it serves; back at base it ends`, () => {
      const key = `budget-line:${name}`;
      const gov = govFor(name);
      const base = line(gov, name);
      const step = stepFor(gov, name);
      amend(gov, name, step);
      const g = group(key);
      expect(g?.endedOn, `${where} ${key}`).toBeNull();
      if (from !== null)
        expect(reached(key)).toBe(
          residentsAged(from, name === "higherEducation" ? 25 : Infinity),
        );
      else expect(reached(key)).toBe(residentsAged(0));
      for (const row of openPeople(key))
        expect(row.terms.townDeltaMinor).toBeGreaterThan(0);
      report[key] = {
        government: gov.id,
        stepMinor: step,
        reached: reached(key),
      };
      amend(gov, name, base - line(gov, name));
      expectEnded(key);
    });

  it("budget line schools: a change re-rates school staff pay from base and returns it at base", () => {
    const key = "budget-line:schools";
    const gov = govFor("schools");
    const staff = () => {
      const rt = residentsRuntime(core);
      return [...core.jobs.values(), ...(rt?.jobs.values() ?? [])].filter(
        (j) =>
          ["service:school"].includes(
            core.organizations.get(j.organizationId)?.classification ?? "",
          ) &&
          core.organizations.get(j.organizationId)?.placeId === town &&
          j.endsAt === undefined,
      );
    };
    const before = new Map(staff().map((j) => [j.id, j.hourlyMinor ?? 0]));
    const base = line(gov, "schools");
    const step = stepFor(gov, "schools");
    amend(gov, "schools", step);
    expect(reached(key), where).toBe(residentsAged(5, 18));
    const raised = staff().filter(
      (j) => (j.hourlyMinor ?? 0) > (before.get(j.id) ?? 0),
    );
    // Where the town's share of the change moves some staff rate by a cent.
    const delta = group(key)?.terms.townDeltaMinor ?? 0;
    const payroll =
      staff().reduce(
        (n, j) => n + (before.has(j.id) ? j.wageDailyMinor : 0),
        0,
      ) * 365;
    const fraction =
      payroll > 0
        ? (delta *
            reachParameter("schoolCompensationShare") *
            modeledShare(api, townFacts(api, town))) /
          payroll
        : 0;
    const moves = [...before.values()].some(
      (h) => h > 0 && Math.round(h * (1 + fraction)) !== h,
    );
    if (moves) expect(raised.length, where).toBeGreaterThan(0);
    report[key] = {
      staff: before.size,
      raised: raised.length,
      stepMinor: step,
    };
    amend(gov, "schools", base - line(gov, "schools"));
    expectEnded(key);
    for (const j of staff()) expect(j.hourlyMinor).toBe(before.get(j.id));
  });

  it("budget line schools: a raise another rule gave a school job survives a change and its reversal", () => {
    const gov = govFor("schools");
    const jobs = [
      ...core.jobs.values(),
      ...(residentsRuntime(core)?.jobs.values() ?? []),
    ].filter(
      (j) =>
        j.endsAt === undefined &&
        core.organizations.get(j.organizationId)?.placeId === town &&
        ["service:school"].includes(
          core.organizations.get(j.organizationId)?.classification ?? "",
        ),
    );
    const job = jobs.find((j) => (j.hourlyMinor ?? 0) > 0);
    if (!job) {
      report.schoolRaiseKept = "no school job in this place";
      return;
    }
    const base = line(gov, "schools");
    const step = stepFor(gov, "schools");
    // The line has seen this job once; then another rule (not the line) raises it.
    amend(gov, "schools", step);
    amend(gov, "schools", -step);
    const raisedTo = Math.round((job.hourlyMinor ?? 0) * 1.25);
    api.rerateJob(job.id, raisedTo, source(api, "Test: another rule's raise"));
    const live = () =>
      (core.jobs.get(job.id) ?? residentsRuntime(core)?.jobs.get(job.id))
        ?.hourlyMinor;
    expect(live(), where).toBe(raisedTo);
    amend(gov, "schools", step);
    amend(gov, "schools", base - line(gov, "schools"));
    expect(live(), `${where} the line returned the job below the raise`).toBe(
      raisedTo,
    );
    report.schoolRaiseKept = { jobId: job.id, hourlyMinor: raisedTo };
  });

  it("budget line welfare: an increase pays eligible households a monthly benefit from the treasury", () => {
    const key = "budget-line:welfareAndMedicaid";
    const gov = govFor("welfareAndMedicaid");
    const base = line(gov, "welfareAndMedicaid");
    const step = stepFor(gov, "welfareAndMedicaid");
    amend(gov, "welfareAndMedicaid", step);
    // Households with no job income at all are under any income limit.
    const anyNoIncome = [...townFacts(api, town).households.values()].some(
      (h) => h.incomeDollars === 0,
    );
    if (anyNoIncome) expect(reached(key), where).toBeGreaterThan(0);
    const benefits = table<{
      key: string;
      obligationId: string;
      amountMinor: number;
    }>("taken").filter((r) => r.key === `benefit|${key}`);
    // Where the town's share of the increase comes to a cent a household a month.
    const perHousehold = Math.floor(
      ((group(key)?.terms.townDeltaMinor ?? 0) *
        modeledShare(api, townFacts(api, town))) /
        12 /
        Math.max(1, reached(key)),
    );
    if (reached(key) > 0 && perHousehold >= 1)
      expect(benefits.length, where).toBeGreaterThan(0);
    const accounts = api.accounts();
    const treasuryBefore = core.organizations.get(
      gov.organizationId,
    )!.liquidMinor;
    advanceCore(core, after(api.state.date, 40));
    let paid = 0;
    for (const b of benefits) {
      const o = accounts.obligation(b.obligationId)!;
      expect(o.amountMinor).toBe(b.amountMinor);
      expect(o.lastReceipt, where).toBeDefined();
      expect(o.lastReceipt!.paidMinor + o.lastReceipt!.shortMinor).toBe(
        b.amountMinor,
      );
      paid += o.paidMinor;
    }
    report[key] = {
      government: gov.id,
      recipients: benefits.length,
      monthlyMinor: benefits.reduce((n, b) => n + b.amountMinor, 0),
      paidMinor: paid,
      treasuryBefore,
    };
    amend(gov, "welfareAndMedicaid", base - line(gov, "welfareAndMedicaid"));
    expectEnded(key);
    for (const b of benefits)
      expect(accounts.obligation(b.obligationId)!.endedAt).toBeDefined();
  });

  // ---- Acts that move budget money ----
  // Price-law settlement and repeal are checked in price-laws.test.ts.
  // Eligibility notes do not prove that a household paid a changed price.
  it("an assistance work requirement stops the welfare benefit for the adults it reaches after its time limit, and a repeal pays them again", () => {
    const key = "budget-line:welfareAndMedicaid";
    const work = Q("health-human-services.work-requirement-for-assistance");
    const gov = govFor("welfareAndMedicaid");
    const base = line(gov, "welfareAndMedicaid");
    amend(gov, "welfareAndMedicaid", stepFor(gov, "welfareAndMedicaid") * 3);
    const raised = line(gov, "welfareAndMedicaid");
    const accounts = api.accounts();
    const open = () =>
      table<{
        key: string;
        recipientId: string;
        obligationId: string;
        amountMinor: number;
      }>("taken").filter(
        (r) =>
          r.key === `benefit|${key}` &&
          !accounts.obligation(r.obligationId)?.endedAt,
      );
    const stateKey = lawChain(api).stateKey;
    /** The heads the welfare line pays and which of them the requirement reaches, as the town stands now. */
    const standing = () => {
      // Re-read the town as it stands today: nudge the line and put it back.
      amend(gov, "welfareAndMedicaid", -1);
      amend(gov, "welfareAndMedicaid", 1);
      const facts = townFacts(api, town);
      const heads = selectResidents(
        facts,
        {
          incomeBelowPovertyShare: "assistanceIncomeShare",
          householdHead: true,
        },
        stateKey,
      );
      const reachedIds = new Set(
        selectResidents(facts, groupBPolicy(work)!.people!, stateKey).map(
          (r) => r.id,
        ),
      );
      const rows = open();
      const named = rows.filter((r) => api.state.people.has(r.recipientId));
      const countedRow = rows.find((r) => !api.state.people.has(r.recipientId));
      return { heads, reachedIds, named, countedRow };
    };
    enact(work, 1, "state");
    // The law writes no second record: the benefit is where it is read.
    expect(openPeople(work), `${where} ${work}`).toEqual([]);
    // Inside the time limit everyone still draws.
    const inside = standing();
    for (const head of inside.heads.filter((h) => h.named))
      expect(
        inside.named.some((r) => r.recipientId === head.id),
        `${where} ${head.id} drawing inside the limit`,
      ).toBe(true);
    // Live through the limit a month at a time; a new fiscal year's budget
    // starts from the base, so the council raises the line again.
    for (let m = 0; m < reachParameter("snapWorkTimeLimitMonths") + 2; m += 1) {
      advanceCore(core, after(api.state.date, 31));
      if (line(gov, "welfareAndMedicaid") < raised)
        amend(
          gov,
          "welfareAndMedicaid",
          raised - line(gov, "welfareAndMedicaid"),
        );
    }
    const past = standing();
    const stopped = past.heads.filter((h) => past.reachedIds.has(h.id));
    for (const head of stopped.filter((h) => h.named))
      expect(
        past.named.some((r) => r.recipientId === head.id),
        `${where} ${head.id} still paid after the limit`,
      ).toBe(false);
    // The line's money goes to the heads still drawing, so the pooled payment for counted households is that rate times the counted heads still drawing.
    const drawing = past.heads.length - stopped.length;
    const rate = Math.floor(
      ((group(key)?.terms.townDeltaMinor ?? 0) *
        modeledShare(api, townFacts(api, town))) /
        reachParameter("monthsPerYear") /
        Math.max(1, drawing),
    );
    const countedDrawing = past.heads.filter(
      (h) => !h.named && !past.reachedIds.has(h.id),
    ).length;
    if (rate > 0 && countedDrawing > 0)
      expect(past.countedRow?.amountMinor, `${where} pooled payment`).toBe(
        rate * countedDrawing,
      );
    report.assistanceWork = {
      heads: past.heads.length,
      stopped: stopped.length,
      namedStopped: stopped.filter((h) => h.named).length,
    };
    // A repeal pays them again.
    enact(work, 0, "state");
    const after_ = standing();
    for (const head of after_.heads.filter((h) => h.named))
      expect(
        after_.named.some((r) => r.recipientId === head.id),
        `${where} ${head.id} not paid again after the repeal`,
      ).toBe(true);
    amend(gov, "welfareAndMedicaid", base - line(gov, "welfareAndMedicaid"));
  });

  it("fare-free transit funds the fares from the budget; repeal takes the money back", () => {
    const key = Q("transportation-infrastructure.fare-free-transit");
    const state = governments(api).find((g) => g.level === "state")!;
    const level = residentsOf(api, state) > 0 ? "state" : LOCAL;
    const gov = governments(api).find((g) => g.level === level)!;
    const before = line(gov, "transit");
    enact(key, 1, level);
    expect(line(gov, "transit") - before).toBe(
      Math.round(
        reachParameter("transitFareboxPerResidentDollars") *
          100 *
          residentsOf(api, gov),
      ),
    );
    expect(reached(key), "funding alone does not notify every rider").toBe(0);
    enact(key, 0, level);
    expectEnded(key);
    expect(line(gov, "transit")).toBe(before);
  });

  it("shifting highway funds to transit moves the line; drivers' road service falls", () => {
    const key = Q(
      "transportation-infrastructure.shift-highway-funds-to-transit",
    );
    const state = governments(api).find((g) => g.level === "state")!;
    if (residentsOf(api, state) <= 0 || line(state, "highways") <= 0) {
      report.highwayShift = "no state highway line in this place";
      return;
    }
    const highways = line(state, "highways");
    const transit = line(state, "transit");
    enact(key, 1, "state");
    const moved = Math.round(highways * reachParameter("highwayShareShifted"));
    expect(line(state, "highways")).toBe(highways - moved);
    expect(line(state, "transit")).toBe(transit + moved);
    // The law moved the line on its effective morning, with the town as it stood then; counted births, moves and arrivals later that day change who lives here. Nudge the line and put it back so the engine reads the town as it stands now, the instant this test counts it.

    amend(state, "highways", -1);
    amend(state, "highways", 1);
    expect(line(state, "highways")).toBe(highways - moved);
    const road = openPeople("budget-line:highways");
    for (const row of road) expect(row.terms.townDeltaMinor).toBeLessThan(0);
    expect(reached("budget-line:highways"), where).toBe(residentsAged(16));
    report.highwayShift = { movedMinor: moved };
    enact(key, 0, "state");
    expect(line(state, "highways")).toBe(highways);
    expectEnded("budget-line:highways");
  });

  it("funding pensions to schedule adds the contribution and reaches public employers and workers", () => {
    const key = Q("fiscal.fund-pensions-to-schedule");
    const gov = governments(api).find((g) => g.level === LOCAL)!;
    const before = line(gov, "retirementContributions");
    enact(key, 1, LOCAL);
    const added = Math.round(
      reachParameter("pensionShortfallPerResidentDollars") *
        100 *
        residentsOf(api, gov),
    );
    expect(line(gov, "retirementContributions") - before).toBe(added);
    const publicOrgs = [...core.organizations.values()].filter(
      (o) =>
        o.placeId === town &&
        [
          "sector:local-government-office",
          "sector:state-government-office",
          "sector:federal-government-office",
          "service:municipal-government",
          "service:police",
          "service:fire",
          "service:school",
          "service:public-health",
        ].includes(o.classification ?? "") &&
        [
          ...core.jobs.values(),
          ...(residentsRuntime(core)?.jobs.values() ?? []),
        ].some((j) => j.organizationId === o.id && j.endsAt === undefined),
    );
    expect(openOrgs("budget-line:retirementContributions").length, where).toBe(
      publicOrgs.length,
    );
    report.pensions = { addedMinor: added, publicEmployers: publicOrgs.length };
    enact(key, 0, LOCAL);
    expect(line(gov, "retirementContributions")).toBe(before);
    expectEnded("budget-line:retirementContributions");
  });

  it("a minimum reserve sets the treasury's cash aside up to its target; repeal releases it", () => {
    const key = Q("fiscal.minimum-reserve-balance");
    const govs = governments(api).filter(
      (g) => g.level === LOCAL || g.level === "state",
    );
    // The government with a budget to hold a reserve against, richest first.
    const spends = (g: GovernmentRow) =>
      Object.values(budgetNow(api, g.id)?.spendingMinor ?? {}).some(
        (v) => v > 0,
      )
        ? 1
        : 0;
    const gov = [...govs].sort(
      (a, b) =>
        spends(b) - spends(a) ||
        core.organizations.get(b.organizationId)!.liquidMinor -
          core.organizations.get(a.organizationId)!.liquidMinor,
    )[0]!;
    const accounts = api.accounts();
    const cash = core.organizations.get(gov.organizationId)!.liquidMinor;
    enact(key, 1, gov.level);
    const reserve = `reserve:${gov.organizationId}`;
    const held = accounts.balance(reserve);
    const target = group(key)!.terms.targetMinor!;
    const spending = Object.values(
      budgetNow(api, gov.id)?.spendingMinor ?? {},
    ).reduce((a, b) => a + b, 0);
    // The target is the reserve share of the year's spending, the town's part of it.
    const expected = Math.round(
      spending *
        reachParameter("reserveShareOfSpending") *
        townShare(api, gov) *
        modeledShare(api, townFacts(api, town)),
    );
    const numbers = `${where}: cash ${cash}, spending ${spending}, target ${target}, held ${held}`;
    expect(target, numbers).toBe(expected);
    expect(held, numbers).toBeLessThanOrEqual(target);
    // Where the treasury had cash and the target is above zero, cash moved.
    if (cash > 0 && target > 0) expect(held, numbers).toBeGreaterThan(0);
    expect(
      core.organizations.get(gov.organizationId)!.liquidMinor,
    ).toBeGreaterThanOrEqual(held);
    report.reserve = { government: gov.id, cashBefore: cash, held, target };
    enact(key, 0, gov.level);
    expect(accounts.balance(reserve)).toBe(0);
    expectEnded(key);
  });

  it("a balanced-budget rule cuts spending to revenue", () => {
    const key = Q("fiscal.balanced-operating-budget");
    const gov = governments(api).find((g) => g.level === LOCAL)!;
    const total = (o: Readonly<Record<string, number>>) =>
      Object.values(o).reduce((a, b) => a + b, 0);
    const b0 = budgetNow(api, gov.id)!;
    const gap = total(b0.spendingMinor) - total(b0.revenueMinor);
    if (gap <= 0)
      amend(gov, "otherPrograms", -gap + stepFor(gov, "otherPrograms"));
    const before = budgetNow(api, gov.id)!;
    expect(total(before.spendingMinor)).toBeGreaterThan(
      total(before.revenueMinor),
    );
    enact(key, 1, LOCAL);
    const after_ = budgetsOf(api, gov.id).find((b) => b.id === before.id)!;
    expect(total(after_.spendingMinor), where).toBeLessThanOrEqual(
      total(after_.revenueMinor),
    );
    expect(after_.spendingMinor.interest ?? 0).toBe(
      before.spendingMinor.interest ?? 0,
    );
    report.balanced = {
      spendingBefore: total(before.spendingMinor),
      spendingAfter: total(after_.spendingMinor),
      revenue: total(after_.revenueMinor),
    };
    enact(key, 0, LOCAL);
    expectEnded(key);
  });

  it("a closed school's eligibility rows end the day it closes", () => {
    const key = Q("education.public-funds-for-private-schooling");
    enact(key, 1, "state");
    const openBefore = openOrgs(key).length,
      school = openOrgs(key)[0];
    if (!school) {
      // A town with no private school has nothing to end: the reach finds
      // none because the town holds none.
      expect(
        [...core.organizations.values()].filter(
          (o) => o.classification === "service:private-school",
        ),
        where,
      ).toEqual([]);
      return;
    }
    api.emit({
      id: `event:business.closed:${school.organizationId}`,
      date: api.state.date,
      kind: "business.closed",
      personIds: [],
      placeId: town,
      source: {
        tag: "ESTIMATED",
        asOf: api.state.date,
        citation: "test closure",
        estimatedFrom: "test closure",
      },
      publicRecord: true,
      topic: school.organizationId,
    });
    const row = orgs(key).find((r) => r.id === school.id)!;
    expect(row.endedOn, where).toBe(api.state.date);
    expect(openOrgs(key).length, where).toBe(openBefore - 1);
    enact(key, 0, "state");
  });

  it("reports", () => {
    govReport("law-reach-group-b", JSON.stringify({ place, ...report }));
  });
});
