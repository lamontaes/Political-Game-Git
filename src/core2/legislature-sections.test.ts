/**
 * A bill's sections as the record holds them (the owner's ruling, Oct 14,
 * 2026, afternoon): what each changes, the law in force before with the
 * bill that enacted it, what the section makes it, and the terms the player may
 * edit. A rate with a schedule keeps its shape unless the section changes it.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import startingLaw from "./data/laws/starting-law.json" with { type: "json" };
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { openLaws } from "./modules/laws";
import { OFFICES_MODULE_ID, openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import {
  billForm,
  billSections,
  draftBill,
  openLegislature,
  shapedRate,
} from "./modules/legislature";
import type { LawRowInput } from "./laws-starting";
import { searchCorePlaces } from "./place-lookup";
import { withholdingFor } from "./tax-withholding";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`sections:${Date.now()}`).digest("hex");
const rows = (
  startingLaw as unknown as {
    jurisdictions: Record<string, (LawRowInput & { series: string })[]>;
  }
).jurisdictions;
const graduatedStates = Object.keys(rows)
  .filter((k) =>
    rows[k]!.some(
      (r) => r.series === "income-tax" && r.terms?.system === "graduated",
    ),
  )
  .filter((k) => k !== "US")
  .sort();
/** Places whose starting income tax is "none": the schedule holds no rated bracket. */
const noIncomeTaxStates = Object.keys(rows)
  .filter((k) => k !== "US")
  .filter((k) => {
    const row = rows[k]!.find(
      (r) => r.series === "income-tax" && r.terms?.schedules,
    );
    const schedules = row?.terms?.schedules as
      Record<string, { brackets?: { rate: number }[] }> | undefined;
    return (
      !!schedules &&
      !Object.values(schedules).some((s) => (s.brackets ?? []).length > 0)
    );
  })
  .sort();
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

