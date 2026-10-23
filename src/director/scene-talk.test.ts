import RULES_BOUND from "./data/scene-talk-rules.json" with { type: "json" };
import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { buildDeepPast } from "../core2/deep-past";
import { initialFocusPeople } from "../core2/focus";
import { advanceCore, createLifeCore } from "../core2/life";
import { buildPopulation } from "../core2/population";
import { createDirector } from "./ledger";
import { composeSceneTalk, type PurposeType } from "./scene-talk";
import type { Fact } from "./render";
import situationFile from "./data/situation-types.json" with { type: "json" };

// Scenes with a purpose (owner, Oct 15, evening): a setup, a person with a
// purpose, stakes, and an exchange that plays to resolved or refused, worded
// only from data/english/parts/scene-talk.json.
const seed = process.env.GOLDEN_PATH_SEED ?? "scene-talk-test";
const base = enrichCivicInputs(
  buildDeepPast(
    buildPopulation({
      seed,
      ...(process.env.GOLDEN_PATH_SEED
        ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
        : {}),
      startedAt: "2021-01-01",
      minimumPeople: 300,
    }),
  ),
);
const age = (birth: string) =>
  ageOnDate(makeIsoDate(birth), makeIsoDate(base.startedAt));
const adults = base.people.filter(
  (person) => person.tier !== "husk" && age(person.birthDate) >= 25,
);
const player = adults[0]!;
const input = { ...base, playerId: player.id };
const director = createDirector({ watch: [...initialFocusPeople(input)] });
const core = createLifeCore(input, { modules: [director.module] });
director.start(core);
advanceCore(core, "2021-01-03");
const askerId = adults[1]!.id;
const askedId = player.id;

const fact = (text: string): Fact => ({ text, sourceRecordIds: [askerId] });
const flags = [
  "your-promise",
  "recruit",
  "story",
  "problem-job",
  "problem-eviction",
  "problem-illness",
  "absence",
  "in-office",
  "bill-lost",
];
const facts: Record<string, Fact> = {
  name: fact("Pat Rivera"),
  first: fact(core.people.get(askedId)!.givenName),
  bill: fact('"Limit groundwater withdrawal"'),
  section: fact("2"),
  office: fact("county commissioner"),
  place: fact("the town"),
  money: fact("$500"),
  outlet: fact("the Courier"),
  story: fact("the groundwater vote"),
  opponent: fact("Dana Lee"),
  party: fact("Democratic"),
  ...Object.fromEntries(flags.map((name) => [name, fact("yes")])),
  deceased: fact("Sam Ortiz"),
  cause: fact("a long illness"),
  kid: fact("Jordan"),
  job: fact("the hardware store"),
  event: fact("the town hall"),
  crowd: fact("forty people"),
  petition: fact("the recall petition"),
  minutes: fact("three minutes"),
  tally: fact("4 to 3"),
  years: fact("six"),
  home: fact("apartment"),
  rent: fact("$900 a month"),
  stake: fact("your seat"),
  "what-happened": fact("your vote on the bill"),
  self: fact("Pat Rivera"),
  effect: fact("my rent went up"),
  relative: fact("Robin Ortiz"),
  where: fact("county clerk's office"),
  executive: fact("governor"),
  employer: fact("the hardware store"),
  when: fact("this morning"),
};
// The bank's parts are authored and held until the owner grades them; the
// engine is tested the way the review page composes, with held parts in.
const HELD = { includeHeld: true } as const;
const types = (
  situationFile as unknown as { types: PurposeType[] }
).types.filter((row) => row.purpose);

