/**
 * The tax and public-finance laws, wired end to end in a played world: a
 * place and seed nobody chose, the bench world with every module installed.
 * The income tax is raised, the fiscal policy questions are put in force and
 * the town runs about half a year (paydays, monthly property-tax bills and
 * a quarter's corporate tax). Each law is then checked by the rows the engine
 * recorded where it applied it, with the money; an estate settles under a
 * death tax the test sets low enough to reach it; a local body drafts an
 * income-tax bill under the state's authority; and the rows end on repeal.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { setJournalTrace } from "./journal-state";
import { gameStartDate } from "./game-start";
import { heirsOf, settleCountedEstate, settleEstate } from "./estates";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn, type LawAppliedRow } from "./law-reach/applied";
import { advanceCore } from "./life";
import type { LawRowInput } from "./laws-starting";
import {
  EMPLOYER_TAXES_MODULE_ID,
  profitTaxesOf,
} from "./modules/employer-taxes";
import { amendBudget, budgetsOf, governments } from "./modules/budgets";
import {
  countedEstateOf,
  householdCash,
  removeCountedPerson,
  residentsRuntime,
} from "./modules/residents";
import { billCatalog } from "./bill-catalog";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { ownerOf } from "./modules/business";
import { outsideAccountOf, treasuryMonthsOf } from "./budgets-treasury";
import {
  bodyOf,
  draftBill,
  LEGISLATURE_MODULE_ID,
} from "./modules/legislature";
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState, Source } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const TRIES = 4;
const ADOPT = "us-policy-positions:fiscal.adopt-income-tax";
const GRADUATED = "us-policy-positions:fiscal.graduated-income-tax";
const CAP = "us-policy-positions:fiscal.cap-property-tax-growth";
const BALANCED = "us-policy-positions:fiscal.balanced-operating-budget";
const PENSIONS = "us-policy-positions:fiscal.fund-pensions-to-schedule";
const RESERVE = "us-policy-positions:fiscal.minimum-reserve-balance";
const QUESTIONS = [ADOPT, GRADUATED, CAP, BALANCED, PENSIONS, RESERVE];

const run = (core: CoreState, days: number) =>
  advanceCore(core, addDays(makeIsoDate(core.date), days));

function setQuestion(
  api: CoreAPI,
  key: string,
  value: 0 | 1,
  atLevel?: string,
): void {
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
    levels.find((l) => l.level === atLevel) ??
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

/** Change the governing row of an amount series by a factor (the terms stay), from tomorrow. */
function scaleAmount(api: CoreAPI, series: string, factor: number): string {
  // An empty id: the place has no row to change (a state with no income tax).
  const g = lawInForce(api, series).governing as LawRowInput | null;
  if (!g || typeof g.value !== "number") return "";
  const row = enactLaw(api, {
    jurisdiction: g.jurisdiction,
    level: g.level,
    series,
    value: Math.round(Number(g.value) * factor * 1000) / 1000,
    effectiveDate: addDays(makeIsoDate(api.state.date), 1),
    measureId: `test:${series}:${factor}`,
    citation: "Test amendment",
    ...(g.unit ? { unit: g.unit } : {}),
    ...(g.terms ? { terms: { ...g.terms } } : {}),
  });
  return row.id;
}

const keysOf = (api: CoreAPI, key: string) => [...appliedOn(api, key)];

/** The journal posts for an estate's transfers (the source names the transfer), with the money each moved, while `act` runs. */
function estatePosts(
  act: () => void,
): { id: string; source: string; minor: number }[] {
  const posts: { id: string; source: string; minor: number }[] = [];
  setJournalTrace((input) => {
    if (!input.sourceRef.id.includes("estate:")) return;
    posts.push({
      id: input.id,
      source: input.sourceRef.id,
      minor: input.postings.reduce(
        (n, p) => n + (p.deltaMinor > 0 ? p.deltaMinor : 0),
        0,
      ),
    });
  });
  try {
    act();
  } finally {
    setJournalTrace(null);
  }
  return posts;
}

interface Attempt {
  readonly where: string;
  readonly api: CoreAPI;
  readonly core: CoreState;
  readonly ids: Record<string, string>;
  readonly missing: string[];
  /** Every journal post of the run: its id and what names it (source, accounts). */
  readonly posts: { id: string; text: string }[];
}

