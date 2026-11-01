import RULES_BOUND from "./data/scene-talk-rules.json" with { type: "json" };
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
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { heldByGrades } from "../english/english-grades";
import { traitLean } from "../core2/choice";
import { decisionKinds } from "../core2/trait-decisions";

// Scenes with a purpose: a setup, a person with a
// purpose, stakes, and an exchange that plays to resolved or refused, worded
// only from data/english/parts/scene-talk.json.
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
  "for",
  "winner-is-other",
];
const facts: Record<string, Fact> = {
  name: fact("Pat Rivera"),
  first: fact(core.people.get(askedId)!.givenName),
  bill: fact('"Limit groundwater withdrawal"'),
  section: fact("2"),
  chair: fact("Lee Ortiz"),
  office: fact("county commissioner"),
  place: fact("the town"),
  money: fact("$500"),
  outlet: fact("the Courier"),
  story: fact("the groundwater vote"),
  opponent: fact("Dana Lee"),
  winner: fact("Dana Lee"),
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
  ayes: fact("5"),
  nays: fact("2"),
  roll: fact("yes"),
  deadline: fact("January 30"),
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
  position: fact("a cashier"),
  pay: fact("$15.00"),
  when: fact("this morning"),
  "stake-money": fact("money"),
  cushion: fact("two months"),
  remaining: fact("nine months"),
  "stake-time": fact("time"),
  child: fact("Jordan"),
};
// The engine is tested the way the grading page composes, with every part in,
// even the ones the owner rejected; "plays every purpose in play" checks play.
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
      // The facts hold no same-day: a scene that plays after its record's day
      // still narrates, and names no day.
      for (const line of talk.narration)
        expect(line.text, type.key).not.toMatch(
          /\b(?:today|tonight|yesterday|this (?:morning|afternoon|evening))\b/i,
        );
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
      // Where the bank holds no close for that ending, the asker does not ask
      // a question nothing can close: the scene ends on the answer before
      // it, and the page lists the missing close. A closing beat (the
      // narrator) may follow the close; nobody's last line is a question.
      const final = talk.lines.at(-1)!;
      const spoken = talk.lines.filter((l) => l.role !== "narrator").at(-1)!;
      const where = `${type.key}: ${JSON.stringify(talk.lines.slice(-3).map((l) => [l.role, l.move, l.text]))}`;
      expect(/\?$/.test(final.text.trim()), where).toBe(false);
      expect(/\?$/.test(spoken.text.trim()), where).toBe(false);
      // The player's character may end the talk by walking away; the close
      // after it can be the narrator's, so their leaving is the last spoken line.
      if (spoken.role !== "asker" && spoken.move !== "leave")
        expect(
          talk.gaps.some((row) => row.includes("question left unasked")),
          where,
        ).toBe(true);
    }
  });

  // The player asks a colleague for their vote the evening before the roll
  // (vote-sought): the narrator sets it from the player's side, never as the
  // colleague coming to the player's door, and a player asking several
  // colleagues meets more than one setup.
  it("sets the player's ask for a vote from the player's side, in more than one way", () => {
    const type = types.find((row) => row.key === "vote-sought")!;
    const own = new Set(
      (
        sceneBank as unknown as {
          parts: { key: string; uses?: { step?: string; key?: string }[] }[];
        }
      ).parts
        .filter((part) =>
          part.uses?.some(
            (use) => use.step === "narrate" && use.key === "vote-sought",
          ),
        )
        .map((part) => part.key),
    );
    expect(own.size).toBeGreaterThanOrEqual(3);
    const setups = new Set<string>();
    for (const colleague of adults.slice(1, 13)) {
      const result = composeSceneTalk(
        core,
        director,
        { askerId: colleague.id, askedId },
        type,
        // The sponsor's count is the evening before the vote.
        { ...facts, "vote-tomorrow": fact("yes") },
        { standing: { lean: -0.2, favor: 0.3 } },
        HELD,
      );
      expect(result.kind, colleague.id).toBe("composed");
      if (result.kind !== "composed") continue;
      const setup = result.talk.narration[0]!;
      expect(setup.role).toBe("narrator");
      expect([...own], setup.text).toContain(setup.parts[0]);
      expect(setup.text).not.toMatch(/[{}]/);
      setups.add(setup.parts[0]!);
    }
    expect(setups.size).toBeGreaterThan(1);
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
  it("plays every purpose in play, and never says a line the owner rejected", () => {
    // Every piece of dialogue is in the game; the grades take out the lines
    // the owner rejects.
    for (const type of types) {
      const result = composeSceneTalk(
        core,
        director,
        { askerId, askedId },
        type,
        facts,
      );
      expect(result.kind, type.key).toBe("composed");
      if (result.kind !== "composed") continue;
      for (const line of result.talk.lines)
        for (const part of line.parts)
          expect(heldByGrades(part), `${type.key}: ${part}`).toBe(false);
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
      expect(talk.depth).toBeGreaterThanOrEqual(2);
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
  it("keeps a colleague's \"I'll look at it\" as a vague promise and a traded vote as a firm one", () => {
    // Governing phase B reads a promise's firmness from the scene's reply
    // record. When the player asks for a vote, a colleague a favor would
    // carry answers "not yet" (the arc's asks, carried: stall): a promise,
    // but a vague one.
    const type = types.find((row) => row.key === "vote-sought")!;
    const endings = new Map<string, { keeps: string; firmness?: string }>();
    for (const colleague of adults.slice(1, 13)) {
      const result = composeSceneTalk(
        core,
        director,
        { askerId: colleague.id, askedId },
        type,
        facts,
        { standing: { lean: -0.2, favor: 0.3 } },
        HELD,
      );
      if (result.kind !== "composed") continue;
      const walk = (node: typeof result.talk.tree) => {
        if (node.end?.ending) endings.set(node.end.ending.id, node.end.ending);
        for (const reply of node.replies) if (reply.next) walk(reply.next);
        for (const branch of node.branches ?? []) walk(branch.node);
      };
      walk(result.talk.tree);
    }
    expect([...endings.keys()]).toContain("will-look");
    expect(endings.get("will-look")).toMatchObject({
      keeps: "promise",
      firmness: "vague",
    });
    for (const id of ["traded", "false-yes"])
      if (endings.has(id)) expect(endings.get(id)!.firmness, id).toBe("firm");
  });
  it("answers by the same lean every decision reads: two of the town's people with opposite leans answer the same reply each by their own", () => {
    // The asker's answer reads each move's act kinds in the shared decision
    // table (`scene-talk.move`), as every other decision does, never a pull
    // sum of its own. Two adults of this town, with their own traits, ask the
    // player the same thing. The answers written for a reply line are the same
    // whoever answers it, so where the player gives both the same first-round
    // line and their answers part, each took the move their own traits lean
    // toward more. Later rounds are not compared: the two talks reach them by
    // different words, and each line has its own answers written for it.
    const lean = (id: string, move: string) =>
      traitLean(
        core,
        core.people.get(id)!,
        decisionKinds("scene-talk.move", move),
      );
    const tilt = (id: string) => lean(id, "press") - lean(id, "accept");
    const pool = adults.slice(1, 120).map((person) => person.id);
    const [pushy] = [...pool].sort((a, b) => tilt(b) - tilt(a));
    const [yielding] = [...pool].sort((a, b) => tilt(a) - tilt(b));
    expect(tilt(pushy!)).toBeGreaterThan(tilt(yielding!));
    let parted = 0;
    for (const type of types) {
      const treeOf = (id: string) => {
        const result = composeSceneTalk(
          core,
          director,
          { askerId: id, askedId },
          type,
          facts,
          {},
          HELD,
        );
        return result.kind === "composed" ? result.talk.tree : undefined;
      };
      const first = treeOf(pushy!);
      const second = treeOf(yielding!);
      if (!first || !second) continue;
      // The same lines before the first replies (an unprompted line and its
      // answer), so neither asker has said a piece the other could still say.
      const before = (node: NonNullable<typeof first>) =>
        node.lines.map((line) => line.parts[0]).join("|");
      if (before(first) !== before(second)) continue;
      const answerTo = (node: NonNullable<typeof first>, piece?: string) =>
        node.replies.find((reply) => reply.line.parts[0] === piece)?.next
          ?.lines[0];
      for (const reply of first.replies) {
        const a = answerTo(first, reply.line.parts[0]);
        const b = answerTo(second, reply.line.parts[0]);
        if (!a || !b || a.move === b.move) continue;
        if (a.step !== "follow" || b.step !== "follow") continue;
        parted += 1;
        const said = `${type.key} after "${reply.line.text}"`;
        expect(lean(pushy!, a.move), said).toBeGreaterThanOrEqual(
          lean(pushy!, b.move),
        );
        expect(lean(yielding!, b.move), said).toBeGreaterThanOrEqual(
          lean(yielding!, a.move),
        );
      }
    }
    expect(parted).toBeGreaterThan(0);
  });
});