describe("a bill's sections", () => {
  it("a graduated tax keeps its schedule, scaled to the new top rate; a flat section sets one rate", () => {
    const state = pick(graduatedStates, "state");
    const current = rows[state]!.find((r) => r.series === "income-tax")!;
    const top = current.value!;
    const shaped = shapedRate(current, {
      kind: "law-amount",
      series: "income-tax",
      value: top - 1,
    })!;
    const schedules = shaped.terms.schedules as Record<
      string,
      { brackets: { rate: number }[] }
    >;
    const rates = Object.values(schedules).flatMap((s) =>
      Array.isArray(s.brackets)
        ? s.brackets.map((b) => b.rate).filter((r) => typeof r === "number")
        : [],
    );
    expect(Math.max(...rates), state).toBeCloseTo(top - 1, 2);
    expect(shaped.terms.system, state).toBe("graduated");
    // Every bracket falls by the same share.
    const before = (
      current.terms!.schedules as Record<
        string,
        { brackets: { rate: number }[] }
      >
    ).single!.brackets.map((b) => b.rate);
    const after = schedules.single!.brackets.map((b) => b.rate);
    after.forEach((r, i) =>
      expect(r, state).toBeCloseTo((before[i]! * (top - 1)) / top, 2),
    );
    const flat = shapedRate(current, {
      kind: "law-amount",
      series: "income-tax",
      value: 4,
      shape: "flat",
    })!;
    expect(flat.unit).toBe("percent-flat");
    expect(
      shapedRate(null, {
        kind: "law-amount",
        series: "minimum-wage",
        value: 1500,
      }),
    ).toBeNull();
  });

  it("a generated world's bill reads its sections from the law in force", () => {
    const state = pick(graduatedStates, "world-state");
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "place").key;
    const where = `seed ${seed}, ${state} place ${key}`;
    const full = buildPopulation({
      seed,
      placeKey: key,
      startedAt: "2026-01-05",
      minimumPeople: 250,
    });
    const player = [...full.people].sort((a, b) =>
      a.id.localeCompare(b.id),
    )[0]!;
    const core = createLifeCore(
      collapseToTwoLevels({ ...full, playerId: player.id }),
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openRecord(core);
    openLegislature(core);
    const api = coreAPI(core);
    const chamber = (
      api.moduleState(OFFICES_MODULE_ID).table("offices").rows() as unknown as {
        id: string;
        kind: string;
        jurisdiction: string;
      }[]
    ).find(
      (o) =>
        o.jurisdiction === state &&
        /^legislature-(lower|unicameral)$/.test(o.kind),
    );
    expect(chamber, where).toBeDefined();
    const bill = draftBill(api, {
      bodyOfficeId: chamber!.id,
      sponsorId: player.id,
      provisions: [
        { kind: "law-amount", series: "income-tax", value: 3, unit: "percent" },
      ],
    });
    const [section] = billSections(api, bill);
    expect(section!.before.value, where).not.toBeNull();
    // A law in force at the opening is named by its record, never by the
    // research source that calibrated it (owner, Oct 27).
    expect(section!.before.lawId, where).toBeTruthy();
    expect(section!.before.statute, where).toBeNull();
    expect(section!.before.shape, where).toBe("graduated");
    expect(section!.after.value).toBe(3);
    expect(section!.editable).toEqual(["value", "effectiveDate", "shape"]);
    // A state act falls back on its state's rule: no closing section.
    expect(billForm(api, bill).kind).toBe("act");
    expect(billForm(api, bill).effectiveSection, where).toBeNull();

    // A town or county body's measure reads as an ordinance: numbered by the
    // year, ordained by that body, closing on when it takes effect.
    const local = (
      api.moduleState(OFFICES_MODULE_ID).table("offices").rows() as unknown as {
        id: string;
        kind: string;
        jurisdiction: string;
      }[]
    ).find(
      (o) =>
        o.jurisdiction !== state &&
        o.jurisdiction !== "US" &&
        /council|board|commission/.test(o.kind),
    );
    // D.C. and the territories with no town or county body legislate only
    // through their own legislature, whose measures are acts.
    if (!local) {
      expect(chamber, where).toBeDefined();
      return;
    }
    const ordinance = billForm(
      api,
      draftBill(api, {
        bodyOfficeId: local!.id,
        sponsorId: player.id,
        provisions: [
          {
            kind: "law-amount",
            series: "minimum-wage",
            value: 1500,
            unit: "minor/hour",
          },
        ],
      }),
    );
    expect(ordinance.kind, where).toBe("ordinance");
    expect(ordinance.number, where).toMatch(/^\d{4}-\d+$/);
    expect(ordinance.enactingClause, where).toMatch(/^Be it ordained by /);
    expect(ordinance.enactingClause, where).not.toContain("{body}");
    expect(ordinance.sections).toHaveLength(1);
    expect(ordinance.effectiveSection?.kind, where).toBe("days-after-adoption");
    expect(ordinance.effectiveSection!.days).toBeGreaterThan(0);
  }, 600_000);

  it("a first income tax where the starting row is none is flat, and withholds at the bill's rate", () => {
    expect(
      noIncomeTaxStates.length,
      "starting rows with no income tax",
    ).toBeGreaterThan(0);
    for (const salt of ["a", "b"]) {
      const state = pick(noIncomeTaxStates, `none:${salt}`);
      const current = rows[state]!.find(
        (r) => r.series === "income-tax" && r.terms?.schedules,
      )!;
      const where = `${state} (seed ${seed}:${salt})`;
      const shaped = shapedRate(current, {
        kind: "law-amount",
        series: "income-tax",
        value: 1,
      })!;
      expect(shaped.unit, where).toBe("percent-flat");
      expect(shaped.terms.system, where).toBe("flat");
      const row = {
        ...current,
        id: `law:${state}:income-tax:test-bill`,
        value: 1,
        unit: shaped.unit,
        terms: shaped.terms,
      };
      const lines = withholdingFor({
        paidMinor: 200_000,
        periodDays: 14,
        yearToDateMinor: 0,
        incomeTax: { levels: [{ level: "state", row }] } as never,
        socialSecurity: { levels: [] } as never,
        medicare: { levels: [] } as never,
      }).filter((l) => l.tax === "income");
      expect(lines.length, where).toBe(1);
      expect(lines[0]!.minor, where).toBe(2000);
    }
  });
});