function attempt(index: number): Attempt {
  const drawn = drawPlace(seed, `law-wiring-taxes:${index}`);
  const where = `${drawn.name} (${drawn.key}), seed ${seed}`;
  const world = buildBenchWorld(drawn.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: drawn.key,
  });
  const core = world.core;
  const api = coreAPI(core);
  const ids: Record<string, string> = {};
  for (const key of QUESTIONS)
    setQuestion(api, key, 1, key === CAP ? undefined : "state");
  // The acts take effect first (adopting or graduating writes its own income-tax
  // row); the rates are then raised on the rows in force.
  run(core, 3);
  ids.income = scaleAmount(api, "income-tax", 1.1);
  ids.property = scaleAmount(api, "property-tax", 1.1);
  ids.corporate = scaleAmount(api, "corporate-income-tax", 1.1);
  // Two quarter days pass (the first only opens the books), so a quarter of
  // profit is taxed: April 1 and July 1 after the January 20 start.
  // A body in play may repeal one of these acts during the run (a state
  // legislature voting the income tax questions down); the test puts it back
  // each month so every read happens under it.
  // Putting an income tax question back writes its own income-tax row, so the
  // raise is made again on the row then in force.
  // The journal's posts for the run, so each law's money is named by its entry.
  const posts: { id: string; text: string }[] = [];
  setJournalTrace((input) => {
    posts.push({
      id: input.id,
      text: `${input.sourceRef.kind} ${input.sourceRef.id} ${input.postings
        .map((p) => p.accountId)
        .join(" ")}`,
    });
  });
  try {
    for (let day = 0; day < 170; day += 30) {
      const back = QUESTIONS.filter((key) => lawInForce(api, key).value !== 1);
      for (const key of back)
        setQuestion(api, key, 1, key === CAP ? undefined : "state");
      if (back.includes(ADOPT) || back.includes(GRADUATED)) {
        run(core, 2);
        ids.income = scaleAmount(api, "income-tax", 1.1);
      }
      run(core, Math.min(30, 170 - day));
    }
  } finally {
    setJournalTrace(null);
  }
  // The web's pay link reads the state's corporate rate: a state with none has
  // nothing to move, so the place is redrawn.
  const stateRate = lawInForce(api, "corporate-income-tax").levels.find(
    (l) => l.level === "state" && !l.setAside,
  )?.row?.value;
  const missing = [
    "income-tax",
    "property-tax",
    "corporate-income-tax",
    ...QUESTIONS,
  ]
    .filter((key) => !keysOf(api, key).length)
    .concat(stateRate && stateRate > 0 ? [] : ["a state corporate rate"])
    .concat(
      Object.entries(ids)
        .filter(([, id]) => !id)
        .map(([name]) => `${name} law row`),
    );
  return { where, api, core, ids, missing, posts };
}

