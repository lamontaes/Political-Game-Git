import { describe, expect, it } from "vitest";
import sceneTalkBank from "../../data/english/parts/scene-talk.json";
import {
  shipped,
  wordSceneMove,
  type BankPart,
  type PartUse,
  type SceneMove,
} from "./scene-talk-words";

// Words rule most-specific-line-wins (owner, Oct 19: "Be sure you include
// personality traits or experiences or memories that are coming to effect in
// these as well"; Nov 8: "having conditionals for lines"): where a line tied
// to the situation or to a fact on the speaker's record fits, it is said
// rather than a generic one. The composer's ranking is `useFit` in
// ./scene-talk-words.ts; these tests read what `wordSceneMove` actually says.

type Facts = Record<string, { text: string; sourceRecordIds: string[] }>;
const fact = (text: string) => ({ text, sourceRecordIds: ["record:test"] });
const MOMENTS = Array.from({ length: 24 }, (_, n) => `moment:${n}`);

function said(
  move: SceneMove,
  facts: Facts,
  parts: readonly BankPart[] | undefined,
  momentKey: string,
): string | undefined {
  const worded = wordSceneMove({
    move,
    facts,
    seed: "most-specific-line-wins",
    speakerId: "person:speaker",
    traits: {},
    momentKey,
    said: new Set(),
    ...(parts ? { options: { parts } } : {}),
  });
  return worded && "pieceKey" in worded ? worded.pieceKey : undefined;
}

describe("the most specific line that fits is said", () => {
  const use = (extra: Partial<PartUse> = {}): PartUse => ({
    subject: "scene",
    purpose: "specific-test",
    step: "state",
    move: "tell-test",
    role: "asker",
    ...extra,
  });
  const part = (key: string, uses: PartUse[]): BankPart => ({
    key,
    text: `Line ${key}.`,
    uses,
  });
  const move: SceneMove = {
    step: "state",
    move: "tell-test",
    role: "asker",
    purpose: "specific-test",
    key: "routine",
  };
  const every = (
    parts: BankPart[],
    at: SceneMove,
    facts: Facts = {},
  ): Set<string | undefined> =>
    new Set(MOMENTS.map((moment) => said(at, facts, parts, moment)));

  it("a line tied to a fact on the record beats a generic one, and the generic one serves without it", () => {
    const parts = [
      part("generic.a", [use()]),
      part("generic.b", [use()]),
      part("lost-job", [use({ requiresFacts: ["employer"] })]),
    ];
    expect(every(parts, move, { employer: fact("the mill") })).toEqual(
      new Set(["lost-job"]),
    );
    expect(every(parts, move)).toEqual(new Set(["generic.a", "generic.b"]));
  });

  it("a line for the situation beats one for any situation", () => {
    const parts = [
      part("any", [use()]),
      part("routine", [use({ key: "routine" })]),
    ];
    expect(every(parts, move)).toEqual(new Set(["routine"]));
  });

  it("a variant's own line beats its family's", () => {
    const parts = [
      part("family", [use({ purpose: "specific-test" })]),
      part("variant", [use({ purpose: "specific-test.sick" })]),
    ];
    const variant = {
      ...move,
      purpose: "specific-test.sick",
      family: "specific-test",
    };
    expect(every(parts, variant)).toEqual(new Set(["variant"]));
  });

  it("a reply written for the very line it answers beats one for any line of that kind", () => {
    const parts = [
      part("any", [use()]),
      part("after-move", [use({ after: "ask" })]),
      part("after-piece", [use({ after: "scene-talk.ask.were-you-there" })]),
    ];
    const answering = {
      ...move,
      after: "ask",
      afterPiece: "scene-talk.ask.were-you-there",
    };
    expect(every(parts, answering)).toEqual(new Set(["after-piece"]));
    expect(every(parts, { ...move, after: "ask" })).toEqual(
      new Set(["after-move"]),
    );
  });

  it("equally specific lines share the pick", () => {
    const parts = [
      part("tied.a", [use({ requiresFacts: ["employer"] })]),
      part("tied.b", [use({ requiresFacts: ["employer"] })]),
      part("generic", [use()]),
    ];
    expect(every(parts, move, { employer: fact("the mill") })).toEqual(
      new Set(["tied.a", "tied.b"]),
    );
  });
});

