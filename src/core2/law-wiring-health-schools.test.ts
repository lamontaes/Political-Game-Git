/**
 * Health, assistance and schools laws wired end to end, in one played world:
 * Medicaid expansion (and its work requirement), the
 * assistance work requirement and the SNAP maximum, universal preschool,
 * public funds for private schooling and the teacher minimum salary, and the
 * health and hospitals, welfare and Medicaid, schools and higher education
 * lines. For each: who it reached (full people and counted groups) by the
 * applied or reach record that names them, the journal entry of the money
 * that moved (for Medicaid, a covered or uncovered member's medical bill),
 * the outcome-web effect, and that a repeal ends it. A place with
 * nobody the laws apply to is redrawn; every place tried is named in a
 * failure.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { govReport } from "./gov-test-report";
import { setJournalTrace } from "./journal-state";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn, appliedTo, type LawAppliedRow } from "./law-reach/applied";
import { allotments, foodAidDollars } from "./law-reach/group-b-food-aid";
import { jobsAt, source } from "./law-reach/group-b-money";
import {
  povertyLineDollars,
  reachParameter,
  selectResidents,
  townFacts,
  type PeopleSelector,
} from "./law-reach/group-b-people";
import { rowsOf, type PersonReach } from "./law-reach/group-b-store";
import { advanceCore } from "./life";
import {
  amendBudget,
  budgetsOf,
  fiscalYearOf,
  governments,
} from "./modules/budgets";
import {
  enactLaw,
  lawChain,
  lawInForce,
  LAWS_MODULE_ID,
  recordPublicPay,
} from "./modules/laws";
import { residentsRuntime } from "./modules/residents";
import { OUTCOME_WEB_MODULE_ID } from "./modules/outcome-web";
import { WEB_LINKS } from "./outcome-web-model";
import type { LawRowInput } from "./laws-starting";
import type { MedicalBillRow } from "./medical-bills";
import { COVERAGE_MODULE_ID } from "./modules/coverage";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";
import tuition from "./data/opening-private-tuition.json" with { type: "json" };
import reach from "./data/laws/reach-group-b.json" with { type: "json" };

const P = "us-policy-positions:";
const EXPAND = `${P}health-human-services.expand-medicaid-eligibility`;
const MEDICAID_WORK = `${P}health-human-services.medicaid-work-requirement`;
const ASSIST_WORK = `${P}health-human-services.work-requirement-for-assistance`;
const PRESCHOOL = `${P}education.universal-preschool`;
const VOUCHER = `${P}education.public-funds-for-private-schooling`;
const TEACHER = `${P}education.raise-teacher-minimum-salary`;
const QUESTIONS = [
  EXPAND,
  MEDICAID_WORK,
  ASSIST_WORK,
  PRESCHOOL,
  VOUCHER,
  TEACHER,
];
const LINES = [
  "healthAndHospitals",
  "welfareAndMedicaid",
  "schools",
  "higherEducation",
] as const;

const SEED = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const TRIES = 24;
const ENACTED_DAYS = 40;
const WORK_REQUIREMENT_DAYS = 10;
// The web links the test requires to fire, each from a law or line it holds.
const LAGGED_LINKS = [
  "medicaid-expansion-to-coverage",
  "medicaid-expansion-to-medical-debt",
  "work-requirement-to-coverage",
  "health-hospitals-spending-to-infant-mortality",
  "higher-education-spending-to-college-completion",
  "school-spending-to-attainment",
] as const;
// The slowest of them (the hospitals line, nine months) reads its cause as it
// stood that long before the web's own row day, so a hold needs the lag plus
// three rows to show it whatever day of the month the cause changed.
const HELD_MONTHS =
  Math.max(
    ...LAGGED_LINKS.map(
      (key) => WEB_LINKS.find((l) => l.key === key)?.lagMonths ?? 0,
    ),
  ) + 3;
const MODERATED_MONTHS = 3;
const DAYS_PER_MONTH = 30;
// Days after the opening within which the lines are read; the lowest government's fiscal year must not turn over before.
const LINE_READ_DAYS = 120;

interface Taken {
  readonly key: string;
  readonly governmentId: string;
  readonly recipientId: string;
  readonly obligationId: string;
}

/** Every journal post of the run: its id, source and day, and what it moved. */
const posts: { id: string; date: string; gross: number }[] = [];

const tomorrow = (api: CoreAPI) => addDays(makeIsoDate(api.state.date), 1);
const advance = (core: CoreState, days: number) =>
  advanceCore(core, addDays(makeIsoDate(core.date), days));

/** The latest row at each level of the town's chain says yes. */
function levelsSayingYes(api: CoreAPI, key: string) {
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  return lawChain(api).levels.filter(({ jurisdiction }) => {
    const latest = (
      laws.query("bySeries", [jurisdiction, key]) as unknown as LawRowInput[]
    )
      .filter((r) => r.effectiveDate <= api.state.date)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    return latest?.value === 1;
  });
}

