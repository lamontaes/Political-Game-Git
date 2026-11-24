import { describe, expect, it } from "vitest";
import {
  OUTLINE_BANK_PARTS,
  partsOf,
  tell,
  tellFully,
  withPolicyFacts,
  type TellingFacts,
} from "./outline-planner";

/**
 * The one outline planner (the Story lead, Nov 24, 2026; owner, Nov 23:
 * "It. What is it?" and "this is all following the same grammatical
 * pattern"). Pieces know what came before; speakers do not share a
 * skeleton; a fact is said no more than its budget.
 */
const f = (text: string) => ({ text, sourceRecordIds: ["record:test"] });
const facts: TellingFacts = Object.fromEntries(
  Object.entries({
    "term-left": "four years",
    "run-span": "four years",
    "run-hard": "yes",
    "run-inherited": "yes",
    "run-prices-ahead": "yes",
    "took-oath": "yes",
    "elected-last-fall": "yes",
    "theme-name": "the cost of a place to live",
    "theme-short": "housing",
    about: "a cap on rent increases",
    to: "cap rent increases",
    "law-name": "the cap on rent increases",
    "stance-against": "yes",
    "law-not-in-force": "yes",
    "other-side": "cap rent increases",
    belief: "a cap on rent means fewer homes get built",
    "belief-sentence": "A cap on rent means fewer homes get built.",
    today: "Landlords set the rent, and new buildings keep going up.",
    "today-clause": "landlords set the rent, and new buildings keep going up.",
    "the-vice-president": "Vice President Ann Lee",
  }).map(([key, text]) => [key, f(text)]),
);
const traitsOf = (facets: readonly string[], level: number) =>
  Object.fromEntries(
    facets.map((facet) => [`personality-v1:facet-${facet}`, level]),
  );
const PROFILES = [
  traitsOf(["blunt", "informal", "cocky"], 2),
  traitsOf(["sincere", "duty-bound", "devoted"], 2),
  traitsOf(["analytical", "practical", "studious"], 2),
  traitsOf(["dramatic", "charming", "excitable"], 2),
  traitsOf(["assertive", "argumentative", "competitive"], 2),
];
const told = (traits: Record<string, number>, key = "moment") =>
  tell({
    kind: "inaugural",
    facts,
    momentKey: key,
    worldSeed: "seed",
    sourceRecordIds: ["record:test"],
    knower: "person:president",
    traits,
  });