// The shipped bank: at every spot where a piece tied to a fact and a generic
// piece both fit, the fact on record means the tied piece is said; without it,
// a generic one. The bank is walked once with no draws; every other slot a
// spot's pieces name is filled, and no spot may be passed over.
describe("the shipped scene-talk bank says its most specific line", () => {
  const PARTS = (sceneTalkBank as unknown as { parts: BankPart[] }).parts;
  const whole = PARTS.filter(
    (part) =>
      !part.piece &&
      shipped(part.key) &&
      !part.uses.some((u) =>
        (u.requiresFacts ?? []).some((name) => name.startsWith("asked_")),
      ),
  );
  const spotOf = (u: PartUse) =>
    [u.subject, u.purpose, u.key, u.step, u.move, u.role, u.after, u.outcome]
      .map((value) => value ?? "")
      .join("|");
  const bySpot = new Map<string, { part: BankPart; use: PartUse }[]>();
  for (const part of whole)
    for (const u of part.uses)
      if (u.subject === "scene")
        bySpot.set(spotOf(u), [
          ...(bySpot.get(spotOf(u)) ?? []),
          { part, use: u },
        ]);

  // The press-comment spot's lines were emptied by the cut of Nov 17 (#10063) and come back with
  // pool item story-lines-office-press-and-pressure (CTO, #9750 and #9747, Nov 19 04:53Z): that
  // spot is asked on its own, as a known failure, and every other spot as before.
  const PRESS = "|press-comment|";
  const check = (asked: (spot: string) => boolean) => {
    let checked = 0;
    const passedOver: string[] = [];
    const wrong: string[] = [];
    for (const [spot, rows] of bySpot) {
      if (!asked(spot)) continue;
      // A line that checks any fact (requiresFacts or onlyWhen) is not
      // generic: both rank alike (words-a-line-ranks-by-every-fact-it-checks).
      const generic = rows.filter(
        (row) =>
          !row.use.requiresFacts?.length &&
          !row.use.onlyWhen?.length &&
          !row.use.excludesFacts?.length,
      );
      const tied = rows.filter(
        (row) =>
          row.use.requiresFacts?.length === 1 && !row.use.excludesFacts?.length,
      );
      if (!generic.length || !tied.length) continue;
      const first = tied[0]!.use;
      const name = first.requiresFacts![0]!;
      const holders = new Set(
        tied
          .filter((row) => row.use.requiresFacts![0] === name)
          .map((row) => row.part.key),
      );
      const plain = new Set(generic.map((row) => row.part.key));
      // A spot where another piece is ruled out by the fact is not this rule's case.
      if (rows.some((row) => row.use.excludesFacts?.includes(name))) continue;
      const at: SceneMove = {
        step: first.step,
        move: first.move,
        role: first.role,
        purpose: first.purpose ?? "*",
        key: first.key ?? "",
        ...(first.after ? { after: first.after } : {}),
        ...(first.outcome ? { outcome: first.outcome } : {}),
      };
      // Every other slot the spot's pieces name is filled, so a piece is
      // never passed over for a word the record would give it.
      const slots: Facts = {};
      for (const row of rows) {
        for (const [, slot] of row.part.text.matchAll(/\{([\w-]+)\}/g))
          if (slot !== name) slots[slot] = fact("x");
        // A truth guard (`onlyWhen`) only keeps a line from being false and
        // adds nothing to its rank: the record holds it in both cases.
        for (const guard of row.use.onlyWhen ?? [])
          if (guard !== name) slots[guard] = fact("x");
      }
      const withFact = said(
        at,
        { ...slots, [name]: fact("x") },
        undefined,
        "m",
      );
      // Where every generic piece says the fact's own word too ("Do you want
      // to hold {kid}?"), no line serves without it, so only the side with
      // the fact is asked.
      const servesWithout = generic.some(
        (row) => !row.part.text.includes(`{${name}}`),
      );
      const without = servesWithout ? said(at, slots, undefined, "m") : null;
      if (withFact === undefined || without === undefined) {
        passedOver.push(spot);
        continue;
      }
      checked += 1;
      // A piece that fits more closely for another reason may win; a
      // generic piece never beats the tied one at the same spot.
      if (plain.has(withFact))
        wrong.push(`${spot}: with ${name} said ${withFact}`);
      if (without && holders.has(without))
        wrong.push(`${spot}: without ${name} said ${without}`);
    }
    expect(wrong).toEqual([]);
    // Every spot is asked: none may be passed over.
    expect(passedOver).toEqual([]);
    expect(checked).toBeGreaterThan(0);
    console.log(`most-specific-line-wins: ${checked} spots checked`);
  };

  it("says the line tied to the record where one fits, else a generic one", () =>
    check((spot) => !spot.includes(PRESS)));
  it.fails(
    "the press comment says the line tied to the record (story-lines-office-press-and-pressure)",
    () => check((spot) => spot.includes(PRESS)),
  );
});
