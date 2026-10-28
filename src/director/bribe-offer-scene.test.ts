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
// an event, so the type waits on its producer (pool item
// corruption-bribe-offer-reaches-player-seat); what this proves is that the
// scene words itself from the offer's own facts once the record exists.
const type = (situationFile as unknown as { types: PurposeType[] }).types.find(
  (row) => row.key === "bribe-offer",
)!;
const fact = (text: string): Fact => ({ text, sourceRecordIds: [askerId] });
const cast = {
  name: fact("Pat Rivera"),
  first: fact(core.people.get(askedId)!.givenName),
  place: fact("the town"),
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
  it("waits on the engine's offer record and fires from nothing else", () => {
    expect(type.causes).toHaveLength(1);
    expect(type.causes[0]).toMatchObject({
      awaitingProducer: "bribe-offer",
      causeRecord: "corruption.bribe-offered",
    });
    expect(type.causes[0]!).not.toHaveProperty("match");
  });

  it("says the favor the offer record names, and only that favor", () => {
    const vote = statement({
      ...cast,
      "favor-vote": fact("vote"),
      bill: fact("H.R. 12"),
    });
    const contract = statement({ ...cast, "favor-contract": fact("contract") });
    expect(vote).toMatch(/vote|H\.R\. 12/);
    expect(contract).toMatch(/bid|contract/);
    expect(contract).not.toMatch(/vote/);
    expect(vote).not.toMatch(/contract|bid/);
  });

  it("offers five replies that are five stances, never three words for one answer", () => {
    const talk = compose({ ...cast, "favor-contract": fact("contract") });
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
      bill: fact("H.R. 12"),
    });
    for (const line of talk.lines) expect(line.text).not.toMatch(/[{}]/);
    const bank = JSON.parse(
      readFileSync("data/english/parts/scene-talk.json", "utf8"),
    ) as {
      parts: { bearing?: string; uses: { purpose: string; step: string }[] }[];
    };
    const states = bank.parts.filter((part) =>
      part.uses.some(
        (use) => use.purpose === "bribe-offer" && use.step === "state",
      ),
    );
    expect(
      new Set(states.map((part) => part.bearing)).size,
    ).toBeGreaterThanOrEqual(3);
  });
});
