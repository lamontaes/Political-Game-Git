/**
 * Health, assistance and schools laws wired end to end, in one played world:
 * Medicaid expansion (and its work requirement and federal match), the
 * assistance work requirement and the SNAP maximum, universal preschool,
 * public funds for private schooling, and the schools and health budget
 * lines. For each: who it reached (full people and counted groups), the
 * payment that applied it and the money that moved, the outcome-web effect,
 * and that a repeal ends it. A place with nobody the laws apply to is
 * redrawn; every place tried is named in a failure.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { govMeasure } from "./gov-measures";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn, appliedTo } from "./law-reach/applied";
import { rowsOf } from "./law-reach/group-b-store";
import { advanceCore } from "./life";
import { amendBudget, budgetsOf, governments } from "./modules/budgets";
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import { residentsRuntime } from "./modules/residents";
import { OUTCOME_WEB_MODULE_ID } from "./modules/outcome-web";
import type { LawRowInput } from "./laws-starting";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";
import tuition from "./data/opening-private-tuition.json" with { type: "json" };

const P = "us-policy-positions:";
const EXPAND = `${P}health-human-services.expand-medicaid-eligibility`;
const MEDICAID_WORK = `${P}health-human-services.medicaid-work-requirement`;
const ASSIST_WORK = `${P}health-human-services.work-requirement-for-assistance`;
const PRESCHOOL = `${P}education.universal-preschool`;
const VOUCHER = `${P}education.public-funds-for-private-schooling`;
const QUESTIONS = [EXPAND, MEDICAID_WORK, ASSIST_WORK, PRESCHOOL, VOUCHER];

const SEED = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const TRIES = 12;
const ENACTED_DAYS = 40;
const HELD_MONTHS = 8;
const DAYS_PER_MONTH = 30;

interface Taken {
  readonly key: string;
  readonly governmentId: string;
  readonly recipientId: string;
  readonly obligationId: string;
}

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

function repeal(api: CoreAPI, key: string, tag: string) {
  for (const { level, jurisdiction } of levelsSayingYes(api, key))
    enactLaw(api, {
      jurisdiction,
      level,
      series: key,
      value: 0,
      effectiveDate: tomorrow(api),
      measureId: `health-schools-${tag}`,
      citation: "Health and schools test: repeal",
    });
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

/** A government that carries this budget line with money in it. */
function lineGovernment(api: CoreAPI, line: string) {
  const order = ["city", "county", "state"];
  return governments(api)
    .filter((g) => order.includes(g.level))
    .sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level))
    .find((g) => {
      const budget = [...budgetsOf(api, g.id)].sort(
        (x, y) => y.fiscalYear - x.fiscalYear,
      )[0];
      return (budget?.spendingMinor[line] ?? 0) > 0;
    });
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