describe(`tax and public finance laws in a played world (seed ${seed})`, () => {
  it(
    "applies each law to people, groups and treasuries, moves money, and ends on repeal",
    // Each attempt builds a town and runs 170 days; up to four towns may be drawn.
    { timeout: 900_000 },
    () => {
      setBookkeeping(false);
      try {
        const tried: string[] = [];
        let found: Attempt | null = null;
        for (let i = 0; i < TRIES && !found; i++) {
          const a = attempt(i);
          tried.push(
            `${a.where}: no rows for ${a.missing.join(", ") || "none"}`,
          );
          // A place with no subject for a law (no owners, no business owned by
          // an organization) redraws; every place tried is named on failure.
          if (!a.missing.length) found = a;
        }
        expect(
          found,
          `no drawn place had a subject for every law: ${tried.join("; ")}`,
        ).not.toBeNull();
        const { api, core, ids, where, posts: runPosts } = found!;
        const rows = (key: string) => keysOf(api, key);
        const open = (key: string) => rows(key).filter((r) => !r.endedOn);
        const money = (list: readonly LawAppliedRow[]) =>
          list.reduce((n, r) => n + Math.abs(r.amountMinor), 0);

        // Income tax: withheld at the new rate from full workers and from
        // counted groups (by their workers), citing the raised row.
        const income = rows("income-tax");
        const raised = income.filter((r) => r.lawId === ids.income);
        expect(
          raised.length,
          `${where}: rows citing ${ids.income}`,
        ).toBeGreaterThan(0);
        expect(
          raised.some((r) => r.target === "person" && r.amountMinor > 0),
          `${where}: a full worker's withholding at ${ids.income}`,
        ).toBe(true);
        expect(
          raised.some(
            (r) => r.target === "group" && r.count >= 1 && r.amountMinor > 0,
          ),
          `${where}: a counted group's withholding at ${ids.income}: ${JSON.stringify(
            income
              .filter((r) => r.target === "group")
              .slice(0, 4)
              .map((r) => [r.targetId, r.lawId, r.count, r.amountMinor]),
          )} of ${income.length} rows`,
        ).toBe(true);

        // The two income-tax policy questions reach the same workers.
        for (const key of [ADOPT, GRADUATED]) {
          const list = open(key);
          expect(list.length, `${where}: ${key} rows`).toBeGreaterThan(0);
          expect(money(list), `${where}: ${key} money`).toBeGreaterThan(0);
        }

        // Property tax: owner households, full and counted, billed at the new rate.
        const property = rows("property-tax").filter(
          (r) => r.lawId === ids.property,
        );
        expect(
          property.some((r) => r.target === "household"),
          `${where}: full owners`,
        ).toBe(true);
        expect(
          property.some((r) => r.target === "group" && r.count >= 1),
          `${where}: counted owners`,
        ).toBe(true);
        expect(
          money(property),
          `${where}: property tax billed`,
        ).toBeGreaterThan(0);
        // The growth cap names the capped owners (the money it saved shows once values outgrow it).
        expect(open(CAP).length, `${where}: capped owners`).toBeGreaterThan(0);

        // Corporate tax: a quarter's profit of an organization's business, to the treasuries.
        const profits = core.modules.has(EMPLOYER_TAXES_MODULE_ID)
          ? (api
              .moduleState(EMPLOYER_TAXES_MODULE_ID)
              .table("profits")
              .rows() as unknown as {
              lawIds: string[];
              postings: unknown[];
            }[])
          : [];
        expect(profits.length, `${where}: profit-tax records`).toBeGreaterThan(
          0,
        );
        const corporate = rows("corporate-income-tax");
        expect(corporate.length, `${where}: corporate rows`).toBeGreaterThan(0);
        expect(
          corporate.every((r) => r.target === "organization"),
          `${where}: corporate targets`,
        ).toBe(true);
        // The state's raised rate is the web's cause for the pay link: the
        // town's month records carry its effect, and pay falls with the tax.
        const months = (core.modules.has(OUTCOME_WEB_MODULE_ID)
          ? api.moduleState(OUTCOME_WEB_MODULE_ID).table("months").rows()
          : []) as unknown as WebMonth[];
        const incidence = months
          .map((row) => row.effects?.["corporate-tax-incidence"] ?? 0)
          .filter((effect) => effect !== 0);
        expect(
          incidence.length,
          `${where}: web month records with the corporate pay link moving`,
        ).toBeGreaterThan(0);
        expect(
          incidence.every((effect) => effect < 0),
          `${where}: a higher corporate rate lowers pay (${incidence.join(", ")})`,
        ).toBe(true);

        // The balanced budget, pensions and reserve acts reach the treasury.
        for (const key of [BALANCED, PENSIONS, RESERVE])
          expect(
            open(key).some((r) => r.target === "government"),
            `${where}: ${key} treasury`,
          ).toBe(true);
        expect(
          money(open(PENSIONS)),
          `${where}: pension contribution`,
        ).toBeGreaterThan(0);
        // The pension rule also names the public workers it funds, full and counted.
        expect(
          open(PENSIONS).filter(
            (r) =>
              (r.target === "person" || r.target === "group") && r.count >= 1,
          ).length,
          `${where}: public workers whose pensions are funded`,
        ).toBeGreaterThan(0);
        // Each law's money is named by a journal entry of the run: the posting
        // that moved it, found by the record it was paid for (the worker, the
        // owner household, the business, the treasury's owner).
        const evidence: string[] = [];
        const named = (
          label: string,
          list: readonly LawAppliedRow[],
          owner: (row: LawAppliedRow) => string = (row) => row.targetId,
        ) => {
          for (const row of [...list].sort(
            (a, b) => Math.abs(b.amountMinor) - Math.abs(a.amountMinor),
          )) {
            const base = owner(row).split("|")[0]!;
            const post = runPosts.find((p) => p.text.includes(base));
            if (!post) continue;
            evidence.push(
              `${label}: ${row.id} (${row.target}${row.count > 1 ? ` x${row.count}` : ""}, ${row.amountMinor} minor) <- journal ${post.id}`,
            );
            return;
          }
          expect.fail(
            `${where}: no journal entry names a ${label} row: ${list
              .slice(0, 4)
              .map((r) => `${r.id} ${r.target} ${r.amountMinor}`)
              .join("; ")} of ${list.length}`,
          );
        };
        named("income-tax", raised);
        named("adopt-income-tax", open(ADOPT));
        named("graduated-income-tax", open(GRADUATED));
        named("property-tax", property);
        named("cap-property-tax-growth", open(CAP));
        named("corporate-income-tax", corporate);
        // A fiscal rule's money is found where the treasury moved it: the
        // reserve account, the pension line's payments, a line's payments.
        const treasuryOwner = (row: LawAppliedRow) =>
          governments(api).find((g) => g.id === row.targetId)?.organizationId ??
          row.targetId;
        const govRows = (key: string) =>
          open(key).filter((r) => r.target === "government");
        named(
          "minimum-reserve-balance",
          govRows(RESERVE),
          (row) => `reserve:${treasuryOwner(row)}`,
        );
        named(
          "fund-pensions-to-schedule",
          govRows(PENSIONS),
          (row) => `${row.targetId}:retirementContributions`,
        );
        named(
          "balanced-operating-budget",
          govRows(BALANCED),
          (row) => `:${row.targetId}:`,
        );

        // The treasury reads the reserve rule as it closes each month: with the
        // budget's spending raised, the next close tops the reserve up and
        // records the government again, on a date the treasury closed its books.
        const held = open(RESERVE).find((r) => r.target === "government")!;
        const reserveGov = governments(api).find(
          (g) => g.id === held.targetId,
        )!;
        const lineToRaise = Object.entries(
          [...budgetsOf(api, reserveGov.id)].sort((a, b) =>
            b.startsOn.localeCompare(a.startsOn),
          )[0]!.spendingMinor,
        ).sort((a, b) => b[1] - a[1])[0]![0];
        amendBudget(api, {
          governmentId: reserveGov.id,
          line: lineToRaise,
          deltaMinor: 50_000_000_00,
          measureId: "test:more-spending",
        });
        run(core, 35);
        const reread = open(RESERVE).find((r) => r.targetId === held.targetId)!;
        expect(
          reread.times,
          `${where}: reserve read again by the treasury`,
        ).toBeGreaterThan(held.times);
        expect(
          treasuryMonthsOf(api, reserveGov.id).some(
            (m) => m.date === reread.lastOn,
          ),
          `${where}: reserve last applied ${reread.lastOn}, a treasury close`,
        ).toBe(true);

        // Local income-tax authority: a local body drafts a tax bill and the
        // state's grant or refusal is read for it.
        // The town's governing body (a council, a township board), with a
        // member of it to sponsor the bill.
        const seat = townSeats(api).find(
          (s) =>
            (s.office.level === "city" || s.office.level === "township") &&
            s.holder?.personId &&
            !!bodyOf(api, s.office.id),
        );
        expect(seat, `${where}: a member of the town's body`).toBeDefined();
        const office = seat!.office;
        const sponsor = { id: seat!.holder!.personId! };
        const bill = draftBill(api, {
          bodyOfficeId: office.id,
          sponsorId: sponsor.id,
          provisions: [
            {
              kind: "law-amount",
              series: "income-tax",
              value: 1,
              unit: "percent",
            },
          ],
        });
        const authority = rows("local-income-tax-authority");
        expect(
          authority.length,
          `${where}: authority rows (${bill.authority[0]?.reason})`,
        ).toBe(1);
        expect(authority[0]!.lawId, where).toBe(bill.authority[0]!.source);
        expect(authority[0]!.target, where).toBe("organization");
        expect(LEGISLATURE_MODULE_ID).toBe(authority[0]!.engine);
        // The grant can be changed by bill: the state's catalog offers it, and
        // the row a bill enacts replaces the one in force, so the same body's
        // next draft is allowed or barred by the new row.
        const offered = billCatalog(api, "state")
          .flatMap((menu) => menu.topics.flatMap((topic) => topic.policies))
          .find((policy) => policy.id === "law:local-income-tax-authority");
        expect(
          offered,
          `${where}: state catalog offers the grant`,
        ).toBeDefined();
        const granted = authority[0]!.what === "local-tax-allowed";
        const flipped = enactLaw(api, {
          jurisdiction: lawChain(api).stateKey,
          level: "state",
          series: "local-income-tax-authority",
          value: granted ? 0 : 1,
          effectiveDate: addDays(makeIsoDate(core.date), 1),
          measureId: "test:local-income-tax-authority",
          citation: "Test: the state changes its grant",
        });
        run(core, 2);
        const redraft = draftBill(api, {
          bodyOfficeId: office.id,
          sponsorId: sponsor.id,
          provisions: [
            {
              kind: "law-amount",
              series: "income-tax",
              value: 1,
              unit: "percent",
            },
          ],
        });
        expect(redraft.authority[0]!.allowed, where).toBe(!granted);
        expect(redraft.authority[0]!.source, where).toBe(flipped.id);
        const changed = rows("local-income-tax-authority").find(
          (r) => r.targetId === office.id && !r.endedOn,
        );
        expect(
          changed?.lawId,
          `${where}: applied row cites the new grant`,
        ).toBe(flipped.id);
        expect(changed?.what, where).toBe(
          granted ? "local-tax-barred" : "local-tax-allowed",
        );

        // An estate under a death tax the test sets low enough to reach it:
        // the decedent pays the estate tax, the heir the inheritance tax.
        const state = lawChain(api).levels.find((l) => l.level === "state")!;
        const federal = lawInForce(api, "estate-tax").levels.find(
          (l) => l.level === "federal",
        );
        // Probate closes months from now, after the starting law's next year row
        // begins (2026-01-01); the test rows must come after it to govern.
        const tomorrow = addDays(makeIsoDate(core.date), 1);
        const date = tomorrow > "2026-01-02" ? tomorrow : "2026-01-02";
        if (federal?.row)
          enactLaw(api, {
            jurisdiction: federal.jurisdiction,
            level: "federal",
            series: "estate-tax",
            value: 40,
            unit: "percent-top-rate",
            effectiveDate: date,
            measureId: "test:estate-low",
            citation: "Test estate tax",
            terms: { exemption: 1, minRate: 10, maxRate: 40, slideOver: 1000 },
          });
        enactLaw(api, {
          jurisdiction: state.jurisdiction,
          level: "state",
          series: "inheritance-tax",
          value: 10,
          unit: "percent-top-rate",
          effectiveDate: date,
          measureId: "test:inheritance-low",
          citation: "Test inheritance tax",
          terms: {
            classes: {},
            others: { exemption: 1, minRate: 10, slideOver: 0 },
          },
        });
        run(core, 2);
        const decedent = [...core.people.values()]
          .filter(
            (p) =>
              p.alive &&
              p.liquidMinor > 100_00 &&
              heirsOf(api, p).heirs.length > 0,
          )
          .sort(
            (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
          )[0];
        expect(
          decedent,
          `${where}: a person with cash and heirs`,
        ).toBeDefined();
        api.updatePerson(decedent!.id, { alive: false });
        const posts = estatePosts(() => {
          settleEstate(api, decedent!.id, "event:death:test");
          // Probate closes after its days; the estate's taxes come out then.
          run(core, api.parameter("probateDays") + 1);
        });
        const heirIds = new Set(
          heirsOf(api, core.people.get(decedent!.id)!).heirs,
        );
        const estate = rows("estate-tax").filter((r) =>
          r.targetId.startsWith(decedent!.id),
        );
        const inheritance = rows("inheritance-tax").filter((r) =>
          heirIds.has(r.targetId),
        );
        expect(
          estate.length,
          `${where}: estate tax on ${decedent!.id}`,
        ).toBeGreaterThan(0);
        expect(money(estate), `${where}: estate tax paid`).toBeGreaterThan(0);
        expect(
          inheritance.length,
          `${where}: inheritance tax on heirs of ${decedent!.id}`,
        ).toBeGreaterThan(0);
        // The money of each: the journal entry that paid it to the treasury.
        for (const row of [...estate, ...inheritance].filter(
          (r) => r.amountMinor > 0,
        ))
          expect(
            posts.some(
              (p) =>
                p.source.includes(`estate:${decedent!.id}:${row.key}:`) &&
                p.minor > 0,
            ),
            `${where}: journal entry for ${row.id}`,
          ).toBe(true);

        // A counted resident's death in the same world: the household's cash
        // is shared among the counted members who outlive them, the same laws
        // read the estate and each heir's share, and the group that inherits
        // pays, times the households the record stands for.
        const rt = residentsRuntime(core)!;
        const store = rt.store;
        const house = [...store.liveHouseholds()]
          .filter((h) => store.countedMembers(h).length >= 2)
          .sort(
            (a, b) =>
              householdCash(rt, b) - householdCash(rt, a) ||
              a.id.localeCompare(b.id),
          )[0];
        expect(
          house,
          `${where}: a counted household of two or more`,
        ).toBeDefined();
        const dead = store.ids[store.countedMembers(house!)[0]!]!;
        const passing = countedEstateOf(core, dead as never)!;
        expect(
          passing.estateMinor,
          `${where}: cash to pass on`,
        ).toBeGreaterThan(100_00);
        expect(passing.heirs.length, where).toBeGreaterThan(0);
        removeCountedPerson(core, dead as never);
        const countedPosts = estatePosts(() =>
          settleCountedEstate(api, {
            deceasedId: dead as never,
            placeId: lawChain(api).townPlaceId,
            estate: passing,
          }),
        );
        const countedEstate = rows("estate-tax").filter((r) =>
          r.targetId.startsWith(dead),
        );
        const countedInheritance = rows("inheritance-tax").filter((r) =>
          passing.heirs.includes(r.targetId as never),
        );
        expect(
          countedEstate.some(
            (r) => r.target === "group" && r.count >= 1 && r.amountMinor > 0,
          ),
          `${where}: counted estate of ${dead} taxed`,
        ).toBe(true);
        expect(
          countedInheritance.some(
            (r) => r.target === "group" && r.count >= 1 && r.amountMinor > 0,
          ),
          `${where}: counted heirs of ${dead} taxed`,
        ).toBe(true);
        for (const row of [...countedEstate, ...countedInheritance].filter(
          (r) => r.amountMinor > 0,
        ))
          expect(
            countedPosts.some(
              (p) =>
                p.source.includes(`estate:${dead}:${row.key}:`) && p.minor > 0,
            ),
            `${where}: journal entry for ${row.id}`,
          ).toBe(true);

        // Someone who lived alone leaves no heir: the estate goes to the
        // state, deductible, so both laws are applied to it and nothing is due
        // (the state is exempt from its own inheritance tax).
        const alone = [...store.liveHouseholds()]
          .filter(
            (h) =>
              store.countedMembers(h).length === 1 && householdCash(rt, h) > 0,
          )
          .sort((a, b) => a.id.localeCompare(b.id))[0];
        expect(alone, `${where}: a counted household of one`).toBeDefined();
        const lone = store.ids[store.countedMembers(alone!)[0]!]!;
        const leftBehind = countedEstateOf(core, lone as never)!;
        expect(leftBehind.heirs, where).toEqual([]);
        removeCountedPerson(core, lone as never);
        settleCountedEstate(api, {
          deceasedId: lone as never,
          placeId: lawChain(api).townPlaceId,
          estate: leftBehind,
        });
        const assessedAlone = rows("estate-tax").filter((r) =>
          r.targetId.startsWith(lone),
        );
        expect(
          assessedAlone.some(
            (r) =>
              r.target === "group" &&
              r.count >= 1 &&
              r.what === "estate-assessed" &&
              r.amountMinor === 0,
          ),
          `${where}: estate of ${lone} assessed on nothing`,
        ).toBe(true);
        if (
          lawInForce(api, "inheritance-tax").levels.some(
            (l) => l.level === "state" && l.row,
          )
        )
          expect(
            rows("inheritance-tax").some(
              (r) =>
                r.target === "government" &&
                r.what === "inheritance-assessed" &&
                // Every state with the tax exempts a government heir in its
                // statute (governmentHeir on the row, cited and quoted).
                r.amountMinor === 0,
            ),
            `${where}: the state as heir of ${lone}, exempt`,
          ).toBe(true);

        evidence.push(
          `local-income-tax-authority: ${authority[0]!.id} (${authority[0]!.target}, grants a power and moves no money by its terms)`,
        );
        for (const row of [...estate, ...inheritance].slice(0, 2))
          evidence.push(
            `${row.key}: ${row.id} (${row.target}, ${row.amountMinor} minor) <- journal ${posts.find((p) => p.source.includes(`estate:${decedent!.id}:${row.key}:`))?.id ?? "-"}`,
          );
        console.info(
          `law-wiring-taxes evidence, ${where}:\n${evidence.join("\n")}`,
        );

        // Repeal: the questions end their rows, and a repealed amount stops
        // citing its old law.
        for (const key of QUESTIONS) setQuestion(api, key, 0);
        const incomeOff = scaleAmount(api, "income-tax", 0);
        const propertyOff = scaleAmount(api, "property-tax", 0);
        run(core, 40);
        for (const key of QUESTIONS)
          expect(open(key).length, `${where}: ${key} open after repeal`).toBe(
            0,
          );
        expect(
          open("income-tax").filter((r) => r.lawId === ids.income).length,
          `${where}: income tax rows at ${ids.income} after ${incomeOff}`,
        ).toBe(0);
        expect(
          open("property-tax").filter((r) => r.lawId === ids.property).length,
          `${where}: property tax rows at ${ids.property} after ${propertyOff}`,
        ).toBe(0);
      } finally {
        setBookkeeping(true);
      }
    },
  );

  it(
    "keeps a corporation's unpaid profit tax owed to each treasury, through a zero-profit quarter and a repealed state rate",
    // Each attempt builds a town and runs to October 1 (three quarter days).
    { timeout: 900_000 },
    () => {
      setBookkeeping(false);
      const testSource: Source = {
        tag: "SOURCED",
        asOf: gameStartDate(),
        citation: "Law-wiring test: a corporation's arrears and cash are set",
      };
      try {
        const tried: string[] = [];
        for (let i = 0; i < TRIES; i++) {
          const drawn = drawPlace(seed, `law-wiring-taxes-arrears:${i}`);
          const where = `${drawn.name} (${drawn.key}), seed ${seed}`;
          const core = buildBenchWorld(drawn.seed, gameStartDate(), {
            twoLevel: true,
            placeKey: drawn.key,
          }).core;
          const api = coreAPI(core);
          // A federal and a state corporate rate, each paid to its own treasury.
          const levels = lawInForce(api, "corporate-income-tax").levels.filter(
            (l) => !l.setAside && l.row && (l.row.value ?? 0) > 0,
          );
          const gov = (level: string) =>
            governments(api).find(
              (g) =>
                g.id === levels.find((l) => l.level === level)?.jurisdiction,
            );
          const federal = gov("federal");
          const state = gov("state");
          const outside = outsideAccountOf(api);
          // April 1 opens the quarter's books; a corporation's location (a
          // business an organization owns, open by the end of June) is chosen then.
          const year = core.date.slice(0, 4);
          if (federal && state && outside)
            advanceCore(core, makeIsoDate(`${year}-06-30`));
          // Locations of a corporation (a business an organization owns), not
          // among those `not` names. A location can spend its cash on the
          // quarter day before its tax is taken, so several are set up at once
          // and the ones that could pay are the ones read.
          const corporations = (not: readonly string[] = [], most = 6) =>
            [...core.finance.businesses.entries()]
              .filter(([id, books]) => !books.closedAt && !not.includes(id))
              .map(([id]) => id)
              .sort()
              .filter((id) => {
                const owner = ownerOf(api, id);
                return !!owner && core.organizations.has(owner);
              })
              .slice(0, most);
          const julyBusinesses = corporations();
          const business = julyBusinesses[0];
          if (!federal || !state || !outside || !business) {
            tried.push(
              `${where}: ${!state ? "no state corporate rate" : !business ? "no business an organization owns" : "no federal treasury or outside account"}`,
            );
            continue;
          }
          const accounts = api.accounts();
          const setCash = (id: string, tag: string, minor: number) => {
            const cash = accounts.main(id);
            const held = accounts.balance(cash);
            const [from, to] =
              held > minor
                ? [cash, accounts.main(outside)]
                : [accounts.main(outside), cash];
            if (held !== minor)
              accounts.transfer({
                id: `law-wiring-taxes-cash:${tag}:${i}`,
                from,
                to,
                amountMinor: Math.abs(held - minor),
                reasonKey: "law-wiring-test",
                source: testSource,
                partial: true,
              });
          };
          const taxes = api.moduleState(EMPLOYER_TAXES_MODULE_ID);
          // The day before a quarter day: what each treasury is owed is set,
          // and the quarter shows no profit, so only the arrears are due.
          const owe = (
            id: string,
            owed: Record<string, number>,
            cashMinor: (held: number) => number,
          ) => {
            taxes.table("arrears").put({
              id: `${id}:profit`,
              minor: Object.values(owed).reduce((n, o) => n + o, 0),
              byGovernment: owed,
            });
            taxes
              .table("quarters")
              .put({ id, minor: Number.MAX_SAFE_INTEGER / 4 });
            setCash(
              id,
              `${id}:${core.date}`,
              cashMinor(accounts.balance(accounts.main(id))),
            );
          };
          const paidOn = (id: string, date: string) => {
            const record = profitTaxesOf(api).find(
              (r) => r.businessId === id && r.date === date,
            );
            const to = (g: { organizationId: string }) =>
              (record?.postings ?? [])
                .filter(
                  (p) => p.accountId === `cash:${g.organizationId}:residual`,
                )
                .reduce((n, p) => n + p.deltaMinor, 0);
            return { record, federal: to(federal), state: to(state) };
          };

          // July 1, no profit: federal 2,000,000 and state 1,000,000 owed, and
          // cash for about half. Each treasury is paid its share of what it is owed.
          for (const id of julyBusinesses)
            owe(
              id,
              { [federal.id]: 2_000_000, [state.id]: 1_000_000 },
              () => 1_500_000,
            );
          advanceCore(core, makeIsoDate(`${year}-07-01`));
          const paying =
            julyBusinesses.find(
              (id) => (paidOn(id, `${year}-07-01`).record?.paidMinor ?? 0) > 0,
            ) ?? business;
          const july = paidOn(paying, `${year}-07-01`);
          expect(
            july.record,
            `${where}: ${paying} July record (${julyBusinesses.length} locations set up)`,
          ).toBeDefined();
          expect(july.record!.taxMinor, `${where}: no profit, no new tax`).toBe(
            0,
          );
          expect(
            july.record!.paidMinor,
            `${where}: arrears paid`,
          ).toBeGreaterThan(0);
          expect(
            july.federal + july.state,
            `${where}: paid in full to the two`,
          ).toBe(july.record!.paidMinor);
          expect(
            Math.abs(july.federal - 2 * july.state),
            `${where}: federal ${july.federal} and state ${july.state} paid two to one`,
          ).toBeLessThanOrEqual(2);
          expect(
            july.record!.arrearsAfterByGovernment,
            `${where}: each treasury still owed its own rest`,
          ).toEqual(
            Object.fromEntries(
              [
                [federal.id, 2_000_000 - july.federal],
                [state.id, 1_000_000 - july.state],
              ].filter(([, o]) => Number(o) > 0),
            ),
          );

          // The state's rate is repealed; on October 1 it is still paid what
          // it was owed, and the federal treasury takes nothing of it.
          enactLaw(api, {
            jurisdiction: state.id,
            level: "state",
            series: "corporate-income-tax",
            value: 0,
            effectiveDate: addDays(makeIsoDate(core.date), 1),
            measureId: "test:corporate-income-tax:state-repeal",
            citation: "Test repeal",
          });
          advanceCore(core, makeIsoDate(`${year}-09-30`));
          // Locations still open (the ones above may have closed short of
          // cash), each given the cash to pay.
          const octoberBusinesses = corporations(julyBusinesses);
          if (!octoberBusinesses.length) {
            tried.push(`${where}: no corporation location open in September`);
            continue;
          }
          for (const id of octoberBusinesses)
            owe(id, { [state.id]: 1_000_000 }, (held) => held + 1_000_000);
          advanceCore(core, makeIsoDate(`${year}-10-01`));
          const second =
            octoberBusinesses.find(
              (id) => paidOn(id, `${year}-10-01`).state === 1_000_000,
            ) ?? octoberBusinesses[0]!;
          const october = paidOn(second, `${year}-10-01`);
          expect(october.record, `${where}: October record`).toBeDefined();
          expect(
            october.state,
            `${where}: state arrears after its repeal`,
          ).toBe(1_000_000);
          expect(october.federal, `${where}: federal takes none of it`).toBe(0);
          expect(
            october.record!.arrearsAfterByGovernment,
            `${where}: nothing left owed`,
          ).toEqual({});
          console.info(
            `law-wiring-taxes arrears ${where}: ${paying} in July paid federal ${july.federal} and state ${july.state} of 2,000,000 and 1,000,000; ${second} on October 1 paid the repealed state ${october.state}`,
          );
          return;
        }
        throw new Error(
          `No drawn place had a corporation under a state corporate rate (seed ${seed}); tried ${tried.join("; ")}`,
        );
      } finally {
        setBookkeeping(true);
      }
    },
  );
});
