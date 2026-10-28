/**
 * The justice and public-safety laws, wired end to end in a played world: a
 * place and seed nobody chose, the bench world with every module installed.
 * Every family law is put in force, the town runs about two months of its
 * ordinary-crime case flow, and each law is checked by record id: the rows
 * the engine recorded where it applied the law (counted groups by count),
 * the money it moved through the journal, and the outcome-web effect that
 * moved the measure the engine reads. Then each law is repealed and its
 * rows end; a cut police line gives less service and a cut reverses.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { setJournalTrace } from "./journal-state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { electorateChange } from "./electorate-inputs";
import { RESTORE_VOTE } from "./law-reach/group-a-voting";
import { openReach, townAdults } from "./law-reach/group-a-records";
import {
  appliedEver,
  appliedOn,
  type LawAppliedRow,
} from "./law-reach/applied";
import {
  amendBudget,
  budgetsOf,
  governments,
  type GovernmentRow,
} from "./modules/budgets";
import {
  enactLaw,
  lawChain,
  lawInForce,
  LAWS_MODULE_ID,
  yesLevels,
} from "./modules/laws";
import { countedHouseholdOf, residentsRuntime } from "./modules/residents";
import { countedCases, type CountedCaseRow } from "./modules/justice";
import { reachParameter } from "./law-reach/group-a-records";
import type { LawRowInput } from "./laws-starting";
import {
  CARRY_PERMIT,
  CASH_BAIL,
  CHILD_ACCESS,
  CORRECTIONS_LINE,
  FIRE_LINE,
  HANDGUN_AGE,
  IMMIGRATION,
  JUVENILE_AGE,
  OVERSIGHT,
  POLICE_LINE,
  PUBLIC_SAFETY_MODULE_ID,
  STAND_GROUND,
  takeCensus,
  type GroupCensus,
  type SafetyMonth,
} from "./public-safety";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
// A place whose opening records give a law nobody to act on (no police
// department for oversight, no counted noncitizens for a detainer) is redrawn
// before anything is played: five draws.
const TRIES = 5;
const QUESTIONS = [
  OVERSIGHT,
  IMMIGRATION,
  CASH_BAIL,
  JUVENILE_AGE,
  CHILD_ACCESS,
  CARRY_PERMIT,
  STAND_GROUND,
];

function setQuestion(api: CoreAPI, key: string, value: 0 | 1): void {
  const date = addDays(makeIsoDate(api.state.date), 1);
  const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
  const levels = lawChain(api).levels;
  if (value === 0) {
    for (const { level, jurisdiction } of levels) {
      const latest = (
        laws.query("bySeries", [jurisdiction, key]) as unknown as LawRowInput[]
      )
        .filter((r) => r.effectiveDate <= api.state.date)
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
      if (latest?.value !== 1) continue;
      enactLaw(api, {
        jurisdiction,
        level,
        series: key,
        value: 0,
        effectiveDate: date,
        measureId: `test:${key}:repeal`,
        citation: "Test repeal",
      });
    }
    return;
  }
  const at =
    levels.find((l) => l.level === "city") ??
    levels.find((l) => l.level === "county") ??
    levels.find((l) => l.level === "state")!;
  enactLaw(api, {
    jurisdiction: at.jurisdiction,
    level: at.level,
    series: key,
    value: 1,
    effectiveDate: date,
    measureId: `test:${key}:enact`,
    citation: "Test enactment",
  });
}

const run = (core: CoreState, days: number) =>
  advanceCore(core, addDays(makeIsoDate(core.date), days));

/**
 * Plays `days` with the test's laws held where it set them. A body in play may
 * pass or repeal one of them (Delaware's legislature raised the handgun
 * purchase age on February 4, 2025, in the phase it must be off), and the test
 * puts it back the next day.
 */
function hold(
  api: CoreAPI,
  core: CoreState,
  days: number,
  values: readonly (readonly [string, 0 | 1])[],
): void {
  for (let day = 0; day < days; day += 1) {
    for (const [key, value] of values)
      if (lawInForce(api, key).value !== value) setQuestion(api, key, value);
    run(core, 1);
  }
}