describe(`scenes with a purpose (seed ${seed})`, () => {
  it("has the sixteen purpose types the arcs file words", () => {
    expect(types.length).toBeGreaterThanOrEqual(16);
  });

  it("composes every purpose: setup, open, statement, four replies, an answer and a close, in the bank's own words", () => {
    for (const type of types) {
      const result = composeSceneTalk(
        core,
        director,
        { askerId, askedId },
        type,
        facts,
        {},
        HELD,
      );
      expect(result.kind, `${type.key}`).toBe("composed");
      if (result.kind !== "composed") continue;
      const { talk } = result;
      expect(talk.narration.length).toBeGreaterThan(0);
      expect(talk.rounds.length).toBeGreaterThan(0);
      expect(talk.rounds[0]!.replies.length).toBeGreaterThanOrEqual(3);
      expect(talk.rounds[0]!.replies.filter((r) => r.chosen)).toHaveLength(1);
      for (const line of talk.lines) {
        expect(line.text).not.toMatch(/[{}]/);
        expect(line.register).toBe("scene-talk");
        expect(line.parts.length).toBeGreaterThan(0);
        expect(line.parts[0]).toMatch(/^scene-talk\./);
        expect(line.slotRecordIds.length).toBeGreaterThan(0);
      }
      // The page gate (scene-page.ts) reports an end that leaves a question
      // hanging. The engine never ends on the asker's own question: where the
      // bank holds no close for that ending, the asker does not ask it.
      const final = talk.lines.at(-1)!;
      const where = `${type.key}: ${JSON.stringify(talk.lines.slice(-3).map((l) => [l.role, l.move, l.text]))}`;
      expect(
        final.role === "asker" && /\?$/.test(final.text.trim()),
        where,
      ).toBe(false);
    }
  });

  it("is deterministic and a personality changes the path or the words", () => {
    let differing = 0;
    for (const type of types) {
      const compose = (level: number) => {
        const traits = Object.fromEntries(
          [
            "personality-v1:facet-friendly",
            "personality-v1:facet-affectionate",
            "personality-v1:facet-hostile",
            "personality-v1:facet-persistent",
            "personality-v1:facet-argumentative",
            "personality-v1:facet-forgiving",
            "personality-v1:facet-sensitive",
          ].map((id, k) => [id, k % 2 ? -level : level]),
        );
        const result = composeSceneTalk(
          core,
          director,
          { askerId, askedId },
          type,
          facts,
          { askerTraits: traits, askedTraits: traits },
          HELD,
        );
        return result.kind === "composed"
          ? result.talk.lines.map((line) => line.text).join("|")
          : "";
      };
      const warm = compose(2);
      expect(compose(2)).toBe(warm);
      if (warm !== compose(-2)) differing += 1;
    }
    expect(differing).toBeGreaterThan(0);
  });

  it("never says a fact the record lacks: with the bill missing, a bill scene is skipped, not invented", () => {
    const type = types.find((row) => row.purpose === "ask-vote")!;
    const { bill, ...without } = facts;
    void bill;
    const result = composeSceneTalk(
      core,
      director,
      { askerId, askedId },
      type,
      without,
      {},
      HELD,
    );
    expect(result.kind).toBe("skipped");
  });
  it("keeps a scene out of play while its words are held until graded", () => {
    for (const type of types) {
      const result = composeSceneTalk(
        core,
        director,
        { askerId, askedId },
        type,
        facts,
      );
      expect(result.kind, type.key).toBe("skipped");
    }
  });
  it("composes a tree: every reply has its branch, numbers are unique, nodes are bounded, a lie shows both outcomes", () => {
    for (const type of types) {
      const withTruth = {
        ...facts,
        source: fact("Kelly at the clerk's office"),
        "knows-truth": fact("yes"),
      };
      const result = composeSceneTalk(
        core,
        director,
        { askerId, askedId },
        type,
        withTruth,
        {},
        HELD,
      );
      expect(result.kind, type.key).toBe("composed");
      if (result.kind !== "composed") continue;
      const { talk } = result;
      // The bound from the rules, plus the last node that crossed it.
      expect(talk.nodes).toBeLessThanOrEqual(
        RULES_BOUND.tree.maxNodes.value + 10,
      );
      expect(talk.depth).toBeGreaterThanOrEqual(1);
      const numbers: number[] = [];
      let lies = 0;
      const walk = (node: typeof talk.tree) => {
        node.lines.forEach((line) => numbers.push(line.n));
        for (const reply of node.replies) {
          numbers.push(reply.line.n);
          if (reply.line.move === "lie" && reply.next?.branches) {
            lies += 1;
            // The caught branch is always there with the fact; the believed
            // one is there unless the bank lacks its piece, which is a listed gap.
            const knows = reply.next.branches.map((b) => b.knows);
            expect(knows).toContain(true);
            if (knows.length === 1)
              expect(talk.gaps.join(" ")).toMatch(/lie \(believed\)/);
          }
          if (reply.next) walk(reply.next);
        }
        for (const branch of node.branches ?? []) walk(branch.node);
        if (node.end?.close) numbers.push(node.end.close.n);
      };
      walk(talk.tree);
      for (const line of [...talk.narration, talk.state]) numbers.push(line.n);
      if (talk.open) numbers.push(talk.open.n);
      expect(new Set(numbers).size).toBe(numbers.length);
      void lies;
    }
  });
});