/** Returns why this place has no subject, or null after every assertion holds. */
function tryPlace(where: string, seed: string, key: string): string | null {
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
  });
  const api = coreAPI(core);
  const accounts = api.accounts();
  const state = governments(api).find((g) => g.level === "state");
  const federal = governments(api).find((g) => g.level === "federal");
  if (!state || !federal) return "no state or federal government";
  if (!lawInForce(api, "snap-maximum").value) return "no SNAP law in force";
  if (!hasTuition(core, lawChain(api).townPlaceId))
    return "no private-school tuition contract";
  const schools = lineGovernment(api, "schools");
  const health = lineGovernment(api, "healthAndHospitals");
  if (!schools || !health)
    return "no government carries the schools or health line";

  // The starting yeses are repealed first, so each law takes effect as a change.
  const baselineYes = new Map<string, boolean>();
  for (const q of QUESTIONS) {
    baselineYes.set(q, levelsSayingYes(api, q).length > 0);
    repeal(api, q, "open");
  }
  advance(core, 2);
  for (const q of QUESTIONS) enact(api, q, "on");
  const amend = (gov: { id: string }, line: string) => {
    const budget = [...budgetsOf(api, gov.id)].sort(
      (a, b) => b.fiscalYear - a.fiscalYear,
    )[0]!;
    amendBudget(api, {
      governmentId: gov.id,
      line,
      deltaMinor: Math.max(
        100_000_00,
        Math.round(budget.spendingMinor[line]! * 0.2),
      ),
      measureId: `health-schools-${line}`,
    });
  };
  amend(schools, "schools");
  amend(health, "healthAndHospitals");
  advance(core, ENACTED_DAYS);

  const taken = () => rowsOf<Taken>(api, "taken");
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

  // Medicaid expansion: paid by the state and, at the match in force, the
  // federal treasury; reach is the covered adults, named and counted.
  const coverage = open(`coverage|${EXPAND}`);
  expect(coverage.length, say("no open Medicaid payment")).toBeGreaterThan(0);
  expect(paid(coverage), say("Medicaid paid nothing")).toBeGreaterThan(0);
  expect(
    coverage.some((r) => r.governmentId === state.id),
    say("the state pays no share"),
  ).toBe(true);
  const match = lawInForce(api, "medicaid-match");
  if ((match.value ?? 0) > 0)
    expect(
      coverage.some((r) => r.governmentId === federal.id),
      say(`the federal share (match ${match.value}) is not paid`),
    ).toBe(true);
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
  expect(
    covered.reduce((n, r) => n + r.amountMinor, 0),
    say("Medicaid applied rows record no money"),
  ).toBeGreaterThan(0);
  const matchRows = appliedOn(api, "medicaid-match");
  if ((match.value ?? 0) > 0)
    expect(
      matchRows.some((r) => r.targetId === federal.id),
      say("the match law was not read when the federal share was paid"),
    ).toBe(true);

  // The Medicaid work requirement ends coverage for the adults it reaches.
  const ended = appliedOn(api, MEDICAID_WORK);
  expect(
    ended.length,
    say("the Medicaid work requirement reached no one"),
  ).toBeGreaterThan(0);
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

  // The budget lines: the schools line moves spending per student in the web.
  const schoolsPct = govMeasure(api, "budget.schools-added-pct");
  const healthPct = govMeasure(api, "budget.healthAndHospitals-added-pct");
  expect(schoolsPct ?? 0, say("schools line change not read")).toBeGreaterThan(
    0,
  );
  expect(healthPct ?? 0, say("health line change not read")).toBeGreaterThan(0);
  const spendingMonth = webMonths(api).at(-1)!;
  expect(
    spendingMonth.values["school.spending-per-student"],
    say("per-student spending did not rise with the schools line"),
  ).toBeGreaterThan(spendingMonth.bases["school.spending-per-student"]!);
  expect(
    firedIn(api, "schools-spending-to-spending-per-student"),
    say("the schools link did not fire"),
  ).toBeTruthy();

  // Hold every law a different way from where the place began (laws it
  // already had are repealed, the others stay) so each link's cause differs
  // from its baseline, and wait out the 6-month lag of the slower links.
  // The played world legislates on its own (a bill may repeal a question
  // mid-run), so each month the held state is set again where a bill moved it.
  for (let month = 0; month < HELD_MONTHS; month += 1) {
    for (const q of QUESTIONS) {
      const saysYes = levelsSayingYes(api, q).length > 0;
      if (baselineYes.get(q) && saysYes) repeal(api, q, `hold-${month}`);
      if (!baselineYes.get(q) && !saysYes) enact(api, q, `hold-${month}`);
    }
    advance(core, DAYS_PER_MONTH);
  }
  const lags = [
    ["medicaid-expansion-to-coverage"],
    ["medicaid-expansion-to-medical-debt"],
    ["work-requirement-to-coverage"],
    ["snap-work-requirement-to-participation"],
  ];
  for (const [link] of lags)
    expect(
      firedIn(api, link!),
      say(
        `the web link ${link} never fired (baseline yes: ${JSON.stringify([...baselineYes])}; last month ${JSON.stringify(webMonths(api).at(-1)?.values)}; date ${api.state.date})`,
      ),
    ).toBeTruthy();

  // Repeal ends every payment and every applied row.
  for (const q of QUESTIONS) repeal(api, q, "off");
  advance(core, 3);
  for (const q of QUESTIONS)
    expect(
      appliedOn(api, q).length,
      say(`${q} still applies after repeal`),
    ).toBe(0);
  expect(open(`coverage|${EXPAND}`).length, say("Medicaid still pays")).toBe(0);
  expect(
    open(`preschool|${PRESCHOOL}`).length,
    say("preschool still pays"),
  ).toBe(0);
  expect(open(`voucher|${VOUCHER}`).length, say("vouchers still pay")).toBe(0);
  return null;
}

it("health, assistance and school laws reach people, move money and move outcomes", () => {
  setBookkeeping(false);
  const tried: string[] = [];
  try {
    for (let n = 0; n < TRIES; n += 1) {
      const draw = drawPlace(SEED, `law-wiring-health-schools-${n}`);
      const where = `${draw.name} (${draw.state}, ${draw.key}), seed ${draw.seed}`;
      const why = tryPlace(where, draw.seed, draw.key);
      if (why === null) return;
      tried.push(`${where}: ${why}`);
    }
    throw new Error(
      `no drawn place had a subject for these laws:\n${tried.join("\n")}`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000); // limit leaves room for a redraw when a place has no subject. // Building a world takes about 65 s and the played span is 240 days; the