function months(api: CoreAPI): SafetyMonth[] {
  return api
    .moduleState(PUBLIC_SAFETY_MODULE_ID)
    .table("months")
    .rows() as unknown as SafetyMonth[];
}

function lineAmount(api: CoreAPI, gov: GovernmentRow, line: string): number {
  const date = api.state.date;
  const budget = budgetsOf(api, gov.id)
    .filter((b) => b.startsOn <= date)
    .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0];
  return budget?.spendingMinor[line] ?? 0;
}

interface Attempt {
  readonly where: string;
  readonly rows: Map<string, LawAppliedRow[]>;
  readonly posts: Map<string, number>;
  /** Each law's evidence: the applied row, the journal entry on the account of the target that row names, and who that is. */
  readonly evidence: Map<string, Evidence>;
  /** For a law with no evidence, what its rows' targets held. */
  readonly unfound: Map<string, string>;
  readonly web: Map<string, number[]>;
  /** The minor-offense cases the case flow recorded (disorderly conduct, loitering and the like). */
  readonly minorCases: CountedCaseRow[];
  readonly after: Map<string, LawAppliedRow[]>;
  readonly monthsRun: SafetyMonth[];
  readonly cutService: number[];
  /** Laws with no applied record after play, in a place that had a subject for each. */
  readonly missing: string[];
  /** Questions that were not law when the town opened. */
  readonly startedNo: Set<string>;
  /** Whether an adult assault arrest, the subject of the self-defense law, was filed while the laws stood. */
  readonly assaultArrests: boolean;
}

/** One posting the journal made, kept to follow a target's money. */
interface Posted {
  readonly journal: string;
  readonly sourceId: string;
  readonly deltaMinor: number;
}
interface Evidence {
  readonly applied: string;
  readonly journal: string;
  readonly source: string;
  /** The account the entry posted on. */
  readonly account: string;
  /** Whom the row names: a person, household, organization, government or counted group. */
  readonly reached: string;
  readonly count: number;
}

/**
 * The accounts a target a law's row names holds its money in: a person's or an
 * organization's own, a household's members', a government's treasury, and a
 * counted group's fund (a counted worker's is their household's group's).
 */
function accountsOf(api: CoreAPI, row: LawAppliedRow): string[] {
  const core = api.state as CoreState;
  const held = (owner: string | undefined) => [
    ...(owner ? (core.cashJournal.accountsByOwner.get(owner) ?? []) : []),
  ];
  if (row.target === "person" || row.target === "organization")
    return held(row.targetId);
  if (row.target === "household")
    return (core.households.get(row.targetId)?.memberIds ?? []).flatMap(held);
  if (row.target === "government")
    return held(
      governments(api).find((g) => g.id === row.targetId)?.organizationId,
    );
  if (row.target !== "group" || row.targetId.endsWith(":under-age")) return [];
  // A counted worker a line hired is paid into their household's group's fund.
  const household = countedHouseholdOf(core, row.targetId);
  const group = household
    ? residentsRuntime(core)?.store.groups[household.group]?.id
    : row.targetId;
  return group ? [`fund:${group}`] : [];
}

/**
 * Whether a posting's source cites the law where its engine cites it: the
 * public-safety engine names its money by kind, a line's hires are paid under
 * a job whose id names the line, and a treasury pays a line under its name.
 */
/** A line's own money: a hire's paycheck, paid under a job whose id names the line, or its treasury's monthly payment, which names the line and the day. */
const underLine = (line: string) => (id: string) =>
  id.includes(line) ||
  new RegExp(
    `^treasury-[a-z]+:[a-z-]+:.+:${line.slice("budget-line:".length)}:\\d{4}-\\d{2}-\\d{2}$`,
  ).test(id);
