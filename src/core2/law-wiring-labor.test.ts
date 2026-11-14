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
import {
  enactLaw,
  lawChain,
  lawInForce,
  LAWS_MODULE_ID,
  yesLevels,
} from "./modules/laws";
import { LAW_REACH_HOST_ID } from "./law-reach/host";
import { LAW_APPLIED_TABLE, type LawAppliedRow } from "./law-reach/applied";
import { OUTCOME_WEB_MODULE_ID } from "./modules/outcome-web";
import { governments } from "./modules/budgets";
import { townSeats } from "./modules/offices";
import { jobsAt } from "./law-reach/group-b-money";
import { reachParameter } from "./law-reach/group-b-people";
import { reachParameter as reachA } from "./law-reach/group-a-records";
import { draftBill } from "./modules/legislature";
import { fileClaim } from "./jobs-benefits";
import { REACH_A_MODULE_ID } from "./law-reach/group-a-records";
import { residentsRuntime } from "./modules/residents";
import type { LawRowInput } from "./laws-starting";
import type { CoreAPI, CoreState, JobInput } from "./types";

const SEED = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
/** Every law here needs its subject in the drawn town (a worker under the federal floor, a seated council member, a teacher, a full and a counted claimant, a claimant above the weekly maximum), so a draw often has none. */
const TRIES = 10;
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

/**
 * One law (or the laws one subject serves) per test. Each test builds only the
 * subject its law needs, so a draw is redrawn only for that one subject:
 * a worker under the federal floor (wage), a seated council member
 * (authority), an underpaying school (teacher), a full and a counted claimant
 * (claims) and a claimant above the weekly maximum (maximum).
 */
const SUBJECTS = {
  wage: "the federal and state minimum wage and the wage law over them",
  authority: "the local minimum wage authority",
  leave: "paid family leave",
  bargaining: "public sector collective bargaining",
  rtw: "right to work",
  teacher: "the teacher minimum salary",
  taxes: "the four payroll taxes",
  claims: "unemployment insurance claims",
  maximum: "the unemployment weekly maximum",
} as const;
type Subject = keyof typeof SUBJECTS;
/** The question each subject's repeal is checked on. */
const QUESTION_OF: Partial<Record<Subject, readonly string[]>> = {
  wage: [KEYS.raise, KEYS.federal],
  authority: [KEYS.authority],
  leave: [KEYS.leave],
  bargaining: [KEYS.bargaining],
  rtw: [KEYS.rtw],
  teacher: [KEYS.teacher],
};

interface JournalEntry {
  readonly id: string;
  readonly date: string;
  readonly kind: string;
  readonly sourceId: string;
  readonly postings: readonly { accountId: string; deltaMinor: number }[];
}

/** What one law reached and moved, by record id (the chain the PR body cites). */
interface Evidence {
  readonly law: string;
  /** The `lawApplied` row (applied|<key>|<target>) naming the reach. */
  readonly applied: string;
  /** The person, household, organization, government or counted group it reached. */
  readonly reached: string;
  /** The people the reached group stands for (1 for anyone else). */
  readonly count: number;
  /** The law row it was applied under. */
  readonly lawId: string;
  /** The journal entry that moved the money, or the reason the law moves none. */
  readonly journal: string;
}

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

