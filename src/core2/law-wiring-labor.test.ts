/**
 * Labor and pay laws, wired end to end in a played world (buildBenchWorld,
 * two levels, economy on) in a place drawn from all 56: each law, once law,
 * reaches named workers, counted worker groups, employers or governments
 * through the engine that applies it, moves money through the journal, and
 * a repeal ends the reach. Failures name the seed and the place.
 *
 * One subject per test: each group of laws below has its own test, its own
 * world and its own subject (a worker under the floor, a council member, a
 * teacher, a claimant), so a town missing one law's subject is redrawn for
 * that law alone and never holds up the others.
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
import { residentsRuntime } from "./modules/residents";
import type { LawRowInput } from "./laws-starting";
import type { CoreAPI, CoreState, JobInput } from "./types";

const SEED = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
/** A group of laws needs its subject in the drawn town (a worker under the federal floor, a seated council member, a teacher, a claimant above the weekly maximum), so a draw may have none; each group is redrawn for its own subject. */
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
/** The place the last `run` drew, so a place passed over is named. */
let lastWhere = "";

/** The laws one test follows, each with its own world. */
type Subject =
  | "wage"
  | "leave"
  | "bargaining"
  | "rtw"
  | "teacher"
  | "taxes"
  | "unemployment"
  | "maximum";
