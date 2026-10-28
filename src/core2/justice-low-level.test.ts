/**
 * The minor offenses (disorderly conduct, drunkenness, liquor law violations,
 * loitering, vagrancy and drug possession) in the justice case flow: each
 * category's real starting rate in all 56 places, the sized link from police
 * staffing to their arrests, the parameters the cases run on, and a played
 * world where a raised police line makes more of these arrests and a cut makes
 * fewer, drug possession among them, by record id.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import research from "../../data/research/justice/low-level-arrests-2024.json" with { type: "json" };
import parameters from "./data/public-safety/parameters.json" with { type: "json" };
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { setJournalTrace } from "./journal-state";
import { advanceCore } from "./life";
import { amendBudget, budgetsOf, governments } from "./modules/budgets";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import {
  baseOf,
  publishedBaseOf,
  linkCoverage,
  WEB_LINKS,
  COVERAGE_DATA,
} from "./outcome-web-model";
import { LOW_LEVEL_CATEGORIES, lowLevelRates } from "./low-level-offenses";
import { placeStateKeys } from "./places";
import {
  LOW_LEVEL_MEASURE,
  PUBLIC_SAFETY_MODULE_ID,
  type SafetyMonth,
} from "./public-safety";
import { countedCases, type CountedCaseRow } from "./modules/justice";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const LINK = "police-to-low-level-arrests";

describe("the minor offenses' starting rate, in all 56 places", () => {
  const drug = LOW_LEVEL_CATEGORIES.find((c) => c.key === "drugPossession");

  it("starts every place from a real rate, never zero: the FBI's own for each category where it reports, the national rate marked ESTIMATED where not", () => {
    const keys = placeStateKeys();
    expect(keys).toHaveLength(56);
    const notReported = new Set(research.notReported.places);
    for (const key of keys) {
      const base = publishedBaseOf(LOW_LEVEL_MEASURE, key);
      expect(base.value, key).toBeGreaterThan(0);
      const missing = notReported.has(key.slice("US-".length));
      // Drug possession is ESTIMATED everywhere, so the six together are too.
      expect(base.source.tag, key).toBe("ESTIMATED");
      if (missing) {
        expect(base.value, key).toBe(research.national.per1000);
        expect(base.source.estimatedFrom?.length ?? 0, key).toBeGreaterThan(40);
      } else {
        expect(base.source.citation, key).toContain("cde.ucr.cjis.gov");
        expect(base.source.estimatedFrom, key).toContain("Drug possession");
      }
      // Each category has its own rate, tagged: the five before drug
      // possession SOURCED where the state reports, drug possession
      // ESTIMATED in every place, and the national rate ESTIMATED where the
      // state has none.
      const rates = lowLevelRates(key);
      expect(
        rates.map((r) => r.category.key),
        key,
      ).toEqual(LOW_LEVEL_CATEGORIES.map((c) => c.key));
      for (const r of rates) {
        expect(
          r.ratePer1000,
          `${key} ${r.category.key}`,
        ).toBeGreaterThanOrEqual(0);
        expect(r.fromNational, `${key} ${r.category.key}`).toBe(missing);
        expect(r.tag, `${key} ${r.category.key}`).toBe(
          missing ? "ESTIMATED" : r.category.tag,
        );
      }
      // Drug possession is its own, nonzero rate in every place: the largest
      // part of the class, and what the sixth category exists to carry.
      const own = rates.find((r) => r.category.key === "drugPossession")!;
      expect(own.tag, key).toBe("ESTIMATED");
      expect(own.ratePer1000, `${key} drug possession`).toBeGreaterThan(0);
    }
    expect(drug?.tag).toBe("ESTIMATED");
    expect(notReported.size).toBeLessThan(10);
  });

  it("agrees with the research file: each place's value is the sum of its six categories' 12 monthly rates, per 1,000, and drug possession is the sum of the FBI's five drug possession series", () => {
    const labels = LOW_LEVEL_CATEGORIES.map((c) => c.label);
    for (const [key, place] of Object.entries(research.places)) {
      expect(Object.keys(place.byOffense), key).toEqual(labels);
      if (!place.reported) continue;
      const sum = Object.values(place.byOffense).reduce(
        (n, o) => n + o.ratePer100k,
        0,
      );
      // Each offense's rate is kept to two decimals and the place's to three.
      expect(Math.abs(place.per1000 - sum / 100), key).toBeLessThanOrEqual(
        0.0005 + 1e-9,
      );
      expect(publishedBaseOf(LOW_LEVEL_MEASURE, key).value, key).toBe(
        place.per1000,
      );
      for (const offense of Object.values(place.byOffense))
        expect(offense.months, key).toBe(12);
      // The sixth category is five series added: its rate and its arrests.
      const row = place.byOffense["Drug Possession"];
      const codes = Object.values(row.codes);
      expect(Object.keys(row.codes), key).toEqual(drug!.codes);
      expect(
        Math.abs(
          row.ratePer100k - codes.reduce((n, c) => n + c.ratePer100k, 0),
        ),
        `${key} drug possession rate`,
      ).toBeLessThanOrEqual(0.005 + 1e-9);
      expect(row.arrests, `${key} drug possession arrests`).toBe(
        codes.reduce((n, c) => n + c.arrests, 0),
      );
      // The case flow's rates add up to the web's start, to the file's rounding.
      expect(
        Math.abs(
          lowLevelRates(key).reduce((n, r) => n + r.ratePer1000, 0) -
            place.per1000,
        ),
        key,
      ).toBeLessThanOrEqual(0.0005 + 1e-9);
    }
    // The national row the four places the source leaves out start from.
    const national = research.national;
    const natSum = Object.values(national.byOffense).reduce(
      (n, o) => n + o.ratePer100k,
      0,
    );
    expect(Object.keys(national.byOffense)).toEqual(labels);
    expect(Math.abs(national.per1000 - natSum / 100)).toBeLessThanOrEqual(
      0.0005 + 1e-9,
    );
  });
});

describe("the sized police-to-low-level-arrests link", () => {
  const link = WEB_LINKS.find((l) => l.key === LINK) as unknown as
    | {
        size: number;
        range: [number, number];
        shape: { kind: string };
        anchor: string;
        source: string;
        from: string;
        to: string;
        rangeSource: string;
        researchSizing: {
          estimate: number;
          standardError: number;
          location: string;
        };
      }
    | undefined;

  it("is built, runs in the web, and moves the kept measure from the officers per 1,000 the police lines fund", () => {
    expect(link).toBeDefined();
    expect(link!.from).toBe("police.officers-per-1000");
    expect(link!.to).toBe(LOW_LEVEL_MEASURE);
    expect(linkCoverage(link as never).wired).toBe(true);
    expect(COVERAGE_DATA.wired).toContain(LINK);
    expect(COVERAGE_DATA.waiting[LINK]).toBeUndefined();
  });

  it("is the paper's elasticity inside its spread, with the source and the anchor quote", () => {
    expect(link!.shape.kind).toBe("elasticity");
    expect(link!.range[0] <= link!.size && link!.size <= link!.range[1]).toBe(
      true,
    );
    // Table 2: 7.12 more arrests per officer on 60,244 arrests and 6,047.0 officers.
    expect(link!.size).toBeCloseTo((7.12 * 6047.0) / 60244, 4);
    // Table 3: 22.01 on 49,908 arrests and 6,390.7 officers is the top of the range.
    expect(link!.range[1]).toBeCloseTo((22.01 * 6390.7) / 49908, 4);
    expect(link!.researchSizing.standardError).toBeCloseTo(
      (0.88 * 6047.0) / 60244,
      4,
    );
    expect(link!.source).toContain("Chalfin, Hansen, Weisburst and Williams");
    expect(link!.anchor).toContain(
      "each additional officer making 7–22 new arrests",
    );
    expect(link!.researchSizing.location).toContain("Table 2");
    expect(link!.rangeSource.length).toBeGreaterThan(40);
  });
});

describe("the parameters the minor-offense cases run on", () => {
  const rows = Object.entries(
    parameters.parameters as unknown as Record<
      string,
      {
        value: number;
        tag: string;
        citation: string;
        spread?: { low: number; high: number; citation: string };
      }
    >,
  ).filter(([key]) => key.endsWith(".lowlevel"));

  it("are all there, each tagged, cited, and inside its spread", () => {
    expect(rows.map(([key]) => key).sort()).toEqual([
      "convictedShare.lowlevel",
      "dispositionMonths.lowlevel",
      "incarceratedShare.lowlevel",
      "jailSentenceDays.lowlevel",
      "prisonShare.lowlevel",
    ]);
    for (const [key, row] of rows) {
      expect(["SOURCED", "ESTIMATED", "TUNABLE"], key).toContain(row.tag);
      expect(row.citation.length, key).toBeGreaterThan(60);
      if (row.tag === "SOURCED") continue;
      expect(row.spread, key).toBeDefined();
      expect(
        row.spread!.low <= row.value && row.value <= row.spread!.high,
        key,
      ).toBe(true);
    }
  });

  it("give an age profile for every band, from the same table as the generic one", () => {
    const profile = parameters.ageProfile;
    expect(profile.lowLevel.ratios).toHaveLength(profile.bands.length);
    for (const ratio of profile.lowLevel.ratios)
      expect(ratio).toBeGreaterThan(0);
    expect(profile.lowLevel.tag).toBe("ESTIMATED");
  });
});

const run = (core: CoreState, days: number) =>
  advanceCore(core, addDays(makeIsoDate(core.date), days));

const safety = (api: CoreAPI) => api.moduleState(PUBLIC_SAFETY_MODULE_ID);

/** The month before a "YYYY-MM" month. */
function monthBefore(month: string): string {
  const total = Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 2;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

function monthRows(api: CoreAPI): SafetyMonth[] {
  return (safety(api).table("months").rows() as unknown as SafetyMonth[])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
}

function policeLine(api: CoreAPI): { id: string; amount: number } {
  const gov =
    governments(api).find((g) => g.level === "city") ??
    governments(api).find((g) => g.level === "county") ??
    governments(api).find((g) => g.level === "state")!;
  const budget = budgetsOf(api, gov.id)
    .filter((b) => b.startsOn <= api.state.date)
    .sort((a, b) => b.startsOn.localeCompare(a.startsOn))[0];
  return { id: gov.id, amount: budget?.spendingMinor["police"] ?? 0 };
}

interface Phase {
  readonly month: SafetyMonth;
  readonly web: WebMonth;
  /**
   * The web month before it: an outcome feeds the links that start from it
   * the month after it moves, so this month's effect stands on that month's
   * reading of the officers.
   */
  readonly earlier: WebMonth;
  /** The safety month row whose officers per 1,000 that earlier web month read. */
  readonly officersRow: SafetyMonth;
  readonly cases: CountedCaseRow[];
  readonly expectedRate: number;
  /** The journal entry that paid the month's court costs, which the minor-offense cases are part of. */
  readonly court: { readonly id: string; readonly gross: number } | undefined;
}

describe(`a raised police line makes more minor arrests and a cut makes fewer (seed ${seed})`, () => {
  it("follows one rate from the line to the officers, through the sized link, to the cases, by record id", () => {
    setBookkeeping(false);
    const tried: string[] = [];
    const courtPosts = new Map<string, { id: string; gross: number }>();
    try {
      for (let i = 0; i < 3; i++) {
        const drawn = drawPlace(seed, `justice-low-level:${i}`);
        const where = `${drawn.name} (${drawn.key}), seed ${seed}`;
        const world = buildBenchWorld(drawn.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: drawn.key,
        });
        const core = world.core;
        const api = coreAPI(core);
        const stateKey = drawn.state;
        setJournalTrace((input) => {
          const id = input.sourceRef.id;
          if (!id.startsWith("public-safety:court:")) return;
          const gross = input.postings.reduce(
            (n, p) => n + Math.max(0, p.deltaMinor),
            0,
          );
          courtPosts.set(id.slice("public-safety:court:".length), {
            id: input.id,
            gross,
          });
        });
        const base = baseOf(LOW_LEVEL_MEASURE, stateKey, core.seed).value;
        const opening = safety(api)
          .table("months")
          .get("safety:opening") as unknown as SafetyMonth;
        const line = policeLine(api);
        if (line.amount <= 0) {
          tried.push(`${where}: no police line`);
          continue;
        }
        const read = (): Phase => {
          const months = monthRows(api).filter(
            (m) => m.id !== "safety:opening",
          );
          const month = months.at(-1)!;
          const web = api
            .moduleState(OUTCOME_WEB_MODULE_ID)
            .table("months")
            .get(month.lowLevelWebId) as unknown as WebMonth;
          expect(web, `${where}: web row ${month.lowLevelWebId}`).toBeDefined();
          const earlier = api
            .moduleState(OUTCOME_WEB_MODULE_ID)
            .table("months")
            .get(
              `web:${web.placeId}:${monthBefore(web.month)}`,
            ) as unknown as WebMonth;
          expect(
            earlier,
            `${where}: the web month before ${web.id}`,
          ).toBeDefined();
          const sourceId = earlier.engineSources["police.officers-per-1000"]!;
          const officersRow = safety(api)
            .table("months")
            .get(sourceId) as unknown as SafetyMonth;
          const cases = [
            ...countedCases(api, "charged"),
            ...countedCases(api, "decided"),
          ].filter((c) => c.id.startsWith(`case:${month.month}:lowlevel:`));
          const size = WEB_LINKS.find((l) => l.key === LINK)!.size!;
          const expectedRate =
            base *
            (1 +
              (size * (officersRow.officersPer1000 - opening.officersPer1000)) /
                opening.officersPer1000);
          return {
            month,
            web,
            earlier,
            officersRow,
            cases,
            expectedRate,
            court: courtPosts.get(month.date),
          };
        };
        // Phase one: the police lines as they began.
        run(core, 75);
        const began = read();
        // Phase two: the line is raised by half.
        amendBudget(api, {
          governmentId: line.id,
          line: "police",
          deltaMinor: Math.max(1_000_000, Math.round(line.amount * 0.5)),
          measureId: "test:police:raise-low-level",
        });
        // The officers are read into the web a month later, and the link's
        // effect stands on that reading a month after that.
        run(core, 120);
        const raised = read();
        // Phase three: the line is cut to well under where it began.
        const now = policeLine(api).amount;
        amendBudget(api, {
          governmentId: line.id,
          line: "police",
          deltaMinor: -Math.round(now - line.amount * 0.5),
          measureId: "test:police:cut-low-level",
        });
        run(core, 120);
        const cut = read();

        const phases = { began, raised, cut };
        for (const [name, phase] of Object.entries(phases)) {
          const m = phase.month;
          // The rate is the state's real rate times the web's factor, and the
          // factor is the link's size times how far the funded officers sit
          // from where they began: all of it read from named records.
          expect(m.lowLevelRatePer1000, `${where}: ${name} rate`).toBeCloseTo(
            phase.expectedRate,
            9,
          );
          expect(
            phase.web.effects[LINK],
            `${where}: ${name} web effect ${phase.web.id}`,
          ).toBeDefined();
          expect(m.lowLevelRatePer1000, `${where}: ${name}`).toBeCloseTo(
            base * (1 + phase.web.effects[LINK]!),
            9,
          );
          // The cases name the web row and the officers they were read at.
          expect(phase.cases.length, `${where}: ${name} cases`).toBeGreaterThan(
            0,
          );
          expect(
            phase.cases.reduce((n, c) => n + c.count, 0),
            `${where}: ${name} arrests`,
          ).toBeCloseTo(m.lowLevelArrests, 6);
          for (const c of phase.cases) {
            expect(c.webRecordId, c.id).toBe(m.lowLevelWebId);
            expect(c.officersPer1000, c.id).toBe(m.officersPer1000);
          }
          // The minor offenses are part of the month's arrests.
          expect(m.arrests, `${where}: ${name}`).toBeGreaterThanOrEqual(
            m.lowLevelArrests,
          );
          // Each category's cases are its own real rate's share of the
          // month's arrests: the state's rate for it over the six added up.
          // Drug possession is one of them, read the same way.
          const rates = lowLevelRates(stateKey);
          const all = rates.reduce((n, r) => n + r.ratePer1000, 0);
          for (const r of rates) {
            const mine = phase.cases.filter(
              (c) => c.category === r.category.key,
            );
            expect(
              mine.reduce((n, c) => n + c.count, 0),
              `${where}: ${name} ${r.category.key} arrests`,
            ).toBeCloseTo(m.lowLevelArrests * (r.ratePer1000 / all), 6);
            for (const c of mine) {
              expect(c.offense, c.id).toBe("lowlevel");
              expect(c.id, c.id).toContain(`:${r.category.key}:`);
            }
          }
          expect(
            phase.cases.every((c) => c.category !== undefined),
            `${where}: ${name} every minor case names its category`,
          ).toBe(true);
          expect(
            phase.cases.some((c) => c.category === "drugPossession"),
            `${where}: ${name} drug possession cases (${phase.cases.map((c) => c.id).join(", ")})`,
          ).toBe(true);
        }
        // The police line's funded officers moved, and the arrests followed.
        // The town was chosen on its opening police line alone, so a reader
        // that drops the raise or the cut fails here, in this town.
        expect(
          raised.officersRow.officersPer1000,
          `${where}: officers after the raise (${raised.officersRow.id})`,
        ).toBeGreaterThan(opening.officersPer1000);
        expect(
          cut.officersRow.officersPer1000,
          `${where}: officers after the cut (${cut.officersRow.id})`,
        ).toBeLessThan(opening.officersPer1000);
        expect(raised.month.lowLevelRatePer1000, where).toBeGreaterThan(
          began.month.lowLevelRatePer1000,
        );
        expect(cut.month.lowLevelRatePer1000, where).toBeLessThan(
          began.month.lowLevelRatePer1000,
        );
        expect(raised.month.lowLevelArrests, where).toBeGreaterThan(
          began.month.lowLevelArrests,
        );
        expect(cut.month.lowLevelArrests, where).toBeLessThan(
          began.month.lowLevelArrests,
        );
        // Drug possession moved with the line like the rest: more arrests
        // when the police line was raised, fewer when it was cut.
        const drugArrests = (phase: Phase) =>
          phase.cases
            .filter((c) => c.category === "drugPossession")
            .reduce((n, c) => n + c.count, 0);
        expect(drugArrests(raised), where).toBeGreaterThan(drugArrests(began));
        expect(drugArrests(cut), where).toBeLessThan(drugArrests(began));
        console.log(
          `justice-low-level in ${where}: court costs ${raised.court?.id}; state rate ${base}/1,000; began ${began.month.id} -> ${began.web.id} (${began.cases[0]!.id}) rate ${began.month.lowLevelRatePer1000.toFixed(4)}; raised ${raised.month.id} -> ${raised.web.id} (${raised.cases[0]!.id}) officers ${raised.officersRow.id} ${raised.officersRow.officersPer1000.toFixed(3)} (read into ${raised.earlier.id}) rate ${raised.month.lowLevelRatePer1000.toFixed(4)} arrests ${raised.month.lowLevelArrests.toFixed(3)}; cut ${cut.month.id} -> ${cut.web.id} (${cut.cases[0]!.id}) officers ${cut.officersRow.id} ${cut.officersRow.officersPer1000.toFixed(3)} (read into ${cut.earlier.id}) rate ${cut.month.lowLevelRatePer1000.toFixed(4)} arrests ${cut.month.lowLevelArrests.toFixed(3)}; drug possession ${raised.cases.find((c) => c.category === "drugPossession")!.id} ${drugArrests(raised).toFixed(3)} arrests raised, ${drugArrests(began).toFixed(3)} began, ${drugArrests(cut).toFixed(3)} cut`,
        );
        return;
      }
      throw new Error(`no drawn place had a police line to move: ${tried}`);
    } finally {
      setJournalTrace(null);
      setBookkeeping(true);
    }
  }, 600_000);
});