function run(specId: string, want: readonly Subject[]) {
  /** True when this test checks one of these subjects. */
  const on = (...subjects: Subject[]) => subjects.some((x) => want.includes(x));
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
  /** Every journal entry the run posts: its id, source and the accounts it moved. */
  const entries: JournalEntry[] = [];
  setJournalTrace((input) => {
    for (const p of input.postings) posts.push(p);
    entries.push({
      id: input.id,
      date: input.date,
      kind: input.sourceRef.kind,
      sourceId: input.sourceRef.id,
      postings: input.postings.map((p) => ({
        accountId: p.accountId,
        deltaMinor: p.deltaMinor,
      })),
    });
  });
  const step = (days: number) =>
    advanceCore(core, addDays(makeIsoDate(core.date), days));

  const stateGov = governments(api).find((g) => g.level === "state");
  if (!stateGov) throw new NoSubject("no state treasury");
  const rt = residentsRuntime(core);
  const countedJobs = [...(rt?.jobs.values() ?? [])].filter(
    (j) => j.endsAt === undefined && !core.jobs.has(j.id),
  );
  const town = lawChain(api).townPlaceId;
  // A resident's job (an official's seat pay is not a worker's).
  const namedJobs = [...core.jobs.values()].filter(
    (j) => j.endsAt === undefined && core.people.has(j.personId),
  );
  const fullJobs = namedJobs.filter(
    (j) => core.people.get(j.personId)?.placeId === town,
  );
  if (!fullJobs.length || !countedJobs.length)
    throw new NoSubject("no full or counted jobs");
  // The nation's floor binds only workers paid under it, full and counted.
  const federalFloor = reachA("federalMinimumWageTargetMinor");
  if (
    on("wage") &&
    (!fullJobs.some((j) => (j.hourlyMinor ?? Infinity) < federalFloor) ||
      !countedJobs.some((j) => (j.hourlyMinor ?? Infinity) < federalFloor))
  )
    throw new NoSubject(
      "no full and counted worker paid under the federal floor",
    );
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
  if (on("teacher") && !underpaid.length)
    throw new NoSubject("no teacher in the town");
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
    (k) => yesLevels(api, k).length > 0 && !k.startsWith("us-federal"),
  );
  for (const k of repealed) setQuestion(api, k, 0, "repeal");
  const taxes = [
    "social-security-tax",
    "medicare-tax",
    "state-unemployment-tax",
    "federal-unemployment-tax",
  ];
  const taxLaw: Record<string, string> = {};
  for (const s of on("taxes") ? taxes : [])
    taxLaw[s] = amountAt(api, s, 1.1, s).id;
  // The weekly maximum caps a claimant whose share of pay is above it. For the
  // maximum's own test the law is set (through the law series) to two fifths of
  // the best-paid resident's weekly pay, so that resident is capped.
  const bestPaid = [...(fullJobs.length ? fullJobs : namedJobs)].sort(
    (a, b) => (b.wageDailyMinor ?? 0) - (a.wageDailyMinor ?? 0),
  )[0];
  const maxNowDollars =
    lawInForce(api, "unemployment-weekly-maximum").value ?? 0;
  const maxFactor =
    on("maximum") && bestPaid && maxNowDollars > 0
      ? Math.max(
          0.01,
          (0.4 * (bestPaid.wageDailyMinor ?? 0) * 7) /
            api.parameter("minorPerDollar") /
            maxNowDollars,
        )
      : 1.1;
  const maxLaw = on("claims", "maximum")
    ? amountAt(api, "unemployment-weekly-maximum", maxFactor, "max").id
    : "";
  const council = townSeats(api).find(
    (s) => s.office.kind === "council" && s.holder?.personId,
  );
  if (on("authority") && !council)
    throw new NoSubject("no seated council member");
  /** The council drafts a local wage a dollar over the floor; the grant it drafts under is read. */
  const draftWage = () => {
    if (!council) return "";
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
    return council.office.id;
  };
  // The state's grant as the law series itself, taking effect the day after
  // the day-0 repeals do: where the authority question started yes, its repeal
  // and a grant on the same day tie, and the repeal's enactment wins the tie
  // (laws-same-day-authority-tiebreak). The council reads the grant on day 2.
  const seriesGrant = enactLaw(api, {
    jurisdiction: lawChain(api).stateKey,
    level: "state",
    series: "local-minimum-wage-authority",
    value: 1,
    effectiveDate: addDays(makeIsoDate(api.state.date), 2),
    measureId: "labor-authority-series",
    citation: "Labor law-wiring test",
  });
  step(2);
  // Day 2: a council drafts under the series; then every question is enacted as yes.
  draftWage();
  const enacted: Record<string, string[]> = {};
  for (const [name, key] of Object.entries(KEYS))
    if (name !== "raise") enacted[name] = setQuestion(api, key, 1, name);
  step(3);
  // Day 5: the local wage bill is drafted under the state's grant; claims are
  // filed by the jobs engine for a full and a counted worker.
  const draftedAt = draftWage();
  const claims = api.moduleState("jobs").table("claims");
  const filed = { full: "", counted: "" };
  for (const job of on("claims", "maximum") ? fullJobs : []) {
    if (filed.full) break;
    if (fileClaim(api, claims, job as JobInput, "labor-test", 52))
      filed.full = job.personId;
  }
  for (const job of on("claims", "maximum") ? countedJobs : []) {
    if (filed.counted) break;
    if (fileClaim(api, claims, job as JobInput, "labor-test", 52))
      filed.counted = job.personId;
  }
  if (on("claims") && (!filed.full || !filed.counted))
    throw new NoSubject("no full and counted worker could file a claim");
  // The weekly maximum fixes the benefit of a claimant whose share of pay is above it: the town's best-paid full worker files too.
  // A resident of the town if one earns above the maximum; else the best-paid named person.
  const byPay = (list: readonly JobInput[]) =>
    [...list]
      .filter((j) => j.personId !== filed.full)
      .sort((a, b) => (b.wageDailyMinor ?? 0) - (a.wageDailyMinor ?? 0));
  const maxNow =
    (lawInForce(api, "unemployment-weekly-maximum").value ?? 0) *
    api.parameter("minorPerDollar");
  const resident = byPay(fullJobs)[0];
  const top =
    resident && (resident.wageDailyMinor ?? 0) * 7 * 0.6 > maxNow
      ? resident
      : byPay(namedJobs)[0];
  const claimant = top ? (core.jobs.get(top.id) ?? top) : undefined;
  const capped =
    on("maximum") &&
    claimant &&
    fileClaim(api, claims, claimant as JobInput, "labor-test", 52)
      ? claimant.personId
      : "";
  // A public unit's contract is dated by its government's budget year, so a
  // world has the bargaining subject only when one falls due inside the run:
  // found before the run, on the calendar the reach handler keeps.
  if (on("bargaining")) {
    const calendar = api.moduleCalendar(REACH_A_MODULE_ID);
    const from = makeIsoDate(core.date);
    const due = governments(api).some((gov) =>
      Array.from({ length: 2 * WINDOW + 10 }, (_, d) =>
        calendar.get(`bargaining:${gov.id}:${addDays(from, d)}`),
      ).some(Boolean),
    );
    if (!due)
      throw new NoSubject("no public unit's contract falls due in the run");
  }
  step(WINDOW);
  const date = core.date;
  // The nation's floor first (it binds everyone under it); then the state's
  // raise question over it, then a wage law raised a tenth over both.
  need(
    !on("wage") || rows(api, KEYS.federal).some((r) => r.amountMinor > 0),
    `federal: no pay raised under ${enacted.federal?.join(",")}`,
  );
  enacted.raise = setQuestion(api, KEYS.raise, 1, "raise");
  step(5);
  need(
    !on("wage") || rows(api, KEYS.raise).some((r) => r.amountMinor > 0),
    `raise: no pay raised under ${enacted.raise?.join(",")}`,
  );
  const wageLaw = amountAt(api, "minimum-wage", 1.1, "wage");
  // Payroll runs on the raised wages before the chain is read.
  step(35);
  // A legislature in play may repeal or replace one of the test's laws in the
  // window (in Allendale, South Carolina, H 3012 repealed paid family leave on
  // March 17, 2025). Whom a law reached while it was in force still counts, so
  // a record ended under one of the test's own law rows is read with the open ones.
  const ours = new Set([
    ...Object.values(enacted).flat(),
    ...Object.values(taxLaw),
    maxLaw,
    wageLaw.id,
    seriesGrant.id,
  ]);
  const reached = (key: string): LawAppliedRow[] => [
    ...rows(api, key),
    ...rows(api, key, false).filter((r) => ours.has(r.lawId)),
  ];
  // ---- minimum wage (amount) ---------------------------------------------
  const wage = reached("minimum-wage");
  need(
    !on("wage") || wage.some((r) => r.target === "person" && r.amountMinor > 0),
    `minimum-wage: no worker raised (${wageLaw.id})`,
  );
  need(
    !on("wage") ||
      wage.some(
        (r) => r.target === "group" && r.count > 0 && r.amountMinor > 0,
      ),
    "minimum-wage: no counted worker group raised",
  );
  // ---- local authority -----------------------------------------------------
  const authority = reached(KEYS.authority);
  need(
    !on("authority") || authority.some((r) => r.target === "government"),
    `authority: no government reached (${enacted.authority?.join(",")})`,
  );
  need(
    !on("authority") || authority.some((r) => r.targetId === draftedAt),
    `authority: the drafting body ${draftedAt} was not reached`,
  );
  // ---- paid leave, bargaining, right to work, teacher ---------------------
  const leave = reached(KEYS.leave);
  // What the state's leave law is now, and the records it ended, for a failure's message.
  const leaveNow = () => {
    const answer = lawInForce(api, KEYS.leave);
    return `law now ${answer.value} under ${answer.governing?.id ?? "none"}; ${rows(api, KEYS.leave, false).length} records ended`;
  };
  need(
    !on("leave") ||
      leave.some((r) => r.target === "person" && r.amountMinor > 0),
    `leave: no worker paid a premium (${leaveNow()})`,
  );
  need(
    !on("leave") || leave.some((r) => r.target === "group" && r.count > 0),
    "leave: no counted group paid a premium",
  );
  const bargaining = reached(KEYS.bargaining);
  need(
    !on("bargaining") || bargaining.length > 0,
    "bargaining: no public worker reached",
  );
  const rtw = reached(KEYS.rtw);
  need(
    !on("rtw") || rtw.some((r) => r.target === "organization"),
    "right-to-work: no union local reached",
  );
  need(
    !on("rtw") || rtw.some((r) => r.target === "group" && r.count > 0),
    "right-to-work: no worker group reached",
  );
  const teacher = reached(KEYS.teacher);
  need(!on("teacher") || teacher.length > 0, "teacher: no teacher raised");
  // ---- payroll taxes and unemployment ---------------------------------------
  for (const s of on("taxes") ? taxes : []) {
    const list = reached(s);
    need(
      list.some((r) => r.amountMinor > 0 && r.lawId === taxLaw[s]),
      `${s}: no reach row under ${taxLaw[s]}`,
    );
  }
  for (const s of on("taxes") ? ["social-security-tax", "medicare-tax"] : [])
    need(
      reached(s).some((r) => r.target === "person") &&
        reached(s).some((r) => r.target === "group"),
      `${s}: needs full and counted reach`,
    );
  if (on("claims")) {
    const ui = reached("unemployment-insurance");
    need(filed.full !== "" || filed.counted !== "", "no claim could be filed");
    // A claimant who moves away before the first benefit ends the claim unpaid
    // (Lebanon, Kansas, seed 382de6b9...: a counted claimant left on day 21):
    // the town then has no claimant to follow.
    for (const c of claims.rows() as unknown as {
      personId: string;
      paidMinor: number;
      endReason?: string;
    }[])
      if (
        (c.personId === filed.full || c.personId === filed.counted) &&
        c.paidMinor === 0 &&
        c.endReason === "left"
      )
        throw new NoSubject(
          `the claimant ${c.personId} left before the first benefit`,
        );
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
    // A counted claimant's benefit is paid times the people the claim stands
    // for, the way counted wages are, at the count of each payday: a group's
    // count changes as its households do. The row's money is what the journal
    // paid for that claim, within a cent a payment for rounding.
    {
      const claim = (
        claims.rows() as unknown as { personId: string; paidMinor: number }[]
      ).find((c) => c.personId === filed.counted);
      // A counted claimant filled in since filing is paid as a full person, and
      // the engine then records the reach on the person's own row: the claim's
      // money is the sum of the claimant's rows on either tier.
      const own = ui.filter(
        (r) =>
          r.targetId === `counted-claimants:${filed.counted}` ||
          r.targetId === filed.counted,
      );
      const row = own[0]
        ? {
            amountMinor: own.reduce((total, r) => total + r.amountMinor, 0),
            count: own[own.length - 1]!.count,
          }
        : undefined;
      const paydays = entries.filter(
        (e) =>
          e.sourceId.startsWith(`unemployment-benefit:${filed.counted}:`) ||
          e.sourceId.startsWith(`unemployment-advance:${filed.counted}:`),
      );
      const journal = paydays.reduce(
        (total, e) =>
          total +
          e.postings.reduce(
            (n, p) => n + (p.deltaMinor > 0 ? p.deltaMinor : 0),
            0,
          ),
        0,
      );
      need(
        claim &&
          row &&
          claim.paidMinor > 0 &&
          Math.abs(row.amountMinor - journal) <= paydays.length,
        `unemployment-insurance: counted claimant ${filed.counted} paid ${claim?.paidMinor} a claim, ${journal} in the journal over ${paydays.length} paydays, but the row says ${row?.amountMinor} for ${row?.count} people; rows for the claimant: ${rows(
          api,
          "unemployment-insurance",
          true,
        )
          .concat(rows(api, "unemployment-insurance", false))
          .filter((r) => r.targetId === `counted-claimants:${filed.counted}`)
          .map(
            (r) =>
              `${r.lawId.slice(-30)} since ${r.since} last ${r.lastOn} x${r.times} count ${r.count} ${r.amountMinor} ended ${r.endedOn}`,
          )
          .join(" | ")}; paydays ${paydays.map((e) => e.date).join(",")}`,
      );
    }
    need(
      posts.some(
        (p) =>
          p.accountId === `cash:${stateGov.organizationId}:residual` &&
          p.deltaMinor < 0 &&
          p.id.includes("unemployment-benefit"),
      ),
      "unemployment: the state treasury paid no benefit",
    );
  }
  if (on("maximum")) {
    // The best-paid claimant's benefit is the maximum, and the maximum's row names them.
    const topClaim = (
      claims.rows() as unknown as { personId: string; weeklyMinor: number }[]
    ).find((c) => c.personId === capped);
    const maximumMinor =
      (lawInForce(api, "unemployment-weekly-maximum").value ?? 0) *
      api.parameter("minorPerDollar");
    if (!topClaim || topClaim.weeklyMinor < maximumMinor)
      throw new NoSubject(
        `no claimant earns above the weekly maximum (claimant ${capped || "none filed"}, weekly ${topClaim?.weeklyMinor}, maximum ${maximumMinor}, best paid daily ${bestPaid?.wageDailyMinor}, law was ${maxNowDollars} dollars)`,
      );
    need(
      topClaim.weeklyMinor === maximumMinor &&
        reached("unemployment-weekly-maximum").some(
          (r) => r.targetId === capped && r.lawId === maxLaw,
        ),
      `unemployment-weekly-maximum (${maxLaw}): claimant ${capped} paid ${topClaim.weeklyMinor} a week against a maximum of ${maximumMinor}, or not recorded`,
    );
  }
  // ---- the outcome web reads the question laws -----------------------------
  const web = api
    .moduleState(OUTCOME_WEB_MODULE_ID)
    .table("months")
    .rows() as unknown as { date: string; values: Record<string, number> }[];
  const webKeys = [
    ...(on("leave") ? [KEYS.leave] : []),
    ...(on("teacher") ? [KEYS.teacher] : []),
    ...(on("wage") ? [KEYS.federal] : []),
  ];
  for (const key of webKeys) {
    const read = web.filter((m) => m.values[`law:${key}`] === 1);
    need(read.length > 0, `outcome web: never read ${key} as yes (${date})`);
  }
  // ---- the chain, by record id -----------------------------------------------
  // For each law: the `lawApplied` row of the engine that applied it, the
  // person, household, employer or counted group it reached, and the journal
  // entry that moved the money (found on the reached owner's own account).
  const evidence: Evidence[] = [];
  let attempted = 0;
  const accountOf = (ownerId: string) =>
    core.cashJournal.residualAccountByOwner.get(ownerId);
  const entryOf = (
    ownerId: string,
    sign: 1 | -1,
    hint: RegExp,
    after = "",
  ): JournalEntry | undefined => {
    const account = accountOf(ownerId);
    return account
      ? entries.find(
          (e) =>
            e.date >= after &&
            hint.test(`${e.kind} ${e.id} ${e.sourceId}`) &&
            e.postings.some(
              (p) =>
                p.accountId === account && Math.sign(p.deltaMinor) === sign,
            ),
        )
      : undefined;
  };
  const cite = (
    law: string,
    key: string,
    pick: (r: LawAppliedRow) => boolean,
    journalOf: (r: LawAppliedRow) => JournalEntry | undefined | string,
  ) => {
    attempted += 1;
    const r = reached(key)
      .filter(pick)
      .sort(
        (a, b) => a.since.localeCompare(b.since) || a.id.localeCompare(b.id),
      )[0];
    need(r, `${law}: no applied row`);
    if (!r) return;
    const j = journalOf(r);
    const seen = [
      ...new Set(
        entries
          .filter((e) =>
            e.postings.some((p) => p.accountId === accountOf(r.targetId)),
          )
          .map((e) => e.kind),
      ),
    ].join(",");
    need(j, `${law}: no journal entry on ${r.targetId} (kinds seen: ${seen})`);
    if (!j) return;
    evidence.push({
      law,
      applied: r.id,
      reached: r.targetId,
      count: r.count,
      lawId: r.lawId,
      journal: typeof j === "string" ? j : j.id,
    });
  };
  const named = (r: LawAppliedRow) =>
    r.target === "person" && core.people.has(r.targetId);
  const raised = (r: LawAppliedRow) => named(r) && r.amountMinor > 0;
  const paid = (r: LawAppliedRow) => entryOf(r.targetId, 1, /pay/i, r.since);
  if (on("wage")) cite("minimum-wage", "minimum-wage", raised, paid);
  if (on("wage"))
    cite("raise-federal-minimum-wage", KEYS.federal, raised, paid);
  if (on("wage")) cite("raise-minimum-wage", KEYS.raise, raised, paid);
  if (on("authority"))
    cite(
      "local-minimum-wage-authority (question)",
      KEYS.authority,
      (r) => r.target === "government" && r.targetId === draftedAt,
      () =>
        "none: the grant moves no money; the wage a council then enacts is the minimum-wage law's",
    );
  if (on("authority"))
    cite(
      `local-minimum-wage-authority (series, enacted as ${seriesGrant.id})`,
      "local-minimum-wage-authority",
      (r) => r.target === "government" && r.targetId === draftedAt,
      () =>
        "none: the grant moves no money; the wage a council then enacts is the minimum-wage law's",
    );
  if (on("bargaining"))
    cite("public-sector-collective-bargaining", KEYS.bargaining, raised, paid);
  if (on("leave"))
    cite(
      "paid-family-leave",
      KEYS.leave,
      (r) => r.target === "person",
      (r) => entryOf(r.targetId, -1, /leave|premium|withhold/i, r.since),
    );
  if (on("rtw"))
    cite(
      "right-to-work",
      KEYS.rtw,
      (r) => r.target === "organization",
      (r) => {
        const account = accountOf(r.targetId);
        return entries.find(
          (e) =>
            /dues/i.test(`${e.kind} ${e.id} ${e.sourceId}`) &&
            e.postings.some((p) => p.accountId === account && p.deltaMinor > 0),
        );
      },
    );
  if (on("taxes"))
    for (const s of ["social-security-tax", "medicare-tax"])
      cite(
        s,
        s,
        (r) => r.target === "person",
        (r) => entryOf(r.targetId, -1, /withhold/i, r.since),
      );
  if (on("taxes"))
    for (const s of ["state-unemployment-tax", "federal-unemployment-tax"])
      cite(
        s,
        s,
        (r) => r.target === "organization",
        (r) => {
          const account = accountOf(r.targetId);
          return entries.find(
            (e) =>
              e.kind === "employer-taxes:share" &&
              e.postings.some(
                (p) => p.accountId === account && p.deltaMinor < 0,
              ),
          );
        },
      );
  const benefit = (who: string) =>
    entries.find((e) =>
      `${e.id} ${e.sourceId}`.includes(`unemployment-benefit:${who}:`),
    );
  if (on("claims"))
    cite(
      "unemployment-insurance",
      "unemployment-insurance",
      (r) => r.targetId === filed.full,
      (r) => benefit(r.targetId),
    );
  if (on("maximum"))
    cite(
      "unemployment-weekly-maximum",
      "unemployment-weekly-maximum",
      (r) => r.targetId === capped,
      (r) => benefit(r.targetId),
    );
  need(
    evidence.length === attempted,
    `evidence for ${evidence.length} of ${attempted} laws: ${evidence.map((e) => e.law).join("; ")}`,
  );
  // One line a PR body can cite: law, applied row, reached, journal entry.
  console.info(
    `labor law chain (${where}):\n${evidence
      .map(
        (e) =>
          `  ${e.law}: ${e.applied} -> ${e.reached} (${e.count}) under ${e.lawId}; journal ${e.journal}`,
      )
      .join("\n")}`,
  );

  // ---- money moved -----------------------------------------------------------
  const raises = [
    ...(on("wage") ? [wage] : []),
    ...(on("bargaining") ? [bargaining] : []),
  ];
  const moved = raises.reduce((total, list) => total + sum(list), 0);
  need(
    !raises.length || moved > 0,
    `no pay raise moved money (wage ${wage.length} rows, bargaining ${bargaining.length}, teacher ${teacher.length} rows summing ${sum(teacher)}: ${teacher
      .slice(0, 2)
      .map((r) => `${r.target} ${r.amountMinor}`)
      .join(", ")})`,
  );

  // ---- repeal ends the reach -------------------------------------------------
  const repealedOn = addDays(makeIsoDate(api.state.date), 1);
  for (const [name, key] of Object.entries(KEYS))
    setQuestion(api, key, 0, `end-${name}`);
  step(3);
  const repealChecked = want.flatMap((x) => QUESTION_OF[x] ?? []);
  for (const key of Object.values(KEYS).filter((k) =>
    repealChecked.includes(k),
  )) {
    // A body in play may pass the law again after the repeal (a state's
    // legislature with its own bill); whom that later row reaches is its own.
    const later = new Set(
      lawChain(api).levels.flatMap(({ jurisdiction }) =>
        (
          api
            .moduleState(LAWS_MODULE_ID)
            .table("laws")
            .query("bySeries", [jurisdiction, key]) as unknown as LawRowInput[]
        )
          .filter((r) => r.effectiveDate > repealedOn)
          .map((r) => r.id),
      ),
    );
    const open = rows(api, key);
    const passedAgain = open.filter((r) => later.has(r.lawId));
    if (passedAgain.length)
      console.info(
        `${where}: ${key} passed again after the repeal; ${passedAgain.length} records open under ${[...new Set(passedAgain.map((r) => r.lawId))].join(", ")}`,
      );
    need(
      open.length === passedAgain.length,
      `repeal: ${key} still has open reach`,
    );
  }
  setJournalTrace(() => {});
  return { where, problems };
}

