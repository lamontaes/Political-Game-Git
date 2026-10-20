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
import { gameStartDate } from "./game-start";
import { heirsOf, settleEstate } from "./estates";
import { addDays, makeIsoDate } from "./kernel/dates";
import { appliedOn, type LawAppliedRow } from "./law-reach/applied";
import { advanceCore } from "./life";
import type { LawRowInput } from "./laws-starting";
import { EMPLOYER_TAXES_MODULE_ID } from "./modules/employer-taxes";
import {
  bodyOf,
  draftBill,
  LEGISLATURE_MODULE_ID,
} from "./modules/legislature";
import { enactLaw, lawChain, lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import { OFFICES_MODULE_ID } from "./modules/offices";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

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

interface Attempt {
  readonly where: string;
  readonly api: CoreAPI;
  readonly core: CoreState;
  readonly ids: Record<string, string>;
  readonly missing: string[];
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
  run(core, 170);
  const missing = [
    "income-tax",
    "property-tax",
    "corporate-income-tax",
    ...QUESTIONS,
  ]
    .filter((key) => !keysOf(api, key).length)
    .concat(
      Object.entries(ids)
        .filter(([, id]) => !id)
        .map(([name]) => `${name} law row`),
    );
  return { where, api, core, ids, missing };
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
        const { api, core, ids, where } = found!;
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

        // Local income-tax authority: a local body drafts a tax bill and the
        // state's grant or refusal is read for it.
        const office = (
          api
            .moduleState(OFFICES_MODULE_ID)
            .table("offices")
            .rows() as unknown as {
            id: string;
          }[]
        ).find((o) => {
          const kind = bodyOf(api, o.id)?.kind ?? "";
          return !kind.startsWith("legislature-") && !kind.startsWith("us-");
        });
        expect(office, `${where}: a local body`).toBeDefined();
        const sponsor = [...core.people.values()].find((p) => p.alive)!;
        const bill = draftBill(api, {
          bodyOfficeId: office!.id,
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
        settleEstate(api, decedent!.id, "event:death:test");
        // Probate closes after its days; the estate's taxes come out then.
        run(core, api.parameter("probateDays") + 1);
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
});
