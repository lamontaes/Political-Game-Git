import { describe, expect, it } from "vitest";
import {
  wordSceneMove,
  type Fact,
  type SceneMove,
} from "../english/scene-talk-words";

// The notice at home (owner, Nov 8 playtest, P39): its lines say what the
// record says, the amount owed and how long the rent has gone unpaid, and fit
// a small shortfall differently from a deep one. "That far behind" is never
// said of a few dollars, and no line names a season.
const fact = (text: string): Fact => ({ text, sourceRecordIds: ["notice"] });
const base = {
  deadline: fact("March 30"),
  owed: fact("about $400"),
  late: fact("about two months"),
};
const cases: { name: string; facts: Record<string, Fact> }[] = [
  {
    name: "a small shortfall left for months",
    facts: { ...base, owed: fact("about $15"), "short-little": fact("yes") },
  },
  {
    name: "a deep shortfall",
    facts: { ...base, owed: fact("about $2,400"), "short-deep": fact("yes") },
  },
  { name: "an amount in between", facts: { ...base } },
];
const move = (
  step: SceneMove["step"],
  mv: string,
  role: SceneMove["role"],
  after?: string,
): SceneMove => ({
  step,
  move: mv,
  role,
  purpose: "notice-home",
  key: "notice",
  ...(after ? { after } : {}),
});
const say = (use: SceneMove, facts: Record<string, Fact>, speaker: string) => {
  const worded = wordSceneMove({
    move: use,
    facts,
    seed: "notice-shortfall",
    speakerId: speaker,
    traits: {},
    momentKey: `${speaker}:${use.step}:${use.move}`,
    said: new Set(),
    options: { includeHeld: true },
  });
  return worded && !("unused" in worded) ? worded.text : null;
};
const speakers = ["a", "b", "c", "d", "e", "f", "g", "h"];

describe("the notice at home is worded to fit what is owed", () => {
  for (const { name, facts } of cases) {
    it(`says the amount and how long it has run: ${name}`, () => {
      const lines = new Set(
        speakers.map((who) =>
          say(move("state", "deliver-news", "asker"), facts, who),
        ),
      );
      for (const line of lines) {
        expect(line, name).toBeTruthy();
        expect(line, name).toContain(facts.owed!.text);
        expect(line, name).toContain("about two months");
        expect(line, name).toContain("March 30");
      }
      // Several wordings, not one.
      expect(lines.size, name).toBeGreaterThan(1);
    });
  }

  it("never calls a few dollars 'that far behind' or names a season", () => {
    for (const { name, facts } of cases) {
      for (const [step, mv, role, after] of [
        ["state", "deliver-news", "asker", undefined],
        ["reply", "ask", "asked", undefined],
        ["follow", "answer", "asker", "ask"],
        ["follow", "press", "asker", "promise"],
      ] as const)
        for (const who of speakers) {
          const line = say(move(step, mv, role, after), facts, who) ?? "";
          expect(line, `${name}: ${step}-${mv}`).not.toMatch(
            /\b(?:spring|summer|fall|autumn|winter)\b|for months\b/i,
          );
          if (facts["short-deep"] === undefined)
            expect(line, `${name}: ${step}-${mv}`).not.toMatch(
              /that far behind/i,
            );
        }
    }
  });

  it("asks about a small notice as a small notice and a deep one as a deep one", () => {
    const small = new Set(
      speakers.map((who) =>
        say(move("reply", "ask", "asked"), cases[0]!.facts, who),
      ),
    );
    expect([...small].some((line) => /\$15/.test(line ?? ""))).toBe(true);
    const deep = new Set(
      speakers.map((who) =>
        say(move("reply", "ask", "asked"), cases[1]!.facts, who),
      ),
    );
    expect(
      [...deep].some((line) => /\$2,400|far behind/.test(line ?? "")),
    ).toBe(true);
  });
});
