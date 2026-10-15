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
};
const types = (
  situationFile as unknown as { types: PurposeType[] }
).types.filter((row) => row.purpose);

describe(`scenes with a purpose (seed ${seed})`, () => {
  it("has the sixteen purpose types the arcs file words", () => {
    expect(types.length).toBe(16);
  });

  it("composes every purpose: setup, open, statement, four replies, an answer and a close, in the bank's own words", () => {
    for (const type of types) {
      const result = composeSceneTalk(
        core,
        director,
        { askerId, askedId },
        type,
        facts,
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
      // The close is never the next line after a question: the asker's last
      // question was answered by a reply first, and the close follows an answer.
      // It ends on the asker's answer or a close, never on a question left hanging.
      const final = talk.lines.at(-1)!;
      expect(final.role).toBe("asker");
      expect(/\?$/.test(final.text.trim())).toBe(false);
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
    );
    expect(result.kind).toBe("skipped");
  });
});
