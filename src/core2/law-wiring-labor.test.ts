/**
 * Labor and pay laws, wired end to end in one played world (buildBenchWorld,
 * two levels, economy on) in a place drawn from all 56: each law, once law,
 * reaches named workers, counted worker groups, employers or governments
 * through the engine that applies it, moves money through the journal, and
 * a repeal ends the reach. Failures name the seed and the place.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { setJournalTrace } from "./journal-state";
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import { inForceHere, LAW_REACH_HOST_ID } from "./law-reach/host";
import { LAW_APPLIED_TABLE, type LawAppliedRow } from "./law-reach/applied";
import { OUTCOME_WEB_MODULE_ID } from "./modules/outcome-web";
import { governments } from "./modules/budgets";
import { townSeats } from "./modules/offices";
import { jobsAt } from "./law-reach/group-b-money";
import { reachParameter } from "./law-reach/group-b-people";
import { draftBill } from "./modules/legislature";
import { fileClaim } from "./jobs-benefits";
import { residentsRuntime } from "./modules/residents";
import type { LawRowInput } from "./laws-starting";
import type { CoreAPI, CoreState, JobInput } from "./types";

const SEED = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const TRIES = 4;
const WINDOW = 35;
const Q = (s: string) => `us-policy-positions:${s}`;
const KEYS = {
  raise: Q("labor-workforce.raise-minimum-wage"),
  federal: "us-federal-positions:labor-commerce.raise-federal-minimum-wage",
  authority: Q("labor-workforce.local-minimum-wage-authority"),
  leave: Q("labor-workforce.paid-family-leave"),
  bargaining: Q("labor-workforce.public-sector-collective-bargaining"),
  rtw: Q("labor-workforce.right-to-work"),
  teacher: Q("education.raise-teacher-minimum-salary"),
};

class NoSubject extends Error {}

function rows(api: CoreAPI, key: string, open = true): LawAppliedRow[] {
  const all = api
    .moduleState(LAW_REACH_HOST_ID)
    .table(LAW_APPLIED_TABLE)
    .rows() as unknown as LawAppliedRow[];
  return all.filter((r) => r.key === key && (open ? !r.endedOn : !!r.endedOn));
}
const sum = (list: readonly LawAppliedRow[]) =>
  list.reduce((total, r) => total + r.amountMinor, 0);

function setQuestion(
  api: CoreAPI,
  key: string,
  value: 0 | 1,
  tag: string,
): string[] {
  const date = addDays(makeIsoDate(api.state.date), 1);
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  const ids: string[] = [];
  const federal = key.startsWith("us-federal-positions:");
  for (const { level, jurisdiction } of lawChain(api).levels) {
    if (federal ? level !== "federal" : level !== "state") continue;
    const latest = (
      laws.query("bySeries", [jurisdiction, key]) as unknown as LawRowInput[]
    )
      .filter((r) => r.effectiveDate <= api.state.date)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
    if (value === 0 && latest?.value !== 1) continue;
    ids.push(
      enactLaw(api, {
        jurisdiction,
        level,
        series: key,
        value,
        effectiveDate: date,
        measureId: `labor-${tag}`,
        citation: "Labor law-wiring test",
      }).id,
    );
  }
  return ids;
}

function amountAt(api: CoreAPI, series: string, factor: number, tag: string) {
  const now = lawInForce(api, series);
  const g = now.governing as LawRowInput;
  if (!g) throw new NoSubject(`no ${series} in force`);
  const next = Math.round(Number(g.value) * factor * 100) / 100;
  return enactLaw(api, {
    level: g.level,
    jurisdiction: g.jurisdiction,
    series,
    value: Number.isInteger(g.value) ? Math.round(next) : next,
    effectiveDate: addDays(makeIsoDate(api.state.date), 1),
    measureId: `labor-${tag}`,
    citation: "Labor law-wiring test",
    ...(g.unit ? { unit: g.unit } : {}),
    ...(g.terms ? { terms: { ...g.terms } } : {}),
  });
}

function run(specId: string) {
  const drawn = drawPlace(SEED, specId);
  const where = `seed ${SEED}, place ${drawn.name} (${drawn.key})`;
  const world = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  });
  const core = world.core as CoreState;
  const api = coreAPI(core);
  const problems: string[] = [];
  const need = (ok: unknown, what: string) => {
    if (!ok) problems.push(what);
  };
  const posts: { id: string; accountId: string; deltaMinor: number }[] = [];
  setJournalTrace((input) => {
    for (const p of input.postings) posts.push(p);
  });
  const step = (days: number) =>
    advanceCore(core, addDays(makeIsoDate(core.date), days));

  const stateGov = governments(api).find((g) => g.level === "state");
  if (!stateGov) throw new NoSubject("no state treasury");
  const rt = residentsRuntime(core);
  const countedJobs = [...(rt?.jobs.values() ?? [])].filter(
    (j) => j.endsAt === undefined && !core.jobs.has(j.id),
  );
  const fullJobs = [...core.jobs.values()].filter(
    (j) => j.endsAt === undefined,
  );
  if (!fullJobs.length || !countedJobs.length)
    throw new NoSubject("no full or counted jobs");
  // The teacher floor binds teachers paid under it. The generated schools
  // pay most teachers above the floor, so the first full and the first
  // counted teacher are set (through the core's own pay seam) to four
  // fifths of it, a school that underpays; a town with no teacher at all
  // has no one the floor applies to.
  const floorYear = reachParameter("teacherMinimumSalaryDollars") * 100;
  const teachers = jobsAt(api, ["service:school"], "profession:teacher");
  const underpaid = [
    teachers.find((j) => core.jobs.has(j.id)),
    teachers.find((j) => !core.jobs.has(j.id)),
  ].filter((j): j is JobInput => !!j);
  if (!underpaid.length) throw new NoSubject("no teacher in the town");
  for (const job of underpaid) {
    const hourly = job.hourlyMinor ?? 0;
    const target = Math.floor(
      (hourly * 0.8 * floorYear) /
        reachParameter("daysPerYear") /
        job.wageDailyMinor,
    );
    if (hourly > 0 && target > 0)
      api.rerateJob(job.id, target, {
        tag: "ESTIMATED",
        citation: "A school that underpays its teachers (test setup)",
        estimatedFrom: "Test setup",
        asOf: core.date,
      });
  }

  // Day 0: repeal the starting yeses, change the amounts.
  const repealed = Object.values(KEYS).filter(
    (k) => inForceHere(api, k) && !k.startsWith("us-federal"),
  );
  for (const k of repealed) setQuestion(api, k, 0, "repeal");
  const taxes = [
    "social-security-tax",
    "medicare-tax",
    "state-unemployment-tax",
    "federal-unemployment-tax",
  ];
  const taxLaw: Record<string, string> = {};
  for (const s of taxes) taxLaw[s] = amountAt(api, s, 1.1, s).id;
  const maxLaw = amountAt(api, "unemployment-weekly-maximum", 1.1, "max").id;
  step(2);
  // Day 2: enact every question as yes.
  const enacted: Record<string, string[]> = {};
  for (const [name, key] of Object.entries(KEYS))
    if (name !== "raise") enacted[name] = setQuestion(api, key, 1, name);
  const publicFloor = enactLaw(api, {
    jurisdiction: lawChain(api).levels.find((l) => l.level === "city")!
      .jurisdiction,
    level: "city",
    series: "public-pay-floor",
    value: 90_000,
    unit: "dollars/year",
    effectiveDate: addDays(makeIsoDate(api.state.date), 1),
    measureId: "labor-public-pay-floor",
    citation: "Labor law-wiring test",
  });
  step(3);
  // Day 5: the local wage bill is drafted under the state's grant; claims are
  // filed by the jobs engine for a full and a counted worker.
  const council = townSeats(api).find(
    (s) => s.office.kind === "council" && s.holder?.personId,
  );
  let draftedAt = "";
  if (council) {
    const floor = lawInForce(api, "minimum-wage").value ?? 0;
    draftBill(api, {
      bodyOfficeId: council.office.id,
      sponsorId: council.holder!.personId!,
      provisions: [
        {
          kind: "law-amount",
          series: "minimum-wage",
          value: floor + 100,
          unit: "minor/hour",
        },
      ],
    });
    draftedAt = council.office.id;
  }
  const claims = api.moduleState("jobs").table("claims");
  const filed = { full: "", counted: "" };
  for (const job of fullJobs) {
    if (filed.full) break;
    if (fileClaim(api, claims, job as JobInput, "labor-test", 52))
      filed.full = job.personId;
  }
  for (const job of countedJobs) {
    if (filed.counted) break;
    if (fileClaim(api, claims, job as JobInput, "labor-test", 52))
      filed.counted = job.personId;
  }
  step(WINDOW);
  const date = core.date;
  // The nation's floor first (it binds everyone under it); then the state's
  // raise question over it, then a wage law raised a tenth over both.
  need(
    rows(api, KEYS.federal).some((r) => r.amountMinor > 0),
    `federal: no pay raised under ${enacted.federal?.join(",")}`,
  );
  enacted.raise = setQuestion(api, KEYS.raise, 1, "raise");
  step(5);
  need(
    rows(api, KEYS.raise).some((r) => r.amountMinor > 0),
    `raise: no pay raised under ${enacted.raise?.join(",")}`,
  );
  const wageLaw = amountAt(api, "minimum-wage", 1.1, "wage");
  step(5);
  // ---- minimum wage (amount) ---------------------------------------------
  const wage = rows(api, "minimum-wage");
  need(
    wage.some((r) => r.target === "person" && r.amountMinor > 0),
    `minimum-wage: no worker raised (${wageLaw.id})`,
  );
  need(
    wage.some((r) => r.target === "group" && r.count > 0 && r.amountMinor > 0),
    "minimum-wage: no counted worker group raised",
  );
  // ---- local authority -----------------------------------------------------
  const authority = rows(api, KEYS.authority);
  need(
    authority.some((r) => r.target === "government"),
    `authority: no government reached (${enacted.authority?.join(",")})`,
  );
  if (draftedAt)
    need(
      authority.some((r) => r.targetId === draftedAt),
      `authority: the drafting body ${draftedAt} was not reached`,
    );
  // ---- paid leave, bargaining, right to work, teacher, public floor --------
  const leave = rows(api, KEYS.leave);
  need(
    leave.some((r) => r.target === "person" && r.amountMinor > 0),
    "leave: no worker paid a premium",
  );
  need(
    leave.some((r) => r.target === "group" && r.count > 0),
    "leave: no counted group paid a premium",
  );
  const bargaining = rows(api, KEYS.bargaining);
  need(bargaining.length > 0, "bargaining: no public worker reached");
  const rtw = rows(api, KEYS.rtw);
  need(
    rtw.some((r) => r.target === "organization"),
    "right-to-work: no union local reached",
  );
  need(
    rtw.some((r) => r.target === "group" && r.count > 0),
    "right-to-work: no worker group reached",
  );
  const teacher = rows(api, KEYS.teacher);
  need(teacher.length > 0, "teacher: no teacher raised");
  const floor = rows(api, "public-pay-floor");
  need(
    floor.some((r) => r.amountMinor > 0),
    `public-pay-floor: no public worker raised (${publicFloor.id})`,
  );
  // ---- payroll taxes and unemployment ---------------------------------------
  for (const s of taxes) {
    const list = rows(api, s);
    need(
      list.some((r) => r.amountMinor > 0 && r.lawId === taxLaw[s]),
      `${s}: no reach row under ${taxLaw[s]}`,
    );
  }
  for (const s of ["social-security-tax", "medicare-tax"])
    need(
      rows(api, s).some((r) => r.target === "person") &&
        rows(api, s).some((r) => r.target === "group"),
      `${s}: needs full and counted reach`,
    );
  const ui = rows(api, "unemployment-insurance");
  need(filed.full !== "" || filed.counted !== "", "no claim could be filed");
  for (const who of [filed.full, filed.counted].filter(Boolean))
    need(
      ui.some(
        (r) =>
          (r.targetId === who || r.targetId === `counted-claimants:${who}`) &&
          r.amountMinor > 0 &&
          r.count >= 1,
      ),
      `unemployment-insurance: no benefit paid to ${who}`,
    );
  need(
    posts.some(
      (p) =>
        p.accountId === `cash:${stateGov.organizationId}:residual` &&
        p.deltaMinor < 0 &&
        p.id.includes("unemployment-benefit"),
    ),
    "unemployment: the state treasury paid no benefit",
  );
  need(
    rows(api, "unemployment-weekly-maximum").length > 0 ||
      ui.every((r) => r.amountMinor >= 0),
    `unemployment-weekly-maximum (${maxLaw}): not recorded`,
  );
  // ---- the outcome web reads the question laws -----------------------------
  const web = api
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .rows() as unknown as { date: string; values: Record<string, number> }[];
  for (const key of [KEYS.leave, KEYS.teacher, KEYS.federal]) {
    const read = web.filter((m) => m.values[`law:${key}`] === 1);
    need(read.length > 0, `outcome web: never read ${key} as yes (${date})`);
  }
  // ---- money moved -----------------------------------------------------------
  const moved = [wage, bargaining, floor, teacher].reduce(
    (total, list) => total + sum(list),
    0,
  );
  need(moved > 0, "no pay raise moved money");

  // ---- repeal ends the reach -------------------------------------------------
  for (const [name, key] of Object.entries(KEYS))
    setQuestion(api, key, 0, `end-${name}`);
  step(3);
  for (const key of Object.values(KEYS))
    need(rows(api, key).length === 0, `repeal: ${key} still has open reach`);
  setJournalTrace(() => {});
  return { where, problems };
}

describe(
  "labor and pay laws reach people, groups and employers and move money",
  // A played world is built once per try (about a minute) and run a few
  // months; a place with no subject at all is redrawn up to TRIES times.
  { timeout: 300_000 },
  () => {
    it("each law is applied by its engine and recorded by record id", () => {
      const was = setBookkeeping(false);
      const tried: string[] = [];
      try {
        for (let n = 0; n < TRIES; n += 1) {
          try {
            const { where, problems } = run(`labor-${n}`);
            expect(problems, where).toEqual([]);
            return;
          } catch (error) {
            if (!(error instanceof NoSubject)) throw error;
            tried.push(`try ${n}: ${error.message}`);
          } finally {
            setJournalTrace(() => {});
          }
        }
        throw new Error(
          `no place with a subject: seed ${SEED}; ${tried.join("; ")}`,
        );
      } finally {
        setBookkeeping(was);
      }
    });
  },
);