const CITES: Record<string, (sourceId: string) => boolean> = {
  [OVERSIGHT]: (id) => id.startsWith("public-safety:oversight:"),
  [IMMIGRATION]: (id) => id.startsWith("public-safety:detainer:"),
  [CASH_BAIL]: (id) => id.startsWith("public-safety:jail:"),
  [JUVENILE_AGE]: (id) => id.startsWith("public-safety:court:"),
  [CHILD_ACCESS]: (id) => id.startsWith("public-safety:storage:"),
  [CARRY_PERMIT]: (id) => id.startsWith("public-safety:permit-fee:"),
  [HANDGUN_AGE]: (id) => id.startsWith("public-safety:handgun-sales:"),
  [STAND_GROUND]: (id) => id.startsWith("public-safety:court:"),
  [POLICE_LINE]: underLine(POLICE_LINE),
  [FIRE_LINE]: (id) =>
    id.startsWith("public-safety:fire-loss:") || underLine(FIRE_LINE)(id),
  [CORRECTIONS_LINE]: underLine(CORRECTIONS_LINE),
};

/**
 * A law's evidence: of the rows its engine recorded (those that name money
 * first), the first whose target holds an account with a posting whose source
 * cites the law where the engine cites it. Null where no row has one.
 */
function evidenceOf(
  api: CoreAPI,
  key: string,
  rows: readonly LawAppliedRow[],
  byAccount: ReadonlyMap<string, readonly Posted[]>,
): Evidence | null {
  const cites = CITES[key]!;
  const ordered = [
    ...rows.filter((r) => r.amountMinor !== 0),
    ...rows.filter((r) => r.amountMinor === 0),
  ];
  for (const row of ordered)
    for (const account of accountsOf(api, row)) {
      const posted = (byAccount.get(account) ?? []).find((p) =>
        cites(p.sourceId),
      );
      if (posted)
        return {
          applied: row.id,
          journal: posted.journal,
          source: posted.sourceId,
          account,
          reached: row.targetId,
          count: row.count,
        };
    }
  return null;
}

/**
 * The subjects a drawn town lacks, read from its opening records before
 * anything is played, through the public safety engine's own census: a
 * police department for oversight, counted groups for bail and their
 * noncitizens for the detainers, and counted gun homes standing for more than
 * one household with a child, adult of 21 and over or adult of 18 to 20. A
 * town lacking none must show every law applied after play.
 */
function lacking(api: CoreAPI): string[] {
  const census = takeCensus(api);
  const gunGroups = (of: (g: GroupCensus) => number) =>
    census.groups.some((g) => Math.round(of(g) * census.gunRate) > 1);
  const needs: [string, boolean][] = [
    [
      "a police department",
      [...api.state.organizations.values()].some(
        (o) =>
          o.placeId === census.placeId &&
          (o.classification ?? "").startsWith("service:police"),
      ),
    ],
    ["counted groups", census.groups.some((g) => g.band.some((n) => n > 0))],
    [
      "counted noncitizens",
      census.groups.some((g) => g.nonCitizen.some((n) => n > 0)),
    ],
    ["counted gun homes with a child", gunGroups((g) => g.childHouseholds)],
    ["counted gun owners 21 and over", gunGroups((g) => g.adults21)],
    ["counted gun buyers 18 to 20", gunGroups((g) => g.adults18to20)],
  ];
  return needs.filter(([, has]) => !has).map(([what]) => what);
}

/** Builds a drawn town and reads, from its opening records, what subjects it lacks. */
function draw(
  trySeed: string,
  index: number,
): { where: string; core: CoreState; lacks: string[] } {
  const drawn = drawPlace(trySeed, `law-wiring-justice:${index}`);
  const where = `${drawn.name} (${drawn.key}), seed ${trySeed}`;
  const world = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  });
  return { where, core: world.core, lacks: lacking(coreAPI(world.core)) };
}