/** The question each key belongs to (the series laws belong to their group in `run`). */
const KEY_GROUP: Record<keyof typeof KEYS, Subject> = {
  raise: "wage",
  federal: "wage",
  authority: "wage",
  leave: "leave",
  bargaining: "bargaining",
  rtw: "rtw",
  teacher: "teacher",
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

function run(specId: string, subject: Subject) {
  const drawn = drawPlace(SEED, specId);
  const where = `seed ${SEED}, place ${drawn.name} (${drawn.key})`;
  lastWhere = `${drawn.name} (${drawn.key})`;
  const world = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    settings: { history: "today" },
    placeKey: drawn.key,
  });
  const core = world.core as CoreState;
  const api = coreAPI(core);
  const problems: string[] = [];
  const is = (...groups: Subject[]) => groups.includes(subject);
  const keysHere = Object.entries(KEYS).filter(
    ([name]) => KEY_GROUP[name as keyof typeof KEYS] === subject,
  ) as [keyof typeof KEYS, string][];
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
  if (
    is("wage", "bargaining", "taxes", "unemployment") &&
    (!fullJobs.length || !countedJobs.length)
  )
    throw new NoSubject("no full or counted jobs");
  // The nation's floor binds only workers paid under it, full and counted.
  const federalFloor = reachA("federalMinimumWageTargetMinor");
  if (
    is("wage") &&
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
  const teachers = is("teacher")
    ? jobsAt(api, ["service:school"], "profession:teacher")
    : [];
  const underpaid = [
    teachers.find((j) => core.jobs.has(j.id)),
    teachers.find((j) => !core.jobs.has(j.id)),
  ].filter((j): j is JobInput => !!j);
  if (is("teacher") && !underpaid.length)
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
  const repealed = keysHere
    .map(([, k]) => k)
    .filter((k) => yesLevels(api, k).length > 0 && !k.startsWith("us-federal"));
  for (const k of repealed) setQuestion(api, k, 0, "repeal");
  const taxes = [
    "social-security-tax",
    "medicare-tax",
    "state-unemployment-tax",
    "federal-unemployment-tax",
  ];
  const taxLaw: Record<string, string> = {};
  if (is("taxes"))
    for (const s of taxes) taxLaw[s] = amountAt(api, s, 1.1, s).id;
  // A claimant above the maximum is built through the law, not searched for:
  // the state's maximum is cut to a quarter, so the best-paid worker who files
  // draws more than the maximum allows and the maximum is their benefit.
  const maxLaw = is("maximum")
    ? amountAt(api, "unemployment-weekly-maximum", 0.25, "max").id
    : "";
  const council = townSeats(api).find(
    (s) => s.office.kind === "council" && s.holder?.personId,
  );
  if (is("wage") && !council) throw new NoSubject("no seated council member");
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
  const seriesGrant = is("wage")
    ? enactLaw(api, {
        jurisdiction: lawChain(api).stateKey,
        level: "state",
        series: "local-minimum-wage-authority",
        value: 1,
        effectiveDate: addDays(makeIsoDate(api.state.date), 2),
        measureId: "labor-authority-series",
        citation: "Labor law-wiring test",
      })
    : undefined;
  step(2);
  // Day 2: a council drafts under the series; then every question is enacted as yes.
  if (is("wage")) draftWage();
  const enacted: Record<string, string[]> = {};
  for (const [name, key] of keysHere)
    if (name !== "raise") enacted[name] = setQuestion(api, key, 1, name);
  step(3);
  // Day 5: the local wage bill is drafted under the state's grant; claims are
  // filed by the jobs engine for a full and a counted worker.
  const draftedAt = is("wage") ? draftWage() : "";
  const claims = api.moduleState("jobs").table("claims");
  const filed = { full: "", counted: "" };
  for (const job of is("unemployment") ? fullJobs : []) {
    if (filed.full) break;
    if (fileClaim(api, claims, job as JobInput, "labor-test", 52))
      filed.full = job.personId;
  }
  for (const job of is("unemployment") ? countedJobs : []) {
    if (filed.counted) break;
    if (fileClaim(api, claims, job as JobInput, "labor-test", 52))
      filed.counted = job.personId;
  }
  if (is("unemployment") && (!filed.full || !filed.counted))
    throw new NoSubject("no full and counted worker could file a claim");
  // The weekly maximum fixes the benefit of a claimant whose share of pay is above it: the town's best-paid full worker files too.
  const byPay = (list: readonly JobInput[]) =>
    [...list]
      .filter((j) => j.personId !== filed.full)
      .sort((a, b) => (b.wageDailyMinor ?? 0) - (a.wageDailyMinor ?? 0));
  const maxNow =
    (lawInForce(api, "unemployment-weekly-maximum").value ?? 0) *
    api.parameter("minorPerDollar");
  // The best-paid worker who files: the best paid often decide not to file,
  // so the town's workers are tried from the best paid down (residents first)
  // until one files with a share of pay above the maximum.
  let capped = "";
  if (is("maximum"))
    for (const job of [...byPay(fullJobs), ...byPay(namedJobs)]) {
      if ((job.wageDailyMinor ?? 0) * 7 * 0.6 <= maxNow) continue;
      if (fileClaim(api, claims, job as JobInput, "labor-test", 52)) {
        capped = job.personId;
        break;
      }
    }
  step(WINDOW);
  const date = core.date;
  // The nation's floor first (it binds everyone under it); then the state's
  // raise question over it, then a wage law raised a tenth over both.
  if (is("wage")) {
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
  }
  const wageLaw = is("wage")
    ? amountAt(api, "minimum-wage", 1.1, "wage")
    : undefined;
  // Payroll runs on the raised wages before the chain is read.
  step(35);
  // A legislature in play may repeal or replace one of the test's laws in the
  // window (in Allendale, South Carolina, H 3012 repealed paid family leave on
  // March 17, 2025). Whom a law reached while it was in force still counts, so
  // a record ended under one of the test's own law rows is read with the open ones.
  const ours = new Set([
    ...Object.values(enacted).flat(),
    ...Object.values(taxLaw),
    ...(maxLaw ? [maxLaw] : []),
    ...(wageLaw ? [wageLaw.id] : []),
    ...(seriesGrant ? [seriesGrant.id] : []),
  ]);
  const reached = (key: string): LawAppliedRow[] => [
    ...rows(api, key),
    ...rows(api, key, false).filter((r) => ours.has(r.lawId)),
  ];
  // ---- minimum wage (amount) ---------------------------------------------
  const wage = reached("minimum-wage");
  if (is("wage")) {
    need(
      wage.some((r) => r.target === "person" && r.amountMinor > 0),
      `minimum-wage: no worker raised (${wageLaw?.id})`,
    );
    need(
      wage.some(
        (r) => r.target === "group" && r.count > 0 && r.amountMinor > 0,
      ),
      "minimum-wage: no counted worker group raised",
    );
  }
  // ---- local authority -----------------------------------------------------
  const authority = reached(KEYS.authority);
  if (is("wage")) {
    need(
      authority.some((r) => r.target === "government"),
      `authority: no government reached (${enacted.authority?.join(",")})`,
    );
    need(
      authority.some((r) => r.targetId === draftedAt),
      `authority: the drafting body ${draftedAt} was not reached`,
    );
  }
  // ---- paid leave, bargaining, right to work, teacher ---------------------
  const leave = reached(KEYS.leave);
  // What the state's leave law is now, and the records it ended, for a failure's message.
  const leaveNow = () => {
    const answer = lawInForce(api, KEYS.leave);
    return `law now ${answer.value} under ${answer.governing?.id ?? "none"}; ${rows(api, KEYS.leave, false).length} records ended`;
  };
  if (is("leave")) {
    need(
      leave.some((r) => r.target === "person" && r.amountMinor > 0),
      `leave: no worker paid a premium (${leaveNow()})`,
    );
    need(
      leave.some((r) => r.target === "group" && r.count > 0),
      "leave: no counted group paid a premium",
    );
  }
  // A public unit's contract settles the day after its funding government's
  // budget year begins (law-reach/group-a-bargaining.ts), a date the town's
  // calendar sets, so the world runs on until the law has reached a worker
  // (a year at most: every government's budget year begins inside it), then
  // a payroll month, so the raise is on a paycheck.
  if (is("bargaining")) {
    for (let waited = 0; waited < 380 && !reached(KEYS.bargaining).length;) {
      step(14);
      waited += 14;
    }
    step(35);
  }
  const bargaining = reached(KEYS.bargaining);
  if (is("bargaining"))
    need(bargaining.length > 0, "bargaining: no public worker reached");
  const rtw = reached(KEYS.rtw);
  if (is("rtw")) {
    need(
      rtw.some((r) => r.target === "organization"),
      "right-to-work: no union local reached",
    );
    need(
      rtw.some((r) => r.target === "group" && r.count > 0),
      "right-to-work: no worker group reached",
    );
  }
  const teacher = reached(KEYS.teacher);
  if (is("teacher")) need(teacher.length > 0, "teacher: no teacher raised");
  // ---- payroll taxes and unemployment ---------------------------------------
  for (const s of is("taxes") ? taxes : []) {
    const list = reached(s);
    need(
      list.some((r) => r.amountMinor > 0 && r.lawId === taxLaw[s]),
      `${s}: no reach row under ${taxLaw[s]}`,
    );
  }
  for (const s of is("taxes") ? ["social-security-tax", "medicare-tax"] : [])
    need(
      reached(s).some((r) => r.target === "person") &&
        reached(s).some((r) => r.target === "group"),
      `${s}: needs full and counted reach`,
    );
  const ui = reached("unemployment-insurance");
  if (is("unemployment"))
    need(filed.full !== "" || filed.counted !== "", "no claim could be filed");
  if (is("unemployment")) {
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
      const row = ui.find(
        (r) => r.targetId === `counted-claimants:${filed.counted}`,
      );
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
        `unemployment-insurance: counted claimant ${filed.counted} paid ${claim?.paidMinor} a claim, ${journal} in the journal over ${paydays.length} paydays, but the row says ${row?.amountMinor} for ${row?.count} people`,
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
  if (is("maximum")) {
    // The best-paid claimant's benefit is the maximum, and the maximum's row names them.
    const topClaim = (
      claims.rows() as unknown as { personId: string; weeklyMinor: number }[]
    ).find((c) => c.personId === capped);
    const maximumMinor =
      (lawInForce(api, "unemployment-weekly-maximum").value ?? 0) *
      api.parameter("minorPerDollar");
    if (!topClaim || topClaim.weeklyMinor < maximumMinor)
      throw new NoSubject(
        `no claimant earns above the weekly maximum (claim ${topClaim?.weeklyMinor} against ${maximumMinor}, claimant ${capped || "none filed"})`,
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
  for (const key of [KEYS.leave, KEYS.teacher, KEYS.federal].filter((k) =>
    keysHere.some(([, own]) => own === k),
  )) {
    const read = web.filter((m) => m.values[`law:${key}`] === 1);
    need(read.length > 0, `outcome web: never read ${key} as yes (${date})`);
  }
  // ---- the chain, by record id -----------------------------------------------
  // For each law: the `lawApplied` row of the engine that applied it, the
  // person, household, employer or counted group it reached, and the journal
  // entry that moved the money (found on the reached owner's own account).
  const evidence: Evidence[] = [];
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
  /** The group the next cites belong to; a cite outside this test's group is not made. */
  let group: Subject = "wage";
  const cite = (
    law: string,
    key: string,
    pick: (r: LawAppliedRow) => boolean,
    journalOf: (r: LawAppliedRow) => JournalEntry | undefined | string,
  ) => {
    if (!is(group)) return;
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
  cite("minimum-wage", "minimum-wage", raised, paid);
  cite("raise-federal-minimum-wage", KEYS.federal, raised, paid);
  cite("raise-minimum-wage", KEYS.raise, raised, paid);
  cite(
    "local-minimum-wage-authority (question)",
    KEYS.authority,
    (r) => r.target === "government" && r.targetId === draftedAt,
    () =>
      "none: the grant moves no money; the wage a council then enacts is the minimum-wage law's",
  );
  cite(
    `local-minimum-wage-authority (series, enacted as ${seriesGrant?.id})`,
    "local-minimum-wage-authority",
    (r) => r.target === "government" && r.targetId === draftedAt,
    () =>
      "none: the grant moves no money; the wage a council then enacts is the minimum-wage law's",
  );
  group = "bargaining";
  cite("public-sector-collective-bargaining", KEYS.bargaining, raised, paid);
  group = "leave";
  cite(
    "paid-family-leave",
    KEYS.leave,
    (r) => r.target === "person",
    (r) => entryOf(r.targetId, -1, /leave|premium|withhold/i, r.since),
  );
  group = "rtw";
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
  group = "taxes";
  for (const s of ["social-security-tax", "medicare-tax"])
    cite(
      s,
      s,
      (r) => r.target === "person",
      (r) => entryOf(r.targetId, -1, /withhold/i, r.since),
    );
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
            e.postings.some((p) => p.accountId === account && p.deltaMinor < 0),
        );
      },
    );
  const benefit = (who: string) =>
    entries.find((e) =>
      `${e.id} ${e.sourceId}`.includes(`unemployment-benefit:${who}:`),
    );
  group = "unemployment";
  cite(
    "unemployment-insurance",
    "unemployment-insurance",
    (r) => r.targetId === filed.full,
    (r) => benefit(r.targetId),
  );
  group = "maximum";
  cite(
    "unemployment-weekly-maximum",
    "unemployment-weekly-maximum",
    (r) => r.targetId === capped,
    (r) => benefit(r.targetId),
  );
  const cited: Record<Subject, number> = {
    maximum: 1,
    wage: 5,
    leave: 1,
    bargaining: 1,
    rtw: 1,
    teacher: 0,
    taxes: 4,
    unemployment: 1,
  };
  need(
    evidence.length === cited[subject],
    `evidence for ${evidence.length} of ${cited[subject]} laws: ${evidence.map((e) => e.law).join("; ")}`,
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
  const moved = [wage, bargaining, teacher].reduce(
    (total, list) => total + sum(list),
    0,
  );
  if (is("wage", "bargaining", "teacher"))
    need(moved > 0, "no pay raise moved money");

  // ---- repeal ends the reach -------------------------------------------------
  const repealedOn = addDays(makeIsoDate(api.state.date), 1);
  for (const [name, key] of keysHere) setQuestion(api, key, 0, `end-${name}`);
  step(3);
  for (const key of keysHere.map(([, k]) => k)) {
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
    const SUBJECTS: [Subject, string][] = [
      [
        "wage",
        "the federal and state minimum wage, the local-wage authority and the minimum-wage law",
      ],
      ["leave", "paid family leave"],
      ["bargaining", "public-sector collective bargaining"],
      ["rtw", "right to work"],
      ["teacher", "the teacher minimum salary"],
      ["taxes", "the four payroll taxes"],
      ["unemployment", "unemployment insurance"],
      ["maximum", "the unemployment weekly maximum"],
    ];
    for (const [subject, what] of SUBJECTS)
      it(`${what} is applied by its engine and recorded by record id (just like today: needs the state's real labor laws)`, () => {
        const was = setBookkeeping(false);
        const tried: string[] = [];
        try {
          for (let n = 0; n < TRIES; n += 1) {
            try {
              const { where, problems } = run(`labor-${subject}-${n}`, subject);
              if (tried.length)
                console.info(
                  `${subject}: passed over ${tried.length} places before ${where}: ${tried.join("; ")}`,
                );
              expect(problems, where).toEqual([]);
              return;
            } catch (error) {
              if (!(error instanceof NoSubject)) throw error;
              tried.push(`${lastWhere}: ${error.message}`);
            } finally {
              setJournalTrace(() => {});
            }
          }
          throw new Error(
            `no place with a subject for ${subject}: seed ${SEED}; ${tried.join("; ")}`,
          );
        } finally {
          setBookkeeping(was);
        }
      });

    // A state whose researched answer at the opening is yes on raising the
    // minimum wage: repeal the question and its own wage ends, so the next
    // level up governs; the workers keep the pay they have, and the ones
    // whose floor fell are no longer under it.
    it("repealing the raise-the-minimum-wage question ends the state's own wage and the next level's floor governs (just like today: needs the state's real labor laws)", () => {
      const was = setBookkeeping(false);
      const tried: string[] = [];
      try {
        for (let n = 0; n < TRIES; n += 1) {
          const drawn = drawPlace(SEED, `labor-repeal-${n}`);
          const where = `seed ${SEED}, place ${drawn.name} (${drawn.key})`;
          const world = buildBenchWorld(drawn.seed, gameStartDate(), {
            twoLevel: true,
            settings: { history: "today" },
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