describe(
  "labor and pay laws reach people, groups and employers and move money",
  // A played world is built once per try (about a minute) and run a few
  // months; a place with no subject at all is redrawn up to TRIES times,
  // so the time allowed is a minute and a half per try.
  { timeout: TRIES * 90_000 },
  () => {
    // One test per law; each draws its own world with only its own subject.
    for (const [subject, laws] of Object.entries(SUBJECTS) as [
      Subject,
      string,
    ][])
      it(`${laws} reaches people, groups or employers and moves money, by record id`, () => {
        const was = setBookkeeping(false);
        const tried: string[] = [];
        try {
          for (let n = 0; n < TRIES; n += 1) {
            try {
              const { where, problems } = run(`labor-${subject}-${n}`, [
                subject,
              ]);
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
            `no place with a subject for ${laws}: seed ${SEED}; ${tried.join("; ")}`,
          );
        } finally {
          setBookkeeping(was);
        }
      });

    // A state whose researched answer at the opening is yes on raising the
    // minimum wage: repeal the question and its own wage ends, so the next
    // level up governs; the workers keep the pay they have, and the ones
    // whose floor fell are no longer under it.
    it("repealing the raise-the-minimum-wage question ends the state's own wage and the next level's floor governs", () => {
      const was = setBookkeeping(false);
      const tried: string[] = [];
      try {
        for (let n = 0; n < TRIES; n += 1) {
          const drawn = drawPlace(SEED, `labor-repeal-${n}`);
          const where = `seed ${SEED}, place ${drawn.name} (${drawn.key})`;
          const world = buildBenchWorld(drawn.seed, gameStartDate(), {
            twoLevel: true,
            placeKey: drawn.key,
          });
          const core = world.core as CoreState;
          const api = coreAPI(core);
          const own = lawInForce(api, "minimum-wage").levels.find(
            (l) => l.level === "state",
          )?.row;
          if (
            !yesLevels(api, KEYS.raise).length > 0 ||
            !own ||
            !((own.value ?? 0) > 0) ||
            lawInForce(api, "minimum-wage").governing?.id !== own.id
          ) {
            tried.push(`${where}: no state wage under a yes`);
            continue;
          }
          // The state raises its own wage a tenth first, so some workers stand under it.
          amountAt(api, "minimum-wage", 1.1, "own");
          advanceCore(core, addDays(makeIsoDate(core.date), 3));
          const before = lawInForce(api, "minimum-wage");
          const under = rows(api, "minimum-wage").filter(
            (r) => r.target === "person",
          );
          const pay = new Map(
            under.map((r) => [
              r.targetId,
              core.jobs.get(core.people.get(r.targetId)?.jobId ?? "")
                ?.hourlyMinor,
            ]),
          );
          const repeal = setQuestion(api, KEYS.raise, 0, "repeal-own");
          advanceCore(core, addDays(makeIsoDate(core.date), 3));
          const after = lawInForce(api, "minimum-wage");
          const next = Math.max(
            0,
            ...after.levels
              .filter((l) => l.level !== "state")
              .map((l) => l.row?.value ?? 0),
          );
          const stateRow = after.levels.find((l) => l.level === "state")?.row;
          // The record: the state's wage row now says no wage of its own, written by the repeal.
          expect(stateRow?.value, `${where}: ${stateRow?.id}`).toBe(0);
          expect(stateRow?.terms?.enactedBy, where).toBe(repeal[0]);
          expect(after.value, `${where}: floor after ${stateRow?.id}`).toBe(
            next,
          );
          expect(after.value, where).toBeLessThan(before.value ?? 0);
          // The workers whose floor fell are no longer under it, and keep their pay.
          const ended = rows(api, "minimum-wage", false);
          for (const [who, hourly] of pay) {
            expect(
              ended.some((r) => r.targetId === who),
              `${where}: ${who} still under the state's wage`,
            ).toBe(true);
            expect(
              core.jobs.get(core.people.get(who)?.jobId ?? "")?.hourlyMinor,
              `${where}: ${who}'s pay`,
            ).toBe(hourly);
          }
          console.info(
            `raise-the-minimum-wage repealed (${where}): state row ${stateRow?.id} (no wage of its own) replaces ${before.governing?.id}; floor ${before.value} -> ${after.value}; ${ended.length} worker rows ended, e.g. ${ended[0]?.id ?? "none under the floor"}`,
          );
          return;
        }
        throw new Error(
          `no place with a state wage under a yes: seed ${SEED}; ${tried.join("; ")}`,
        );
      } finally {
        setBookkeeping(was);
      }
    });
  },
);
