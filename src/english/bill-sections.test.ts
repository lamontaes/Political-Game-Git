import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { policyNames } from "../bench/words";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "../core2/life";
import { billForm, type BillRow } from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import seriesPowers from "../core2/data/legislature/series-powers.json" with { type: "json" };
import { storyTopicName } from "../director/question-names";
import { BILL_SECTIONS, composeBill, valueWords } from "./bill-sections";

// A bill's sections are worded from the record (owner, Oct 14, 2026: bill
// text is real; a local measure has its own form). The words come from
// data/english/bill-sections.json; the bill's
// own provision rows pick which ones.
const seed = process.env.BILL_SECTIONS_SEED ?? randomBytes(8).toString("hex");
const opening = "2026-10-12";

const addDay = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);

describe("the bill-sections data", () => {
  it("words every policy and law series on the bill catalog", () => {
    for (const [key, description] of Object.entries(policyNames())) {
      const id = key.replace(/^[a-z]+(?:-[a-z]+)*:/, "");
      const row = BILL_SECTIONS.policies[id] ?? BILL_SECTIONS.amounts[id];
      expect(row, `${key} (${description}) needs a row`).toBeTruthy();
      expect(row!.subject.length, key).toBeGreaterThan(3);
      expect(row!.purpose.length, key).toBeGreaterThan(3);
    }
    for (const id of Object.keys(BILL_SECTIONS.policies))
      expect(
        Object.keys(policyNames()).some((k) => k.endsWith(`:${id}`)),
        `${id} is not on the catalog`,
      ).toBe(true);
  });

  it("words a value as its unit says it", () => {
    expect(valueWords(4.5, "percent-flat")).toBe("4.5 percent");
    expect(valueWords(1500, "minor/hour")).toBe("$15 an hour");
    expect(valueWords(31000, "dollars/year")).toBe("$31,000 a year");
  });
});

describe("a section reads the record's numbers", () => {
  const input = (value: number) => ({
    id: "bill:fixture",
    number: "2026-4",
    form: { kind: "ordinance", enactingClause: "Be it ordained by the Town" },
    provisions: [
      {
        kind: "law-amount",
        series: "minimum-wage",
        value,
        unit: "minor/hour",
      },
    ],
    before: [
      {
        value: 950,
        unit: "minor/hour",
        statute: "law:US-XX:state:minimum-wage:general:2025-01-01",
      },
    ],
  });
  it("edge fixture: says the old value, the new value and the statute it amends", () => {
    const made = composeBill(input(1100))!;
    expect(made.sections[0]).toBe(
      "Section 1. Be it ordained by the Town, That the minimum wage shall be raised from $9.50 an hour to $11 an hour, amending law:US-XX:state:minimum-wage:general:2025-01-01.",
    );
  });
  it("edge fixture: editing the number changes the section, and a cut reads as a cut", () => {
    expect(composeBill(input(1100))!.sections[0]).not.toBe(
      composeBill(input(1250))!.sections[0],
    );
    expect(composeBill(input(1250))!.sections[0]).toContain("$12.50 an hour");
    expect(composeBill(input(900))!.sections[0]).toContain(
      "lowered from $9.50",
    );
  });
});

describe("every law amount a body can draft has words", () => {
  // The drafting screen offers each series in series-powers.json. A series
  // with no row here could not be composed into a bill and could not be named
  // when it takes effect (golden path step 10, words-law-subjects-for-bring-it-up).
  // unemployment-insurance is a program that exists or not, not an amount.
  const draftable = Object.keys(
    (seriesPowers as { series: Record<string, unknown> }).series,
  ).filter((series) => series !== "unemployment-insurance");

  it("names the subject, composes a raise and a cut, and names the story topic of each", () => {
    expect(draftable.length).toBeGreaterThan(10);
    for (const series of draftable) {
      expect(
        BILL_SECTIONS.amounts[series],
        `${series} needs a row`,
      ).toBeTruthy();
      expect(storyTopicName(series), `${series}: story topic`).toBe(
        BILL_SECTIONS.amounts[series]!.subject,
      );
      const unit =
        series === "snap-maximum"
          ? "USD/month"
          : series === "unemployment-weekly-maximum"
            ? "USD/week"
            : series === "minimum-wage"
              ? "minor/hour"
              : "percent";
      for (const [to, before, word] of [
        [12, 10, "raised"],
        [8, 10, "lowered"],
      ] as const) {
        const made = composeBill({
          id: `b:${series}`,
          number: "2026-1",
          form: {
            kind: "ordinance",
            enactingClause: "Be it ordained by the Town",
          },
          provisions: [{ kind: "law-amount", series, value: to, unit }],
          before: [{ value: before, unit, statute: null }],
        })!;
        expect(made, `${series} ${word}`).toBeTruthy();
        expect(made.sections[0], `${series} ${word}`).toContain(word);
        expect(made.sections[0], series).not.toMatch(/[{}]|undefined|NaN/);
      }
    }
  });

  it("words a monthly and a weekly amount", () => {
    expect(valueWords(291, "USD/month")).toBe("$291 a month");
    expect(valueWords(450, "USD/week")).toBe("$450 a week");
  });
});

describe("a bill composed from the played world", () => {
  const place = drawPlace(seed, "bill-text");
  const world = buildBenchWorld(place.seed, opening, {
    twoLevel: true,
    placeKey: place.key,
  });
  let date = opening;
  for (let day = 0; day < 250; day += 1) {
    date = addDay(date);
    advanceCore(world.core, date);
  }
  const api = coreAPI(world.core);
  const bills = api
    .moduleState("core2-legislature-v1")
    .table("bills")
    .rows() as unknown as BillRow[];

  it(`words every bill with catalog provisions (${place.name}, seed ${seed})`, () => {
    const worded = bills.filter((bill) =>
      bill.provisions.every(
        (p) => p.kind !== "budget-line" && (p.question || p.series),
      ),
    );
    expect(worded.length, "a year of bills").toBeGreaterThan(0);
    for (const bill of worded) {
      const form = billForm(api, bill);
      const made = composeBill({
        ...bill,
        effective: form.effectiveSection,
        before: form.sections.map((section) => section.before),
      })!;
      expect(made, bill.number).toBeTruthy();
      expect(made.title, bill.id).toMatch(
        /^An? (ordinance|bill for an act) to /,
      );
      expect(made.sections.length, bill.id).toBe(bill.provisions.length);
      expect(made.sections[0], bill.id).toContain(
        bill.form.enactingClause.replace(/[,\s]+$/, "").slice(0, 8),
      );
      expect(made.text.join(" "), bill.id).not.toMatch(/[{}]|undefined|NaN/);
      expect(made.text[0], bill.id).toBe(
        made.title.charAt(0).toUpperCase() + made.title.slice(1),
      );
    }
  });

  it("leaves a bill with a budget line unworded rather than falling back on the catalog description", () => {
    const made = composeBill({
      id: "b",
      number: "2026-9",
      form: { kind: "ordinance", enactingClause: "Be it ordained by the Town" },
      provisions: [{ kind: "budget-line", value: 5 }],
    });
    expect(made).toBeNull();
  });
});