describe("the outline planner", () => {
  it("puts the policy a fact cites in the facts by its catalog id, so a line can require it", () => {
    // The CTO, Nov 24 (7140057819 on #9750): a line tagged with a policy
    // fires when that policy is live in the player's world.
    const cited = withPolicyFacts({
      about: {
        text: "rent stabilization",
        sourceRecordIds: ["person:mayor", "question:housing.rent-cap"],
      },
      place: { text: "Ashton", sourceRecordIds: ["place:ashton"] },
    });
    expect(cited["policy:question:housing.rent-cap"]?.sourceRecordIds).toEqual([
      "question:housing.rent-cap",
    ]);
    expect(
      Object.keys(cited).filter((key) => key.startsWith("policy:")),
    ).toEqual(["policy:question:housing.rent-cap"]);
  });

  it("lets a piece that leans on the sentence before it play only after the moves it names", () => {
    const parts = OUTLINE_BANK_PARTS;
    const leaning = /^(?:That|That's|It|It's|This|These|Those|So|And|Not me)\b/;
    for (const part of parts)
      if (leaning.test(part.text))
        expect(part.after?.length, part.key).toBeGreaterThan(0);
    for (const traits of PROFILES) {
      const text = told(traits)!;
      for (const [at, row] of text.sentences.entries()) {
        const part = partsOf("inaugural").find((p) => p.key === row.piece)!;
        if (!part.after) continue;
        const before = text.sentences[at - 1];
        const opens = !before || before.paragraph !== row.paragraph;
        expect(part.after, row.text).toContain(opens ? "start" : before.move);
      }
    }
  });

  it("gives speakers of different traits different skeletons from one record", () => {
    const skeletons = new Set(
      PROFILES.map((traits) =>
        told(traits)!
          .sentences.map((row) => row.shape)
          .filter((shape, at, all) => all.indexOf(shape) === at)
          .join(" > "),
      ),
    );
    expect(skeletons.size).toBeGreaterThanOrEqual(3);
  });

  it("says a fact's words no more often than its budget", () => {
    for (const traits of PROFILES)
      for (const key of ["a", "b", "c"]) {
        const text = told(traits, key)!.paragraphs.join(" ");
        expect(text.split("four years").length - 1, text).toBeLessThanOrEqual(
          3,
        );
        expect(text.split("housing").length - 1, text).toBeLessThanOrEqual(1);
      }
  });

  it("ends no point of an inaugural in an ask of Congress more than once", () => {
    for (const traits of PROFILES) {
      const text = told(traits)!.paragraphs.join(" ");
      expect(
        (text.match(/\bask Congress\b/g) ?? []).length,
      ).toBeLessThanOrEqual(1);
      expect(text).not.toMatch(/Hold me to it/);
    }
  });
  it("orders its middle sections by the speaker, never one fixed run of sections, and never tells a four-line rally", () => {
    // The CTO, Nov 24 (send-back 2 on #10390): every address said all six
    // sections in one order, so one close ended four of six addresses.
    const runs = new Set<string>();
    const lengths: number[] = [];
    for (const traits of [
      ...PROFILES,
      traitsOf(["mediating", "forgiving", "fair-minded", "humble"], 2),
      traitsOf(["guarded", "practical", "meticulous", "skeptical"], 2),
    ])
      for (const key of ["a", "b", "c", "d"]) {
        const text = told(traits, key)!;
        const sections = [...new Set(text.sentences.map((row) => row.section))];
        runs.add(sections.join(" "));
        // Under the row's least, a text is the full telling: every optional
        // part that fits is said.
        if (text.sentences.length < 11)
          expect(text.sentences.length).toBe(
            tellFully({
              kind: "inaugural",
              facts,
              momentKey: key,
              worldSeed: "seed",
              sourceRecordIds: ["record:test"],
              knower: "person:president",
              traits,
            })!.sentences.length,
          );
        lengths.push(text.sentences.length);
        // A line that names the stand again comes only after the stand.
        const stand = sections.indexOf("theme");
        for (const row of text.sentences)
          if (row.section === "call" && row.facts.includes("about"))
            expect(stand, row.text).toBeGreaterThanOrEqual(0);
      }
    const orders = new Set(
      [...runs].map((run) =>
        run
          .split(" ")
          .filter((name) => ["story", "theme", "call"].includes(name))
          .join(" "),
      ),
    );
    expect(orders.size, [...runs].join("\n")).toBeGreaterThanOrEqual(2);
    // Pre-grade round 5, Nov 24: 56-word addresses ("A four-line rally is
    // not a speech"); these facts give eight sentences told in full.
    expect(Math.min(...lengths)).toBeGreaterThanOrEqual(8);
  });
  it("says a second point on its own facts where the record holds one, and leaves the section out where it does not", () => {
    // The CTO, Nov 24 (7131781243 on #10377): an address's length comes
    // from a second point drawn from the world, not from stock slots.
    const second: TellingFacts = Object.fromEntries(
      Object.entries({
        about: "more defense spending",
        to: "grow defense spending",
        "law-name": "the defense spending increase",
        "stance-against": "yes",
        "law-not-in-force": "yes",
        "other-side": "grow defense spending",
        belief: "our money should go to needs here at home first",
        "belief-sentence": "Our money should go to needs here at home first.",
      }).map(([key, text]) => [key, f(text)]),
    );
    for (const traits of PROFILES) {
      const without = told(traits)!;
      expect(without.sentences.some((row) => row.section === "second")).toBe(
        false,
      );
      const withPoint = tell({
        kind: "inaugural",
        facts,
        points: [second],
        momentKey: "moment",
        worldSeed: "seed",
        sourceRecordIds: ["record:test"],
        knower: "person:president",
        traits,
      })!;
      const said = withPoint.sentences.filter(
        (row) => row.section === "second",
      );
      expect(said.length).toBeGreaterThan(0);
      // The second point speaks of its own subject, never the first's.
      expect(said.map((row) => row.text).join(" ")).not.toContain(
        "rent increases",
      );
    }
  });
});
