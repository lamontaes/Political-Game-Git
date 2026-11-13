import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { enrichCivicInputs } from "../core2/civic-inputs";
import { initialFocusPeople } from "../core2/focus";
import { advanceCore, createLifeCore } from "../core2/life";
import { buildPopulation } from "../core2/population";
import { createDirector } from "./ledger";
import { composeSceneTalk, type PurposeType } from "./scene-talk";
import type { Fact } from "../english/scene-talk-words";
import situationFile from "./data/situation-types.json" with { type: "json" };

const seed = process.env.GOLDEN_PATH_SEED ?? "scene-talk-test";
const base = enrichCivicInputs(
  buildPopulation({
    seed,
    ...(process.env.GOLDEN_PATH_SEED
      ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
      : {}),
    startedAt: "2021-01-01",
    minimumPeople: 300,
  }),
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

// The offer an official finds left for them (scenes-from-life episode
// docs/design/scenes/from-life/envelope-refused-developer.md): a favor asked
// in return for money. The corruption engine does not yet write the offer as
// an event for anyone but the player's seat, where it writes
// `corruption.bribe-offered` (src/core2/modules/corruption.ts); what this
// proves is that the scene words itself from the offer's own facts.
const type = (situationFile as unknown as { types: PurposeType[] }).types.find(
  (row) => row.key === "bribe-offer",
)!;
const fact = (text: string): Fact => ({ text, sourceRecordIds: [askerId] });
const cast = {
  name: fact("Pat Rivera"),
  first: fact(core.people.get(askedId)!.givenName),
  place: fact("the town"),
  // The offer's own price, from the crime record (bribe-facts.ts).
  amount: fact("about $400"),
};
const compose = (facts: Record<string, Fact>) => {
  const result = composeSceneTalk(
    core,
    director,
    { askerId, askedId },
    type,
    facts,
  );
  expect(result.kind).toBe("composed");
  if (result.kind !== "composed") throw new Error("not composed");
  return result.talk;
};
const statement = (facts: Record<string, Fact>) =>
  compose(facts).lines.find(
    (line) => line.role === "asker" && line.move === "request",
  )!.text;

describe(`an offer left for an official (seed ${seed})`, () => {
  it("fires from the engine's offer record and from nothing else", () => {
    expect(type.causes).toHaveLength(1);
    expect(type.causes[0]).toMatchObject({
      causeRecord: "corruption.bribe-offered",
      match: { label: "cause:event:corruption.bribe-offered" },
    });
    expect(type.causes[0]!).not.toHaveProperty("awaitingProducer");
  });

  it("says the favor the offer record names, and only that favor", () => {
    const vote = statement({
      ...cast,
      "favor-vote": fact("vote"),
      bill: fact("the free-fares ordinance"),
    });
    const contract = statement({
      ...cast,
      "favor-contract": fact("contract"),
      contract: fact("the road contract"),
    });
    expect(vote).toMatch(/vote|free-fares ordinance/);
    expect(contract).toMatch(/bid|contract/);
    expect(contract).not.toMatch(/vote/);
    expect(vote).not.toMatch(/contract|bid/);
  });

  it("offers five replies that are five stances, never three words for one answer", () => {
    const talk = compose({
      ...cast,
      "favor-contract": fact("contract"),
      contract: fact("the road contract"),
    });
    const moves = talk.tree.replies.map((reply) => reply.line.move).sort();
    expect(moves).toEqual(["accept", "confront", "lie", "refuse", "stall"]);
    expect(
      new Set(talk.tree.replies.map((reply) => reply.line.text)).size,
    ).toBe(5);
  });

  it("reaches every way the owner's corruption ruling lets it end", () => {
    const talk = compose({
      ...cast,
      "favor-contract": fact("contract"),
      contract: fact("the road contract"),
      source: fact("the town clerk"),
      "knows-truth": fact("yes"),
    });
    for (const id of [
      "took-it",
      "handed-back",
      "reported",
      "put-off",
      "caught",
    ])
      expect(talk.endingCounts[id] ?? 0, id).toBeGreaterThan(0);
  });

  it("is worded in the bank's own lines, in different bearings, with no bare slot left", () => {
    const talk = compose({
      ...cast,
      "favor-vote": fact("vote"),
      bill: fact("the free-fares ordinance"),
    });
    for (const line of talk.lines) expect(line.text).not.toMatch(/[{}]/);
    const bank = JSON.parse(
      readFileSync("data/english/parts/scene-talk.json", "utf8"),
    ) as {
      parts: {
        bearing?: string;
        uses: { purpose?: string; set?: string; step: string }[];
      }[];
    };
    // Its own lines and the bribe move set's pieces (scene-move-sets.json).
    const states = bank.parts.filter((part) =>
      part.uses.some(
        (use) =>
          (use.purpose === "bribe-offer" || use.set === "bribe") &&
          use.step === "state",
      ),
    );
    expect(
      new Set(states.map((part) => part.bearing)).size,
    ).toBeGreaterThanOrEqual(3);
  });

  it("never reads a rounded price back as exact, and refuses a thank-you only where the offer called itself one", () => {
    // The lead's stop lines (Nov 12): "Is yours more than about $4,400?" and
    // "A thank-you doesn't weigh that much." after an offer that never said
    // thanks.
    const talk = compose({
      ...cast,
      "favor-vote": fact("vote"),
      bill: fact("the free-fares ordinance"),
    });
    const lines: { text: string; move: string; parts: string[] }[] = [];
    const walk = (node: (typeof talk)["tree"]) => {
      for (const line of node.lines) lines.push(line);
      for (const reply of node.replies) {
        lines.push(reply.line);
        if (reply.next) walk(reply.next);
      }
    };
    walk(talk.tree);
    for (const line of lines)
      for (const question of line.text.match(/[^.?!]*\?/g) ?? [])
        expect(question, line.text).not.toMatch(/\babout \$/);
    const offer = talk.state;
    const thanked = /\bthank/i.test(offer.text);
    for (const reply of talk.tree.replies)
      if (/A thank-you/.test(reply.line.text))
        expect(thanked, `${offer.text} / ${reply.line.text}`).toBe(true);
  });

  it("weighs a read by its strength: a friend with almost no strain does not open with the desperate line", () => {
    // Primrose, Alaska (0264240), seed 48e269d37a71efa5:0, the friend row:
    // reads tie 0.84, strain about 0 (shown as 0), need 0.28; it opened "I'm
    // not in a spot to take no for an answer." A read weighs the lines that
    // speak from it (scene-talk-words useFit); nothing switches one on.
    const strainOpeners =
      /I'll be honest, I need this one|I'm not in a spot to take no/;
    const read = (weight: number): Fact => ({
      text: "yes",
      sourceRecordIds: ["bribe:primrose"],
      weight,
    });
    const friend = {
      ...type,
      purpose: "bribe-offer.friend",
      family: "bribe-offer",
    };
    const base = {
      ...cast,
      amount: fact("about $1,500"),
      "favor-contract": fact("contract"),
    };
    const said = (facts: Record<string, Fact>, causeId: string) => {
      const result = composeSceneTalk(
        core,
        director,
        { askerId, askedId, causeId },
        friend,
        facts,
      );
      expect(result.kind).toBe("composed");
      return result.kind === "composed" ? result.talk.state.text : "";
    };
    const faint: string[] = [];
    const strong: string[] = [];
    for (let n = 0; n < 12; n += 1) {
      faint.push(
        said(
          {
            ...base,
            "read-tie": read(0.84),
            "read-strain": read(0.004),
            "read-need": read(0.28),
          },
          `primrose-${n}`,
        ),
      );
      strong.push(said({ ...base, "read-strain": read(0.8) }, `strained-${n}`));
    }
    for (const text of faint) expect(text).not.toMatch(strainOpeners);
    expect(strong.some((text) => strainOpeners.test(text))).toBe(true);
  });
});