/**
 * The latest row at each level of the town's chain, whatever its effective
 * date, says yes. The played world legislates on its own: a bill it has
 * already passed takes effect on its date, whatever the test did before it.
 */
function levelsHoldingYes(api: CoreAPI, key: string) {
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  return lawChain(api).levels.flatMap(({ level, jurisdiction }) => {
    const latest = [
      ...(laws.query("bySeries", [
        jurisdiction,
        key,
      ]) as unknown as LawRowInput[]),
    ].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    return latest?.value === 1
      ? [{ level, jurisdiction, effectiveDate: latest.effectiveDate }]
      : [];
  });
}

/**
 * Repeal at every level that says yes now or by a bill already passed (a
 * repeal that took effect before that bill would be undone by it, so it
 * takes effect the day after). Returns the day the last repeal takes effect.
 */
function repeal(api: CoreAPI, key: string, tag: string): string {
  let last: string = tomorrow(api);
  for (const { level, jurisdiction, effectiveDate } of levelsHoldingYes(
    api,
    key,
  )) {
    const day =
      effectiveDate > api.state.date
        ? addDays(makeIsoDate(effectiveDate), 1)
        : tomorrow(api);
    if (day !== tomorrow(api))
      console.info(
        `repeal of ${key} at the ${level} waits for a bill already passed, in force ${effectiveDate}; repeal takes effect ${day}`,
      );
    enactLaw(api, {
      jurisdiction,
      level,
      series: key,
      value: 0,
      effectiveDate: day,
      measureId: `health-schools-${tag}`,
      citation: "Health and schools test: repeal",
    });
    if (day > last) last = day;
  }
  return last;
}

/** Enact at the state, else the county, else the city (a level that may hold it). */
function enact(api: CoreAPI, key: string, tag: string): string {
  for (const level of ["state", "city", "county", "federal"] as const) {
    const at = lawChain(api).levels.find((l) => l.level === level);
    if (!at) continue;
    return enactLaw(api, {
      jurisdiction: at.jurisdiction,
      level,
      series: key,
      value: 1,
      effectiveDate: tomorrow(api),
      measureId: `health-schools-${tag}`,
      citation: "Health and schools test: enact",
    }).id;
  }
  throw new Error(`no level of the chain can enact ${key}`);
}

/** The budget a council's bill changes: the one of the town's lowest government (city, else county, else state). */
function lineBudget(api: CoreAPI) {
  const govs = governments(api);
  const gov =
    govs.find((g) => g.level === "city") ??
    govs.find((g) => g.level === "county") ??
    govs.find((g) => g.level === "state");
  const budget = gov
    ? [...budgetsOf(api, gov.id)].sort((a, b) => b.fiscalYear - a.fiscalYear)[0]
    : undefined;
  return gov && budget ? { gov, budget } : null;
}

/** A council's raise of a line: a twentieth of it (at least $100,000). A fifth, as the checker raises a line, leaves a large city's treasury, whose revenue only meets its spending, with nothing but its payroll to pay. */
const LINE_RAISE = 0.05;

/**
 * A council's budget bill, as the checker makes one: the line of the town's
 * lowest government that carries it goes up by LINE_RAISE (at least $100,000),
 * and the change carries into later years. The town has such a budget (the
 * opening records said so before play); a town without one never plays.
 */
function raiseLine(api: CoreAPI, line: string, tag: string): string {
  const held = lineBudget(api);
  if (!held) throw new Error(`no government budget carries the ${line} line`);
  const base = held.budget.spendingMinor[line] ?? 0;
  const measureId = `health-schools-${tag}`;
  amendBudget(api, {
    governmentId: held.gov.id,
    line,
    deltaMinor: Math.max(100_000_00, Math.round(base * LINE_RAISE)),
    measureId,
    carry: true,
  });
  return measureId;
}

/** The SNAP maximum raised a tenth by a federal act, on the row in force. */
function raiseSnapMaximum(api: CoreAPI, tag: string): string {
  const governing = lawInForce(api, "snap-maximum").governing;
  if (!governing?.value) throw new Error("no SNAP maximum row to raise");
  return enactLaw(api, {
    jurisdiction: governing.jurisdiction,
    level: governing.level,
    series: "snap-maximum",
    value: Math.round(governing.value * 1.1),
    effectiveDate: tomorrow(api),
    measureId: `health-schools-${tag}`,
    citation: "Health and schools test: the SNAP maximum raised a tenth",
    ...(governing.unit ? { unit: governing.unit } : {}),
    ...(governing.terms ? { terms: { ...governing.terms } } : {}),
  }).id;
}