/** Plays an eligible town: the lines raised, the laws in force, the cut, the repeal. */
function play(where: string, core: CoreState): Attempt {
  const api = coreAPI(core);
  const posts = new Map<string, number>();
  const byAccount = new Map<string, Posted[]>();
  setJournalTrace((input) => {
    const id = input.sourceRef.id;
    // Every posting by its account, to follow a target's own money.
    for (const p of input.postings) {
      const list = byAccount.get(p.accountId) ?? [];
      list.push({ journal: input.id, sourceId: id, deltaMinor: p.deltaMinor });
      byAccount.set(p.accountId, list);
    }
    if (!id.startsWith("public-safety:")) return;
    const kind = id.split(":")[1]!;
    const gross = input.postings.reduce(
      (n, p) => n + Math.max(0, p.deltaMinor),
      0,
    );
    posts.set(kind, (posts.get(kind) ?? 0) + gross);
  });
  const rows = new Map<string, LawAppliedRow[]>();
  const evidence = new Map<string, Evidence>();
  const unfound = new Map<string, string>();
  const after = new Map<string, LawAppliedRow[]>();
  const web = new Map<string, number[]>();
  const cutService: number[] = [];
  const keys = [...QUESTIONS, HANDGUN_AGE];
  const lines = [POLICE_LINE, FIRE_LINE, CORRECTIONS_LINE];
  const startedNo = new Set(
    keys.filter((key) => !yesLevels(api, key).length > 0),
  );
  try {
    // The three service lines are raised by a measure of their own, so
    // the departments' service has a statute to stand on.
    const lineGov =
      governments(api).find((g) => g.level === "city") ??
      governments(api).find((g) => g.level === "county") ??
      governments(api).find((g) => g.level === "state")!;
    // Each line is raised by as much as it holds or by three positions' pay,
    // whichever is more, so the department it funds posts openings (a tenth of
    // a small department's staff is not half a position) and the government
    // pays the positions of a line with no department in the town.
    const originalLine = new Map<string, number>();
    for (const line of ["police", "fire", "corrections"]) {
      originalLine.set(line, lineAmount(api, lineGov, line));
      amendBudget(api, {
        governmentId: lineGov.id,
        line,
        deltaMinor: Math.max(
          3 * reachParameter("publicPositionAnnualMinor"),
          originalLine.get(line)!,
        ),
        measureId: `test:${line}:raise`,
      });
    }
    // Phase one: the age limit on handgun sales is not law, so young adults buy.
    setQuestion(api, HANDGUN_AGE, 0);
    for (const key of QUESTIONS) setQuestion(api, key, 1);
    const questionsOn = QUESTIONS.map((key) => [key, 1] as const);
    hold(api, core, 45, [[HANDGUN_AGE, 0], ...questionsOn]);
    const noLimit = new Map(posts);
    // Phase two: the limit is law, the sale is refused.
    setQuestion(api, HANDGUN_AGE, 1);
    hold(api, core, 35, [[HANDGUN_AGE, 1], ...questionsOn]);
    // A law's records, open and ended: a body in play may repeal a law the
    // test put in force (Columbia Falls, Montana's council repealed oversight
    // and the immigration partnership on February 20, 2025), which ends the
    // records its engine wrote while it stood.
    for (const key of [...keys, ...lines])
      rows.set(key, [...appliedEver(api, key)]);
    // Self-defense claims arise only from an adult assault arrest, which
    // follows an assault the crime engine recorded and the police were told
    // of: a small town can go the months played without one.
    const assaultArrests = [
      ...countedCases(api, "charged"),
      ...countedCases(api, "decided"),
    ].some((c) => c.offense === "assault" && c.court === "adult");
    for (const [kind, gross] of noLimit) posts.set(`first:${kind}`, gross);
    // The outcome web's month rows for the measures the engine reads.
    const webTable = api
      .moduleState("core2-outcome-web-v1")
      .table("months")
      .rows() as unknown as {
      effects: Record<string, number>;
      month: string;
    }[];
    for (const row of webTable)
      for (const [link, effect] of Object.entries(row.effects))
        web.set(link, [...(web.get(link) ?? []), effect]);
    // The minor offenses the case flow recorded while the police line stood a tenth above where it began.
    const minorCases = [
      ...countedCases(api, "charged"),
      ...countedCases(api, "decided"),
    ].filter((c) => c.offense === "lowlevel");
    // A cut police line gives less service, and putting it back gives it back.
    const gov =
      governments(api).find((g) => g.level === "city") ??
      governments(api).find((g) => g.level === "county") ??
      governments(api).find((g) => g.level === "state")!;
    // The line is cut to three fifths of what it began the year at.
    const cutBy =
      lineAmount(api, gov, "police") -
      Math.round(originalLine.get("police")! * 0.6);
    const monthsBefore = months(api).length;
    amendBudget(api, {
      governmentId: gov.id,
      line: "police",
      deltaMinor: -cutBy,
      measureId: "test:police:cut",
    });
    run(core, 35);
    cutService.push(months(api).at(-1)!.policeService);
    amendBudget(api, {
      governmentId: gov.id,
      line: "police",
      deltaMinor: cutBy,
      measureId: "test:police:restore",
    });
    run(core, 35);
    cutService.push(months(api).at(-1)!.policeService);
    expect(months(api).length, where).toBeGreaterThan(monthsBefore);
    // Repeal everything: the rows end.
    for (const key of keys) setQuestion(api, key, 0);
    run(core, 3);
    for (const key of keys) after.set(key, [...appliedOn(api, key)]);
    // Cases are fractions of a person a month in a small town, so the arrest
    // laws need a counted group row; the laws on people need a count above one.
    const refusedOrPaid = (key: string, what: string) =>
      rows
        .get(key)
        ?.some((r) => r.target === "group" && r.what === what && r.count > 1);
    const missing = [
      ...[...keys, ...lines].filter((key) => !rows.get(key)?.length),
      ...(rows.get(OVERSIGHT)?.some((r) => r.target === "organization")
        ? []
        : [`${OVERSIGHT} (a police department)`]),
      ...[CASH_BAIL, IMMIGRATION]
        .filter((key) => !rows.get(key)?.some((r) => r.target === "group"))
        .map((key) => `${key} (counted groups)`),
      // The groups must be the ones the engine applied the law to (a refused sale,
      // a permit fee, a lock), not the youth measure's read of the whole town.
      ...(
        [
          [CHILD_ACCESS, "storage-duty"],
          [CARRY_PERMIT, "permit-fee"],
          [HANDGUN_AGE, "sale-refused-under-age"],
        ] as const
      )
        .filter(([key, what]) => !refusedOrPaid(key, what))
        .map(([key]) => `${key} (counted groups above one)`),
    ];
    // Each law's evidence, from the rows it recorded before the repeal and
    // every posting the run made (a line's hires are paid weeks after they start).
    for (const key of [...keys, ...lines]) {
      const found = evidenceOf(api, key, rows.get(key) ?? [], byAccount);
      if (found) evidence.set(key, found);
      else
        unfound.set(
          key,
          [...(rows.get(key) ?? [])]
            .sort(
              (x, y) =>
                Number(x.target === "group") - Number(y.target === "group"),
            )
            .slice(0, 4)
            .map((r) => {
              const accounts = accountsOf(api, r);
              const posted = accounts.flatMap((id) => byAccount.get(id) ?? []);
              return `${r.target} ${r.targetId} ${r.what} since ${r.since} amount ${r.amountMinor}: ${accounts.length} accounts, ${posted.length} postings, e.g. ${posted
                .slice(0, 5)
                .map((p) => p.sourceId)
                .join(
                  " | ",
                )}; job ${(api.state as CoreState).people.get(r.targetId)?.jobId ?? "none"}`;
            })
            .join("; "),
        );
    }
    return {
      where,
      rows,
      posts,
      evidence,
      unfound,
      web,
      minorCases,
      after,
      monthsRun: months(api),
      cutService,
      missing,
      startedNo,
      assaultArrests,
    };
  } finally {
    setJournalTrace(null);
  }
}

