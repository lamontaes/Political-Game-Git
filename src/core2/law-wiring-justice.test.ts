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
import { appliedOn, type LawAppliedRow } from "./law-reach/applied";
import {
  amendBudget,
  budgetsOf,
  governments,
  type GovernmentRow,
} from "./modules/budgets";
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
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
  type SafetyMonth,
} from "./public-safety";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const TRIES = 3;
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
  readonly web: Map<string, number[]>;
  readonly after: Map<string, LawAppliedRow[]>;
  readonly monthsRun: SafetyMonth[];
  readonly cutService: number[];
  readonly missing: string[];
  /** Questions that were not law when the town opened. */
  readonly startedNo: Set<string>;
}

function attempt(trySeed: string, index: number): Attempt {
  const drawn = drawPlace(trySeed, `law-wiring-justice:${index}`);
  const where = `${drawn.name} (${drawn.key}), seed ${trySeed}`;
  const world = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  const posts = new Map<string, number>();
  setJournalTrace((input) => {
    const id = input.sourceRef.id;
    if (!id.startsWith("public-safety:")) return;
    const kind = id.split(":")[1]!;
    const gross = input.postings.reduce(
      (n, p) => n + Math.max(0, p.deltaMinor),
      0,
    );
    posts.set(kind, (posts.get(kind) ?? 0) + gross);
  });
  const rows = new Map<string, LawAppliedRow[]>();
  const after = new Map<string, LawAppliedRow[]>();
  const web = new Map<string, number[]>();
  const cutService: number[] = [];
  const keys = [...QUESTIONS, HANDGUN_AGE];
  const startedNo = new Set(
    keys.filter((key) => lawInForce(api, key).value !== 1),
  );
  try {
    // Phase one: the age limit on handgun sales is not law, so young adults buy.
    setQuestion(api, HANDGUN_AGE, 0);
    for (const key of QUESTIONS) setQuestion(api, key, 1);
    run(core, 45);
    const noLimit = new Map(posts);
    // Phase two: the limit is law, the sale is refused.
    setQuestion(api, HANDGUN_AGE, 1);
    run(core, 35);
    for (const key of keys) rows.set(key, [...appliedOn(api, key)]);
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
    // A cut police line gives less service, and putting it back gives it back.
    const gov =
      governments(api).find((g) => g.level === "city") ??
      governments(api).find((g) => g.level === "county") ??
      governments(api).find((g) => g.level === "state")!;
    const base = lineAmount(api, gov, "police");
    const monthsBefore = months(api).length;
    amendBudget(api, {
      governmentId: gov.id,
      line: "police",
      deltaMinor: -Math.round(base * 0.4),
      measureId: "test:police:cut",
    });
    run(core, 35);
    cutService.push(months(api).at(-1)!.policeService);
    amendBudget(api, {
      governmentId: gov.id,
      line: "police",
      deltaMinor: Math.round(base * 0.4),
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
    const missing = [
      ...keys.filter((key) => !rows.get(key)?.length),
      ...(rows.get(OVERSIGHT)?.some((r) => r.target === "organization")
        ? []
        : [`${OVERSIGHT} (a police department)`]),
      ...[CASH_BAIL, IMMIGRATION]
        .filter((key) => !rows.get(key)?.some((r) => r.target === "group"))
        .map((key) => `${key} (counted groups)`),
      ...[CHILD_ACCESS, CARRY_PERMIT, HANDGUN_AGE]
        .filter(
          (key) =>
            !rows.get(key)?.some((r) => r.target === "group" && r.count > 1),
        )
        .map((key) => `${key} (counted groups above one)`),
    ];
    return {
      where,
      rows,
      posts,
      web,
      after,
      monthsRun: months(api),
      cutService,
      missing,
      startedNo,
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
      let found: Attempt | null = null;
      for (let i = 0; i < TRIES && !found; i++) {
        const a = attempt(seed, i);
        tried.push(`${a.where}: no rows for ${a.missing.join(", ") || "none"}`);
        // A place with nobody to reach (no gun homes, no noncitizens) redraws.
        if (!a.missing.length) found = a;
      }
      expect(
        found,
        `no drawn place had a subject for every law: ${tried}`,
      ).not.toBeNull();
      const a = found!;
      const open = (key: string) =>
        (a.rows.get(key) ?? []).filter((r) => !r.endedOn);
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
      expect(open(OVERSIGHT).some((r) => r.target === "organization")).toBe(
        true,
      );

      // A cut gives less service and the restored line gives it back.
      const [cut, restored] = a.cutService;
      expect(cut!, `${a.where}: cut police service`).toBeLessThan(1);
      expect(restored!, `${a.where}: restored police service`).toBeGreaterThan(
        cut!,
      );

      // The web moved the measures the engine reads.
      // A web link moves only when its law differs from the town's start, so
      // a law already in force at the opening is checked on the handgun age
      // (repealed first) and on the laws that began as no.
      const dead = (
        [
          [CHILD_ACCESS, "child-access-law-to-youth-gun-deaths"],
          [HANDGUN_AGE, "min-age-to-youth-gun-suicide"],
          [CARRY_PERMIT, "concealed-carry-permit-to-firearm-homicide"],
          [OVERSIGHT, "civilian-oversight-to-crime"],
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
      void [
        POLICE_LINE,
        FIRE_LINE,
        CORRECTIONS_LINE,
        STAND_GROUND,
        JUVENILE_AGE,
      ];
    } finally {
      setBookkeeping(true);
    }
  }, 300_000);
});