/** Every month row the web recorded for any place, oldest first. */
function webMonths(api: CoreAPI) {
  return (
    api
      .moduleState(OUTCOME_WEB_MODULE_ID)
      .table("months")
      .rows() as unknown as readonly {
      id: string;
      date: string;
      effects: Record<string, number>;
      values: Record<string, number>;
      bases: Record<string, number>;
    }[]
  )
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** The id of the first month row whose effect on this link is not zero. */
function firedIn(api: CoreAPI, link: string): string | undefined {
  return webMonths(api).find((m) => (m.effects[link] ?? 0) !== 0)?.id;
}

/** Whether the town's households pay a private school, as named contracts or a counted flow. */
function hasTuition(core: CoreState, town: string): boolean {
  for (const c of core.finance.contracts.values())
    if (
      c.kind === tuition.contractKind &&
      !c.endedAt &&
      core.people.get(c.payerIds[0] ?? "")?.placeId === town
    )
      return true;
  for (const flow of residentsRuntime(core)?.flows.values() ?? [])
    if (
      flow.kind === "purchase" &&
      flow.financeKind === tuition.contractKind &&
      flow.placeId === town &&
      !flow.endedAt
    )
      return true;
  return false;
}

const POLICY = (
  reach as unknown as {
    policies: Record<string, { people?: PeopleSelector }>;
    budgetLines: Record<string, { people?: PeopleSelector }>;
  }
).policies;
const LINE_DEFS = (
  reach as unknown as {
    budgetLines: Record<string, { people?: PeopleSelector }>;
  }
).budgetLines;

/** The teacher minimum, in daily pay. */
const floorDaily = () =>
  (reachParameter("teacherMinimumSalaryDollars") * 100) / 365;

/** The town's covered teachers, as the pay floor engine selects them. */
const teachersOf = (api: CoreAPI) =>
  jobsAt(api, ["service:school"], "profession:teacher").filter(
    (j) => j.hourlyMinor && j.wageDailyMinor > 0,
  );

/**
 * Why this town cannot be played, from its opening records alone and decided
 * before anything is played: the law rows in force, the budgets, the tuition
 * contracts, the teachers' pay, and the residents each law selects on, read
 * through the engine's own selection (selectResidents with the policy's own
 * selector; the food benefit's own allotment and household test). Null when
 * every law has a subject. A town that passes plays, and a law that then
 * leaves no applied record fails the test on that town; it never redraws.
 */
function lacking(core: CoreState): string | null {
  const api = coreAPI(core);
  const chain = lawChain(api);
  if (
    !governments(api).some((g) => g.level === "state") ||
    !governments(api).some((g) => g.level === "federal")
  )
    return "no state or federal government";
  if (!lawInForce(api, "snap-maximum").governing?.value)
    return "no SNAP law in force";
  const lowest = lineBudget(api);
  if (!lowest) return "no government with a budget to carry the lines";
  // A line's raise is the service's base from the next fiscal year on, so the
  // lines are raised only where the year does not turn over before they are read.
  const opened = makeIsoDate(api.state.date);
  if (
    fiscalYearOf(
      addDays(opened, LINE_READ_DAYS),
      lowest.gov.fiscalYearStart,
    ) !== fiscalYearOf(opened, lowest.gov.fiscalYearStart)
  )
    return `the lowest government's fiscal year turns over within ${LINE_READ_DAYS} days of the opening`;
  if (!hasTuition(core, chain.townPlaceId))
    return "no private-school tuition contract";
  // The teacher minimum has something to raise only where it is not law yet
  // and a covered teacher is paid under it.
  if (levelsSayingYes(api, TEACHER).length)
    return "the teacher minimum is law at the opening (its raises are already made)";
  if (!teachersOf(api).some((j) => j.wageDailyMinor < floorDaily()))
    return "no covered teacher is paid under the teacher minimum";
  // The residents each law selects on.
  const facts = townFacts(api, chain.townPlaceId);
  const who = (selector: PeopleSelector) =>
    selectResidents(facts, selector, chain.stateKey);
  const people = (key: string) => POLICY[key]!.people!;
  const ends = new Set(who(people(MEDICAID_WORK)).map((r) => r.id));
  const covered = who(people(EXPAND));
  if (!covered.some((r) => ends.has(r.id)))
    return "no adult the Medicaid work requirement ends coverage for";
  const stays = covered.filter((r) => !ends.has(r.id));
  if (!stays.some((r) => r.named)) return "no named adult stays covered";
  if (
    stays
      .filter((r) => !r.named)
      .reduce((n, r) => n + (r.weight ?? 1) * (r.scale ?? 1), 0) <= 1
  )
    return "no counted adults stay covered";
  if (!who(people(PRESCHOOL)).some((r) => r.named))
    return "no named child of preschool age";
  const allotment = allotments(api);
  const drawers = allotment
    ? who({ householdHead: true }).filter((r) => {
        const h = facts.households.get(r.householdId);
        return (
          r.named &&
          h &&
          foodAidDollars(
            h,
            povertyLineDollars(chain.stateKey, h.size),
            allotment,
          ) > 0
        );
      })
    : [];
  if (!drawers.length) return "no named household draws the food benefit";
  const bound = new Set(who(people(ASSIST_WORK)).map((r) => r.id));
  if (!drawers.some((r) => bound.has(r.id)))
    return "no food benefit household head the assistance work requirement reaches";
  for (const line of LINES) {
    const selector = LINE_DEFS[line]?.people;
    if (selector && !who(selector).some((r) => r.named))
      return `no named resident the ${line} line reaches`;
  }
  return null;
}

/**
 * Plays an eligible town and asserts every law's record and money. A failure
 * is the test's, on this town: nothing here redraws.
 */
function play(where: string, seed: string, core: CoreState): void {
  posts.length = 0;
  const api = coreAPI(core);
  const accounts = api.accounts();
  const state = governments(api).find((g) => g.level === "state");
  const federal = governments(api).find((g) => g.level === "federal");
  if (!state || !federal) throw new Error(`${where}: no state or federal`);
  const floor = floorDaily();
  const teachers = () => teachersOf(api);
  const teachersBefore = new Map(
    teachers().map((j) => [j.id, j.hourlyMinor ?? 0]),
  );
  // The starting yeses are repealed first, so each law takes effect as a change.
  const baselineYes = new Map<string, boolean>();
  for (const q of QUESTIONS) {
    baselineYes.set(q, levelsSayingYes(api, q).length > 0);
    repeal(api, q, "open");
  }
  advance(core, 2);
  const enactedOn = api.state.date;
  // The Medicaid work requirement comes after the expansion's coverage has
  // priced a bill, so the coverage it ends was held first and the bill after
  // it is priced without it.
  const taken = () => rowsOf<Taken>(api, "taken");
  for (const q of QUESTIONS) if (q !== MEDICAID_WORK) enact(api, q, "on");
  // A council raises each of the four lines the day the laws are enacted, the
  // way the checker raises a line the day after the opening, so the first
  // monthly close pays it (a treasury pays what it holds, and a raised payroll
  // can leave a large city's nothing to pay the lines with a few months on).
  const raisedOn = api.state.date;
  for (const line of LINES) raiseLine(api, line, `raise-${line}`);
  advance(core, ENACTED_DAYS - WORK_REQUIREMENT_DAYS);
  // The coverage engine's medical bills, each household's latest month.
  const medicalBills = () =>
    api
      .moduleState(COVERAGE_MODULE_ID)
      .table("medicalBills")
      .rows() as unknown as MedicalBillRow[];
  // A bill paid since the day the expansion took effect, with a member the
  // expansion covers priced at Medicaid's share.
  const onMedicaid = () =>
    medicalBills().filter(
      (b) =>
        b.date > enactedOn &&
        b.journalIds.length > 0 &&
        b.members.some((m) => m.plan === "medicaid"),
    );
  for (
    let wait = 0;
    wait < 2 * DAYS_PER_MONTH && !onMedicaid().length;
    wait += 1
  )
    advance(core, 1);
  const expandBill =
    onMedicaid().find((b) => !b.counted) ?? onMedicaid()[0] ?? null;
  enact(api, MEDICAID_WORK, "on");
  const workOn = tomorrow(api);
  advance(core, WORK_REQUIREMENT_DAYS);
  // Then a bill day after the requirement took effect, so the coverage it
  // ended has priced a bill without Medicaid.
  for (
    let wait = 0;
    wait < 2 * DAYS_PER_MONTH && !medicalBills().some((b) => b.date > workOn);
    wait += 1
  )
    advance(core, 1);

  const open = (prefix: string) =>
    taken().filter(
      (r) => r.key === prefix && !accounts.obligation(r.obligationId)?.endedAt,
    );
  const paid = (rows: readonly Taken[]) =>
    rows.reduce(
      (n, r) => n + (accounts.obligation(r.obligationId)?.paidMinor ?? 0),
      0,
    );
  const say = (m: string) => `${where}: ${m}`;

  // Medicaid expansion: the reach keeps each covered adult's coverage, named
  // and counted, by person id, and pays the adult nothing for it; the
  // coverage engine prices a covered member's bill at Medicaid's share (and
  // the treasuries pay the seller Medicaid's part of the care).
  const coverage = rowsOf<{ key: string; personId: string; to: string | null }>(
    api,
    "coverage",
  ).filter((r) => r.key === EXPAND);
  expect(
    coverage.filter((r) => r.to === null).length,
    say("no one holds Medicaid coverage"),
  ).toBeGreaterThan(0);
  expect(
    taken().filter((t) => t.key.endsWith(`|${EXPAND}`)),
    say("Medicaid pays an adult a standing payment"),
  ).toEqual([]);
  expect(
    expandBill,
    say("no bill was priced at Medicaid's share and paid"),
  ).not.toBeNull();
  const covered = appliedOn(api, EXPAND);
  expect(covered.length, say("Medicaid reached no one")).toBeGreaterThan(0);
  // Each row cites a law row of the expansion's series.
  const lawsTable = api.moduleState(LAWS_MODULE_ID).table("laws");
  for (const r of covered)
    expect(
      (lawsTable.get(r.lawId) as unknown as LawRowInput | undefined)?.series,
      say(`${r.targetId} cites ${r.lawId}, not a Medicaid expansion row`),
    ).toBe(EXPAND);
  expect(
    covered.some((r) => r.target === "group" && r.count > 1),
    say("Medicaid reached no counted group"),
  ).toBe(true);

  // The Medicaid work requirement ends coverage for the adults it reaches.
  const ended = appliedOn(api, MEDICAID_WORK);
  // A town where every adult the requirement could reach works or owns a
  // business (an owner's hours count) has no subject for it: redrawn, never
  // skipped, like a town with no private school.
  if (!ended.length)
    return "the Medicaid work requirement reached no one (every adult it could reach works or owns a business)";
  for (const r of ended.filter((x) => x.target === "person"))
    expect(
      appliedTo(api, r.targetId).find((x) => x.key === EXPAND && !x.endedOn),
      say(`${r.targetId} lost coverage but the expansion still covers them`),
    ).toBeUndefined();

  // Preschool pays the household of each 3- and 4-year-old.
  const school = open(`preschool|${PRESCHOOL}`);
  expect(school.length, say("no open preschool payment")).toBeGreaterThan(0);
  expect(paid(school), say("preschool paid nothing")).toBeGreaterThan(0);
  const prek = appliedOn(api, PRESCHOOL);
  expect(prek.length, say("preschool reached no one")).toBeGreaterThan(0);
  expect(
    prek.reduce((n, r) => n + r.amountMinor, 0),
    say("preschool applied rows record no money"),
  ).toBeGreaterThan(0);

  // Vouchers follow the private tuition households pay.
  const vouchers = open(`voucher|${VOUCHER}`);
  expect(vouchers.length, say("no open voucher payment")).toBeGreaterThan(0);
  expect(paid(vouchers), say("vouchers paid nothing")).toBeGreaterThan(0);
  expect(
    appliedOn(api, VOUCHER).length,
    say("vouchers reached no one"),
  ).toBeGreaterThan(0);

  // SNAP: the maximum allotment sets the benefit; the assistance work
  // requirement is read for each person it reaches.
  const snap = open("benefit|snap-baseline");
  expect(snap.length, say("no open SNAP payment")).toBeGreaterThan(0);
  const snapRows = appliedOn(api, "snap-maximum");
  expect(snapRows.length, say("SNAP reached no one")).toBeGreaterThan(0);
  expect(
    snapRows.reduce((n, r) => n + r.amountMinor, 0),
    say("SNAP applied rows record no money"),
  ).toBeGreaterThan(0);
  expect(
    snapRows.every(
      (r) => r.lawId === lawInForce(api, "snap-maximum").governing?.id,
    ),
  ).toBe(true);
  expect(
    appliedOn(api, ASSIST_WORK).length,
    say("the assistance work requirement was read for no one"),
  ).toBeGreaterThan(0);

  // The teacher minimum: the pay floor engine raised every covered teacher
  // paid under it, and every covered teacher is on its record: a teacher with
  // a job record by name, the others (counted jobs) as one group per district.
  // The record is as of the last monthly review, and a counted teacher who
  // left or was hired since differs by one, so the engine's own review job
  // runs for today before the live teachers are read against it.
  recordPublicPay(api, source(api, "Teacher minimum salary review"));
  const covers = teachers();
  const raisedJobs = covers.filter(
    (j) => (j.hourlyMinor ?? 0) > (teachersBefore.get(j.id) ?? 0),
  );
  expect(raisedJobs.length, say("no teacher was raised")).toBeGreaterThan(0);
  for (const job of covers)
    expect(
      job.wageDailyMinor,
      say(`${job.id} is paid under the teacher minimum`),
    ).toBeGreaterThanOrEqual(Math.floor(floor));
  const teacherRows = appliedOn(api, TEACHER);
  for (const job of covers.filter((j) => core.jobs.has(j.id)))
    expect(
      teacherRows.some(
        (r) => r.target === "person" && r.targetId === job.personId,
      ),
      say(`teacher ${job.personId} is covered`),
    ).toBe(true);
  expect(
    teacherRows
      .filter((r) => r.target === "group")
      .reduce((n, r) => n + r.count, 0),
    say("counted teachers covered"),
  ).toBe(covers.filter((j) => !core.jobs.has(j.id)).length);

  // The record of each law: the applied record that names whom it reached,
  // and the journal entry of the money, by id. Taken now, while the laws
  // are in force (the hold below repeals the ones the place began with).
  const journalOf = (obligationId: string): string | null => {
    const r = accounts.obligation(obligationId)?.lastReceipt;
    return r && r.journalSequence !== undefined
      ? `journal:${r.date}:${r.journalSequence}`
      : null;
  };
  const members = (householdId: string) => [
    ...(core.households.get(householdId)?.memberIds ?? []),
  ];
  const chain: Record<
    string,
    { applied: string; reached: string; money: string | null }
  > = {};
  const record = (
    name: string,
    row: LawAppliedRow | undefined,
    money: string | null,
  ) => {
    expect(row, say(`${name}: no applied record`)).toBeDefined();
    expect(
      money,
      say(
        `${name}: no journal entry of its money (today ${api.state.date}, enacted ${enactedOn}; rows ${JSON.stringify(
          taken()
            .filter(
              (t) =>
                t.obligationId &&
                (String(t.key).includes(name.split(".").at(-1) ?? name) ||
                  String(t.key).startsWith("ended")),
            )
            .map((t) => {
              const o = accounts.obligation(t.obligationId);
              return [
                t.key.slice(0, 12),
                t.governmentId === federal.id ? "fed" : "state",
                String(t.recipientId).slice(-6),
                t.obligationId.slice(-10),
                o?.endedAt,
                o?.paidMinor,
                o?.lastReceipt?.date,
              ];
            })
            .slice(-24),
        )}; applied ${JSON.stringify(
          ended.map((r) => [r.target, String(r.targetId).slice(-6), r.what]),
        )})`,
      ),
    ).not.toBeNull();
    chain[name] = {
      applied: row!.id,
      reached: `${row!.target} ${row!.targetId}`,
      money,
    };
  };
  const moneyTo = (rowKey: string, reached: (id: string) => boolean) => {
    // The first payment of this kind to anyone reached that the journal has.
    for (const t of taken())
      if (t.key === rowKey && reached(t.recipientId)) {
        const entry = journalOf(t.obligationId);
        if (entry) return entry;
      }
    return null;
  };
  // The expansion's money: a covered member's bill, priced at Medicaid's
  // share and paid (its applied record names the member, or their group).
  const expandMember = expandBill?.members.find((m) => m.plan === "medicaid");
  const expandRow =
    covered.find(
      (r) => r.target === "person" && r.targetId === expandMember?.personId,
    ) ??
    (expandBill?.counted
      ? covered.find((r) => r.target === "group")
      : undefined);
  record(EXPAND, expandRow, expandBill?.journalIds[0] ?? null);
  // The coverage the requirement ends: its coverage records end, and the
  // member's next bill, priced without Medicaid, is the money it moved.
  const endedIds = new Set(
    coverage
      .filter((r) => r.to !== null && r.to >= workOn)
      .map((r) => r.personId),
  );
  const endedBill = medicalBills()
    .filter((b) => b.date > workOn && b.journalIds.length > 0)
    .sort((a, b) => Number(a.counted) - Number(b.counted))
    .find((b) =>
      b.members.some((m) => endedIds.has(m.personId) && m.plan !== "medicaid"),
    );
  const endedMember = endedBill?.members.find((m) => endedIds.has(m.personId));
  const endedRow =
    ended.find(
      (r) => r.target === "person" && r.targetId === endedMember?.personId,
    ) ??
    (endedBill?.counted ? ended.find((r) => r.target === "group") : undefined);
  record(MEDICAID_WORK, endedRow, endedBill?.journalIds[0] ?? null);
  const snapHousehold = snapRows.find(
    (r) =>
      r.target === "household" &&
      moneyTo("benefit|snap-baseline", (id) =>
        members(r.targetId).includes(id),
      ),
  );
  record(
    "snap-maximum",
    snapHousehold,
    moneyTo("benefit|snap-baseline", (id) =>
      members(snapHousehold?.targetId ?? "").includes(id),
    ),
  );
  const workRow = appliedOn(api, ASSIST_WORK).find(
    (r) => r.target === "person",
  );
  record(
    ASSIST_WORK,
    workRow,
    moneyTo("benefit|snap-baseline", (id) => id === workRow?.targetId) ??
      moneyTo(
        "benefit|budget-line:welfareAndMedicaid",
        (id) => id === workRow?.targetId,
      ) ??
      moneyTo(`ended|snap-baseline`, (id) => id === workRow?.targetId),
  );
  const prekHousehold = prek.find(
    (r) =>
      r.target === "household" &&
      moneyTo(`preschool|${PRESCHOOL}`, (id) =>
        members(r.targetId).includes(id),
      ),
  );
  record(
    PRESCHOOL,
    prekHousehold,
    moneyTo(`preschool|${PRESCHOOL}`, (id) =>
      members(prekHousehold?.targetId ?? "").includes(id),
    ),
  );
  // The household that pays private tuition: a named payer, else the counted
  // households of a group (their voucher goes to that group's fund account).
  const voucherPerson = appliedOn(api, VOUCHER).find(
    (r) =>
      r.target === "person" &&
      moneyTo(`voucher|${VOUCHER}`, (id) => id === r.targetId),
  );
  record(
    VOUCHER,
    voucherPerson ?? appliedOn(api, VOUCHER).find((r) => r.target === "group"),
    moneyTo(`voucher|${VOUCHER}`, (id) =>
      voucherPerson
        ? id === voucherPerson.targetId
        : id.startsWith("fund-account:"),
    ),
  );
  // A raised teacher's pay after the raise: a named teacher's payroll under
  // their commitment, a counted teacher's in the wage flow that pays the job.
  const rt = residentsRuntime(core);
  const payrollOf = (job: { id: string; personId: string }) => {
    const commitments = [
      ...(core.work.commitmentsByPerson.get(job.personId) ?? []),
    ].filter((id) => core.work.commitments.get(id)?.jobId === job.id);
    const flow = rt?.wageFlowByJob.get(job.id);
    return posts.find(
      (p) =>
        p.date > enactedOn &&
        p.gross > 0 &&
        ((p.id.includes(" work-payroll:") &&
          commitments.some((id) => p.id.includes(`${id}:`))) ||
          (flow && p.id.includes(flow.id))),
    )?.id;
  };
  const paidTeacher = raisedJobs.find((j) => payrollOf(j));
  const teacherPay = paidTeacher ? payrollOf(paidTeacher) : undefined;
  record(
    TEACHER,
    teacherRows.find(
      (r) =>
        r.target === "person" &&
        r.targetId === paidTeacher?.personId &&
        r.what === "raised-to-teacher-minimum",
    ) ?? teacherRows.find((r) => r.target === "group"),
    teacherPay ? (teacherPay.split(" ")[0] ?? null) : null,
  );

  // Congress raises the SNAP maximum, so that law's cause differs from its
  // baseline too.
  raiseSnapMaximum(api, "snap-raise");

  // Each line reached people and moved money: the reach record that names a
  // person it served (it ends when the fiscal year turns over, which is why
  // the town's year was judged before play, so the record stands), and the
  // journal entry of a payment out of the line.
  for (const line of LINES) {
    const reach = rowsOf<PersonReach>(api, "people").find(
      (r) => r.key === `budget-line:${line}` && r.since >= raisedOn,
    );
    expect(reach, say(`${line}: no person reached`)).toBeDefined();
    const money =
      moneyTo(
        "benefit|budget-line:welfareAndMedicaid",
        () => line === "welfareAndMedicaid",
      ) ??
      posts
        .find(
          (p) =>
            p.date > raisedOn &&
            p.gross > 0 &&
            p.id.includes(`budget-line:${line}`),
        )
        ?.id.split(" ")[0] ??
      null;
    expect(money, say(`${line}: no journal entry of its money`)).not.toBeNull();
    chain[`budget-line:${line}`] = {
      applied: reach!.id,
      reached: `person ${reach!.personId}`,
      money,
    };
  }

  // The work requirement's link reads the requirement only where the
  // expansion is law, both as they stood a lag ago, and the web's rows fall
  // on irregular days. Where the place began with the expansion the hold
  // repeals it, so the expansion stays three months (longer than any gap
  // between two rows) with the requirement before that repeal.
  const moderatedMonths = baselineYes.get(EXPAND) ? MODERATED_MONTHS : 0;

  // Hold every law a different way from where the place began (laws it
  // already had are repealed, the others stay) so each link's cause differs
  // from its baseline, and wait out the lag of the slowest link.
  // The played world legislates on its own (a bill may repeal a question
  // mid-run), so each month the held state is set again where a bill moved it.
  for (let month = 0; month < HELD_MONTHS + moderatedMonths; month += 1) {
    for (const q of QUESTIONS) {
      if (q === EXPAND && month < moderatedMonths) continue;
      const saysYes = levelsSayingYes(api, q).length > 0;
      if (baselineYes.get(q) && saysYes) repeal(api, q, `hold-${month}`);
      if (!baselineYes.get(q) && !saysYes) enact(api, q, `hold-${month}`);
    }
    advance(core, DAYS_PER_MONTH);
  }
  for (const link of LAGGED_LINKS)
    expect(
      firedIn(api, link),
      say(
        `the web link ${link} never fired (baseline yes: ${JSON.stringify([...baselineYes])}; rows ${JSON.stringify(
          webMonths(api).map((m) => [
            m.date,
            m.values[`law:${MEDICAID_WORK}`],
            m.values[`law:${EXPAND}`],
            m.effects[link],
          ]),
        )}; date ${api.state.date})`,
      ),
    ).toBeTruthy();
  // The assistance work requirement is the SNAP benefit's own (read above, for
  // each person it reaches), so the web does not also cut SNAP receipt for it.
  expect(
    firedIn(api, "snap-work-requirement-to-participation"),
    say("the web ran the SNAP work requirement link the benefit carries"),
  ).toBeUndefined();
  // The SNAP maximum's link is carried by the benefit it sets and the food the
  // household buys with it (links.json carriedBy), so the web does not run it.
  expect(
    firedIn(api, "snap-maximum-to-food-insecurity"),
    say("the web ran the SNAP maximum link the benefit and purchases carry"),
  ).toBeUndefined();

  govReport(
    "law-wiring-health-schools",
    JSON.stringify({ seed, place: where, enactedOn, raisedOn, chain }),
  );

  // Repeal ends every payment, every coverage record and every applied row.
  let lastRepeal: string = tomorrow(api);
  for (const q of QUESTIONS) {
    const day = repeal(api, q, "off");
    if (day > lastRepeal) lastRepeal = day;
  }
  advanceCore(core, addDays(makeIsoDate(lastRepeal), 3));
  for (const q of QUESTIONS) {
    const lawsTable = api.moduleState(LAWS_MODULE_ID).table("laws");
    const left = appliedOn(api, q);
    expect(
      left.length,
      say(
        `${q} still applies after repeal (date ${api.state.date}); open: ${left
          .slice(0, 3)
          .map(
            (r) =>
              `${r.id} law ${r.lawId} ${r.what} since ${r.since} last ${r.lastOn} x${r.times} n${r.count}`,
          )
          .join(" | ")}; law rows: ${lawChain(api)
          .levels.map(
            ({ level, jurisdiction }) =>
              `${level}[${(
                lawsTable.query("bySeries", [
                  jurisdiction,
                  q,
                ]) as unknown as LawRowInput[]
              )
                .map((r) => `${r.id}@${r.effectiveDate}=${r.value}`)
                .join(",")}]`,
          )
          .join(" ")}`,
      ),
    ).toBe(0);
  }
  expect(
    rowsOf<{ key: string; to: string | null }>(api, "coverage").filter(
      (r) => r.key === EXPAND && r.to === null,
    ).length,
    say("Medicaid still covers"),
  ).toBe(0);
  expect(
    open(`preschool|${PRESCHOOL}`).length,
    say("preschool still pays"),
  ).toBe(0);
  expect(open(`voucher|${VOUCHER}`).length, say("vouchers still pay")).toBe(0);
}

it("health, assistance and school laws reach people, move money and move outcomes", () => {
  setBookkeeping(false);
  setJournalTrace((input) => {
    let gross = 0;
    for (const p of input.postings) if (p.deltaMinor > 0) gross += p.deltaMinor;
    posts.push({
      id: `${input.id} ${input.sourceRef.id}`,
      date: input.date,
      gross,
    });
  });
  const tried: string[] = [];
  try {
    for (let n = 0; n < TRIES; n += 1) {
      // GOLDEN_PATH_PLACE_KEY and GOLDEN_PATH_WORLD_SEED pin one place's world.
      const draw = process.env.GOLDEN_PATH_PLACE_KEY
        ? {
            name: "pinned place",
            state: "pinned",
            key: process.env.GOLDEN_PATH_PLACE_KEY,
            seed: process.env.GOLDEN_PATH_WORLD_SEED ?? SEED,
          }
        : drawPlace(SEED, `law-wiring-health-schools-${n}`);
      const where = `${draw.name} (${draw.state}, ${draw.key}), seed ${draw.seed}`;
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      // A town is redrawn only on its opening records, before anything is
      // played; once it is judged eligible it plays, and a law with no
      // applied record then fails the test on this town.
      const why = lacking(core);
      if (why !== null) {
        tried.push(`${where}: ${why}`);
        console.info(`redrawn on opening records: ${where}: ${why}`);
        continue;
      }
      console.info(`playing: ${where}`);
      play(where, draw.seed, core);
      return;
    }
    throw new Error(
      `no drawn place had a subject for these laws:\n${tried.join("\n")}`,
    );
  } finally {
    setJournalTrace(null);
    setBookkeeping(true);
  }
}, 1_200_000); // A town that lacks a subject costs only its world (about 65 s); one that plays also spends its 240 played days.