describe(`justice and public safety laws in a played world (seed ${seed})`, () => {
  it("applies each law to people and groups, moves money, and ends on repeal", () => {
    setBookkeeping(false);
    try {
      const tried: string[] = [];
      let a: ReturnType<typeof play> | null = null;
      for (let i = 0; i < TRIES && !a; i++) {
        const d = draw(seed, i);
        // A town whose opening records give a law nobody to act on (no gun
        // homes, no noncitizens) is redrawn before play.
        if (d.lacks.length) {
          tried.push(`${d.where}: lacks ${d.lacks.join(", ")}`);
          continue;
        }
        const played = play(d.where, d.core);
        if (!played.assaultArrests) {
          tried.push(`${d.where}: no assault reported to police in play`);
          continue;
        }
        a = played;
      }
      expect(
        a,
        `no drawn place had a subject for every law: ${tried}`,
      ).not.toBeNull();
      a = a!;
      // The town had a subject for every law, so each must have applied it.
      expect(
        a.missing,
        `${a.where}: laws with no applied record after play`,
      ).toEqual([]);
      console.log(
        `law-wiring-justice passed in ${a.where}; passed over: ${tried.join("; ") || "none"}`,
      );
      const groups = (key: string) =>
        (a.rows.get(key) ?? []).filter((r) => r.target === "group");
      const moneyOf = (key: string) =>
        (a.rows.get(key) ?? []).reduce(
          (n, r) => n + Math.abs(r.amountMinor),
          0,
        );

      // The case flow ran: arrests came from the crime measures.
      expect(a.monthsRun.length, a.where).toBeGreaterThan(0);
      expect(
        a.monthsRun.reduce((n, m) => n + m.arrests, 0),
        `${a.where}: arrests`,
      ).toBeGreaterThan(0);

      // The minor offenses were recorded as cases, read the web's police
      // factor, and the sized link moved their rate: the raised police line
      // reached these arrests (disorderly conduct, loitering, drug possession
      // and the like).
      expect(
        a.minorCases.length,
        `${a.where}: minor-offense cases`,
      ).toBeGreaterThan(0);
      expect(
        a.monthsRun.reduce((n, m) => n + m.lowLevelArrests, 0),
        `${a.where}: minor-offense arrests`,
      ).toBeGreaterThan(0);
      expect(
        (a.web.get("police-to-low-level-arrests") ?? []).some((e) => e > 0),
        `${a.where}: police-to-low-level-arrests moved up with the raised police line (links seen: ${[...a.web.keys()].join(", ")})`,
      ).toBe(true);
      const minor = a.minorCases.find((c) => c.webRecordId);
      expect(
        minor,
        `${a.where}: a minor case that names its web row`,
      ).toBeDefined();
      const drug = a.minorCases.find((c) => c.category === "drugPossession");
      expect(
        drug?.webRecordId,
        `${a.where}: a drug possession case that names its web row`,
      ).toBeTruthy();
      console.log(
        `law-wiring-justice minor offenses in ${a.where}: ${a.minorCases.length} cases, e.g. ${minor?.id} read ${minor?.webRecordId} at ${minor?.officersPer1000?.toFixed(3)} officers per 1,000; drug possession ${drug?.id} read ${drug?.webRecordId}`,
      );

      // Every law recorded an application, and the counted tier by count.
      for (const key of [...QUESTIONS, HANDGUN_AGE])
        expect(
          a.rows.get(key)?.length,
          `${a.where}: ${key} rows`,
        ).toBeGreaterThan(0);
      for (const key of [CHILD_ACCESS, CARRY_PERMIT, HANDGUN_AGE])
        expect(
          groups(key).some((r) => r.count > 1),
          `${a.where}: ${key} counted groups`,
        ).toBe(true);
      for (const key of [CASH_BAIL, IMMIGRATION])
        expect(groups(key).length, `${a.where}: ${key} groups`).toBeGreaterThan(
          0,
        );

      // Money through the journal: fees, devices, sales, boards, holds and days.
      expect(
        a.posts.get("permit-fee") ?? 0,
        `${a.where}: permit fees`,
      ).toBeGreaterThan(0);
      expect(
        moneyOf(CARRY_PERMIT),
        `${a.where}: permit row money`,
      ).toBeGreaterThan(0);
      expect(
        a.posts.get("storage") ?? 0,
        `${a.where}: lockboxes`,
      ).toBeGreaterThan(0);
      expect(moneyOf(CHILD_ACCESS)).toBeGreaterThan(0);
      expect(
        a.posts.get("oversight") ?? 0,
        `${a.where}: board`,
      ).toBeGreaterThan(0);
      expect(moneyOf(OVERSIGHT)).toBeGreaterThan(0);
      expect(
        a.posts.get("first:handgun-sales") ?? 0,
        `${a.where}: sales before the limit`,
      ).toBeGreaterThan(0);
      expect(moneyOf(HANDGUN_AGE), `${a.where}: refused sales`).toBeGreaterThan(
        0,
      );
      expect(
        a.posts.get("court") ?? 0,
        `${a.where}: court costs`,
      ).toBeGreaterThan(0);
      expect(a.posts.get("jail") ?? 0, `${a.where}: jail days`).toBeGreaterThan(
        0,
      );
      expect(
        a.posts.get("detainer") ?? 0,
        `${a.where}: detainer holds`,
      ).toBeGreaterThan(0);
      expect(moneyOf(IMMIGRATION)).toBeGreaterThan(0);
      expect(
        moneyOf(CASH_BAIL),
        `${a.where}: avoided jail days`,
      ).toBeGreaterThan(0);
      expect(
        (a.rows.get(OVERSIGHT) ?? []).some((r) => r.target === "organization"),
        `${a.where}: the oversight board reached the police department`,
      ).toBe(true);

      // A cut gives less service and the restored line gives it back.
      const [cut, restored] = a.cutService;
      expect(cut!, `${a.where}: cut police service`).toBeLessThan(1);
      expect(restored!, `${a.where}: restored police service`).toBeGreaterThan(
        cut!,
      );

      // The web moved the measures the engine reads.
      // The oversight link has a 12-month lag, longer than this run, so it is not checked here.
      // A web link moves only when its law differs from the town's start, so
      // a law already in force at the opening is checked on the handgun age
      // (repealed first) and on the laws that began as no.
      const dead = (
        [
          [CHILD_ACCESS, "child-access-law-to-youth-gun-deaths"],
          [HANDGUN_AGE, "min-age-to-youth-gun-suicide"],
          [CARRY_PERMIT, "concealed-carry-permit-to-firearm-homicide"],
        ] as const
      )
        .filter(([key]) => key === HANDGUN_AGE || a.startedNo.has(key))
        .map(([, link]) => link)
        .filter((link) => !(a.web.get(link) ?? []).some((e) => e !== 0));
      expect(
        dead,
        `${a.where}: web links that never moved (links seen: ${[...a.web.keys()].join(", ")})`,
      ).toEqual([]);
      expect(
        a.monthsRun.some((m) => m.youthFirearmDeathsExpected > 0),
        `${a.where}: youth measure read`,
      ).toBe(true);

      // A repeal ends every row.
      for (const key of [...QUESTIONS, HANDGUN_AGE])
        expect(
          (a.after.get(key) ?? []).filter((r) => !r.endedOn).map((r) => r.id),
          `${a.where}: ${key} after repeal`,
        ).toEqual([]);
      // The three service lines were raised by a measure of their own, and
      // each reached the counted people its department serves.
      for (const line of [POLICE_LINE, FIRE_LINE, CORRECTIONS_LINE])
        expect(
          groups(line).some((r) => !r.endedOn && r.count >= 1),
          `${a.where}: ${line} groups`,
        ).toBe(true);

      // Each law by record id: the applied row, the journal entry on the
      // account of the target that row names (a household's members', a
      // counted group's fund) whose source cites the law where its engine
      // cites it, and who that is. A law with no such entry is not followed.
      const evidence = [
        ...QUESTIONS,
        HANDGUN_AGE,
        POLICE_LINE,
        FIRE_LINE,
        CORRECTIONS_LINE,
      ].map((key) => ({
        key,
        law: key.replace(/^.*[.:]/, ""),
        found: a.evidence.get(key),
      }));
      console.log(
        `law-wiring-justice evidence in ${a.where}:\n${evidence
          .map(
            (e) =>
              `  ${e.law}: ${e.found ? `${e.found.applied} | ${e.found.journal} (${e.found.source}) on ${e.found.account} | reached ${e.found.reached} x${e.found.count}` : "none"}`,
          )
          .join("\n")}`,
      );
      // The nine laws of laws-nine-links-justice-nine must each be followed.
      // The police and corrections lines stay with the family item: their
      // money goes through hires and transfers this test does not yet follow
      // (laws-checker-follows-line-transfers), so it is printed, not required.
      const nine = new Set<string>([...QUESTIONS, HANDGUN_AGE, FIRE_LINE]);
      for (const e of evidence) {
        if (!nine.has(e.key)) continue;
        expect(
          e.found,
          `${a.where}: ${e.law} has no journal entry on the account of a target its applied rows name, citing it (${a.unfound.get(e.key)})`,
        ).toBeTruthy();
        expect(
          e.found!.applied,
          `${a.where}: ${e.law} applied row`,
        ).toBeTruthy();
        expect(e.found!.journal, `${a.where}: ${e.law} journal entry`).toMatch(
          /^journal:/,
        );
      }
    } finally {
      setBookkeeping(true);
    }
    // Up to five towns built, one played, then the year's checks.
  }, 900_000);

  it("restoring the vote after a sentence changes who the electorate counts as barred", () => {
    setBookkeeping(false);
    try {
      const tried: string[] = [];
      for (let i = 0; i < TRIES; i++) {
        const drawn = drawPlace(seed, `law-wiring-justice:restore:${i}`);
        const where = `${drawn.name} (${drawn.key}), seed ${seed}`;
        const world = buildBenchWorld(drawn.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: drawn.key,
        });
        const core = world.core;
        const api = coreAPI(core);
        // A day after each change, the election engine's read of the law.
        setQuestion(api, RESTORE_VOTE, 0);
        run(core, 2);
        const without = electorateChange(api).barred;
        setQuestion(api, RESTORE_VOTE, 1);
        run(core, 2);
        const withLaw = electorateChange(api).barred;
        // Maine, Vermont, D.C. and Puerto Rico bar no one: nothing to restore.
        if (!(without > 0)) {
          tried.push(`${where}: nobody barred`);
          continue;
        }
        // The restoration reaches the town's adults by the estimated share of
        // them whose sentence is done; in a town so small that share is under
        // half a person, no one is restored and there is no row to show.
        const adults = townAdults(api);
        const restoredHere = Math.round(
          adults * reachParameter("restoredVoterShare"),
        );
        if (restoredHere < 1) {
          tried.push(
            `${where}: ${adults} adults leave under half a person restored`,
          );
          continue;
        }
        const rows = openReach(api, RESTORE_VOTE);
        console.log(
          `law-wiring-justice restore voting in ${where}: barred share ${without} -> ${withLaw}; reach rows ${rows
            .slice(0, 2)
            .map((r) => r.id)
            .join(", ")}`,
        );
        expect(withLaw, where).toBeLessThan(without);
        expect(rows.length, `${where}: restored-voter rows`).toBeGreaterThan(0);
        // Repealed, the share goes back and the rows end.
        setQuestion(api, RESTORE_VOTE, 0);
        run(core, 2);
        expect(electorateChange(api).barred, where).toBe(without);
        expect(openReach(api, RESTORE_VOTE), where).toHaveLength(0);
        return;
      }
      throw new Error(`no drawn place had anyone to restore: ${tried}`);
    } finally {
      setBookkeeping(true);
    }
  }, 300_000);
});
