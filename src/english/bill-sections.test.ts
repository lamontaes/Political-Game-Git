import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { policyNames } from "../bench/words";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore } from "../core2/life";
import { billForm, type BillRow } from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import seriesPowers from "../core2/data/legislature/series-powers.json" with { type: "json" };
import federalQuestions from "../../data/research/campaigns/federal-questions-2026.json" with { type: "json" };
import bankData from "../../data/english/bill-sections.json" with { type: "json" };
import enactingClauses from "../core2/data/legislature/enacting-clauses.json" with { type: "json" };
import billForms from "../core2/data/legislature/bill-forms.json" with { type: "json" };
import { billTitleOf } from "./bill-names";
import { storyTopicName } from "./policy-names";
import {
  amountWords,
  BILL_SECTIONS,
  composeBill,
  valueWords,
} from "./bill-sections";

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
      const row = BILL_SECTIONS.policies[id] ?? amountWords(key);
      expect(row, `${key} (${description}) needs a row`).toBeTruthy();
      expect(row!.subject.length, key).toBeGreaterThan(3);
      expect(row!.purpose.length, key).toBeGreaterThan(3);
    }
    // A row is for a question some bill can carry: one on the catalog, or
    // one of the federal questions Congress files on.
    const federal = federalQuestions.questions.map((row) => row.question);
    for (const id of Object.keys(BILL_SECTIONS.policies))
      expect(
        [...Object.keys(policyNames()), ...federal].some((k) =>
          k.endsWith(`:${id}`),
        ),
        `${id} is not on the catalog or the federal record`,
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
        statute: "2025-3",
        statuteForm: "ordinance",
      },
    ],
  });
  it("edge fixture: says the old value, the new value and the bill that enacted it", () => {
    const made = composeBill(input(1100))!;
    expect(made.sections[0]).toBe(
      "Section 1. Be it ordained by the Town, That the minimum wage shall be raised from $9.50 an hour to $11 an hour, amending Ordinance 2025-3.",
    );
  });
  it("edge fixture: a state act the town amends is cited in its own form, a starting law by its recorded statute or not at all", () => {
    const state = input(1100);
    expect(
      composeBill({
        ...state,
        before: [{ ...state.before[0]!, statute: "HB 9", statuteForm: "act" }],
      })!.sections[0],
    ).toMatch(/to \$11 an hour, amending HB 9\.$/);
    expect(
      composeBill({
        ...state,
        before: [{ value: 950, unit: "minor/hour", statute: null }],
      })!.sections[0],
    ).toMatch(/to \$11 an hour\.$/);
    // A starting law's recorded statute is cited as recorded.
    expect(
      composeBill({
        ...state,
        before: [
          {
            value: 950,
            unit: "minor/hour",
            statute: "§ 25-7-41",
            statuteForm: null,
          },
        ],
      })!.sections[0],
    ).toMatch(/to \$11 an hour, amending § 25-7-41\.$/);
  });
  it("an act names itself with a short title read from the same record as every other screen, and a local ordinance has none", () => {
    const question = "us-policy-positions:labor-workforce.raise-minimum-wage";
    const bill = (kind: string) => ({
      id: "bill:fixture-title",
      number: "2026-5",
      form: { kind, enactingClause: "Be it enacted by the Legislature" },
      provisions: [
        { kind: "policy-question", question, value: 1, operation: "enact" },
      ],
    });
    const act = composeBill(bill("act"))!;
    expect(act.shortTitle, act.title).toMatch(
      /^This Act may be cited as the \u201C[^\u201D]+\u201D\.$/,
    );
    const bill1 = bill("act");
    expect(act.shortTitle).toContain(
      billTitleOf({ form: bill1.form, provisions: bill1.provisions })!.title,
    );
    expect(act.text[1]).toBe(act.shortTitle);
    expect(act.text.join(" ")).not.toMatch(/and for other purposes/);
    const local = composeBill(bill("ordinance"))!;
    expect(local.shortTitle).toBeNull();
    expect(local.text.join(" ")).not.toMatch(/may be cited as/);
  });
  it("a mixed bill's heading words a repeal from the repeal, never from the purpose of the law it ends", () => {
    const wage = "us-policy-positions:labor-workforce.raise-minimum-wage";
    const fare =
      "us-policy-positions:transportation-infrastructure.fare-free-transit";
    const made = composeBill({
      id: "bill:fixture-mixed",
      number: "2026-6",
      form: { kind: "act", enactingClause: "Be it enacted by the Legislature" },
      provisions: [
        {
          kind: "policy-question",
          question: fare,
          value: 0,
          operation: "repeal",
        },
        {
          kind: "policy-question",
          question: wage,
          value: 1,
          operation: "enact",
        },
      ],
    })!;
    const repeal =
      BILL_SECTIONS.policies[
        "transportation-infrastructure.fare-free-transit"
      ]!;
    expect(made.title).toContain(`repeal the law on ${repeal.subject}`);
    expect(made.title).not.toContain(repeal.purpose);
    expect(made.title).toMatch(/ and to /);
    expect(made.sections[0]).toContain("is repealed");
  });
  it('a heading of three purposes says "to" for each', () => {
    const q = (k: string) => `us-policy-positions:${k}`;
    const made = composeBill({
      id: "bill:fixture-three",
      number: "2026-8",
      form: { kind: "act", enactingClause: "Be it enacted by the Legislature" },
      provisions: [
        {
          kind: "policy-question",
          question: q("labor-workforce.raise-minimum-wage"),
          value: 1,
          operation: "enact",
        },
        {
          kind: "policy-question",
          question: q("transportation-infrastructure.fare-free-transit"),
          value: 1,
          operation: "enact",
        },
        {
          kind: "policy-question",
          question: q("transportation-infrastructure.public-broadband"),
          value: 0,
          operation: "repeal",
        },
      ],
    })!;
    expect(made.title).toMatch(
      /^A bill for an act to .+, to .+ and to repeal the law on /,
    );
  });
  it("every body's enacting words join the section's text as one sentence", () => {
    const clauses = [
      ...Object.entries(enactingClauses.clauses).map(
        ([key, row]) => [key, (row as { text: string }).text, "act"] as const,
      ),
      ["federal", billForms.federal.enactingClause, "act"] as const,
      [
        "local",
        billForms.local.enactingClause.replace("{body}", "Town Council"),
        "ordinance",
      ] as const,
    ];
    expect(clauses.length).toBeGreaterThanOrEqual(58);
    const question = "us-policy-positions:labor-workforce.raise-minimum-wage";
    for (const [key, clause, kind] of clauses) {
      const made = composeBill({
        id: `bill:fixture-${key}`,
        number: "2026-7",
        form: { kind, enactingClause: clause },
        provisions: [
          { kind: "policy-question", question, value: 1, operation: "enact" },
        ],
      })!;
      const section = made.sections[0]!;
      // One sentence after the number: lead-in, then a comma and "That", or a
      // whole sentence, a colon and the text's own capital.
      expect(section, key).toMatch(
        /^Section 1\. [^.:]+(?:, That [a-z][^.:]*|: [A-Z][^.:]*)\.$/,
      );
      expect(section, key).not.toMatch(/[,.:;] ?[,.:;]|\. That| That That/);
    }
  });
  it("edge fixture: two steps on one law state its purpose once", () => {
    // A raise phased in by dated steps (governing phase B): "An ordinance to
    // set the minimum wage and to set the minimum wage." read it twice.
    const one = input(1100);
    const made = composeBill({
      ...one,
      provisions: [one.provisions[0]!, { ...one.provisions[0]!, value: 1200 }],
      before: [one.before[0]!, { ...one.before[0]!, value: 1100 }],
    })!;
    const purpose = BILL_SECTIONS.amounts["minimum-wage"]!.purpose;
    expect(made.title.split(purpose).length - 1, made.title).toBe(1);
    expect(made.sections).toHaveLength(2);
  });
  it("edge fixture: a phase-in's sections each say when they take effect", () => {
    const one = input(1100);
    const made = composeBill({
      ...one,
      provisions: [
        { ...one.provisions[0]!, effectiveDate: "2027-01-02" },
        { ...one.provisions[0]!, value: 1200, effectiveDate: "2028-01-02" },
      ],
      before: [one.before[0]!, { ...one.before[0]!, value: 1100 }],
    })!;
    expect(made.sections[0], made.sections[0]).toMatch(
      /Section 1 takes effect on January 2, 2027\.$/,
    );
    expect(made.sections[1], made.sections[1]).toMatch(
      /Section 2 takes effect on January 2, 2028\.$/,
    );
    // One bill with one date says it once, in its closing section, not in each section.
    expect(composeBill(input(1100))!.sections[0]).not.toMatch(/takes effect/);
  });
  it("words a dated section and the sections the rule dates, in each form", () => {
    for (const form of [
      BILL_SECTIONS.forms.ordinance,
      BILL_SECTIONS.forms.act,
    ]) {
      expect(form.effective["section-date"]).toMatch(/\{number\}.*\{date\}/);
      for (const kind of [
        "on-enactment",
        "days-after-adoption",
        "state-rule",
      ] as const)
        expect(form.effective.rest[kind], kind).toMatch(
          /^Every other section /,
        );
    }
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
  // A switch (a state's grant of a power) is granted or withdrawn, not raised.
  const switches = draftable.filter(
    (series) => BILL_SECTIONS.amounts[series]?.grant,
  );
  const amounts = draftable.filter((series) => !switches.includes(series));

  it("names the subject, composes a raise and a cut, and names the story topic of each", () => {
    expect(amounts.length).toBeGreaterThan(10);
    for (const series of amounts) {
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

  it("grants and withdraws a switch in words, never as a number", () => {
    expect(switches).toContain("local-income-tax-authority");
    for (const series of switches) {
      expect(storyTopicName(series), `${series}: story topic`).toBe(
        BILL_SECTIONS.amounts[series]!.subject,
      );
      for (const [value, words] of [
        [1, BILL_SECTIONS.amounts[series]!.grant!],
        [0, BILL_SECTIONS.amounts[series]!.withdraw!],
      ] as const) {
        const made = composeBill({
          id: `b:${series}:${value}`,
          number: "2026-1",
          form: {
            kind: "act",
            enactingClause: "Be it enacted by the Legislature",
          },
          provisions: [{ kind: "law-amount", series, value, unit: "flag" }],
          before: [{ value: 1 - value, unit: "flag", statute: null }],
        })!;
        expect(made, `${series} ${value}`).toBeTruthy();
        expect(made.sections[0], `${series} ${value}`).toContain(words);
        expect(
          made.sections[0]!.replace(/^Section \d+\.\s*/, ""),
          series,
        ).not.toMatch(/[{}]|undefined|NaN|raised|lowered|\b[01]\b/);
        console.log(
          `${series} = ${value}: ${made.title} | ${made.sections[0]}`,
        );
      }
    }
  });

  it("words a monthly and a weekly amount", () => {
    expect(valueWords(291, "USD/month")).toBe("$291 a month");
    expect(valueWords(450, "USD/week")).toBe("$450 a week");
  });
});

describe("the federal questions Congress files on", () => {
  // Congress files bills on every question in the federal record; a question
  // with no row leaves its bill with no paper (red on main, Nov 11:
  // "H.R. 14: expected null to be truthy"). The next question added to the
  // record fails here until it is worded.
  it("has a subject, purpose and enacting clause for every federal question", () => {
    const unworded = federalQuestions.questions
      .map((row) => row.question.replace(/^[a-z]+(?:-[a-z]+)*:/, ""))
      .filter((key) => {
        const row = (
          bankData.policies as Record<
            string,
            { subject?: string; purpose?: string; enact?: string }
          >
        )[key];
        return !row?.subject || !row.purpose || !row.enact;
      });
    expect(unworded).toEqual([]);
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

describe("a clause words both its values in the law row's unit", () => {
  // A section that names no unit (a seat's draft) takes the law row's unit on both sides of
  // "from ... to ...", across the unit kinds: dollars an hour, percent, dollars a week.
  const cases = [
    {
      series: "minimum-wage",
      unit: "minor/hour",
      was: 725,
      now: 1500,
      say: ["from $7.25 an hour", "to $15 an hour"],
    },
    {
      series: "sales-tax",
      unit: "percent",
      was: 4,
      now: 6,
      say: ["from 4 percent", "to 6 percent"],
    },
    {
      series: "unemployment-weekly-maximum",
      unit: "USD/week",
      was: 427,
      now: 500,
      say: ["from $427 a week", "to $500 a week"],
    },
  ] as const;
  for (const c of cases)
    it(`${c.series} (${c.unit})`, () => {
      const text = composeBill({
        id: "bill:fixture",
        number: "2026-5",
        form: {
          kind: "act",
          enactingClause: "Be it enacted by the Legislature",
        },
        provisions: [{ kind: "law-amount", series: c.series, value: c.now }],
        before: [{ value: c.was, unit: c.unit, statute: null }],
      } as unknown as Parameters<typeof composeBill>[0])!.sections[0]!;
      expect(text, c.series).toContain(c.say[0]);
      expect(text, c.series).toContain(c.say[1]);
    });
});
