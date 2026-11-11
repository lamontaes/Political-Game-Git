/**
 * A drawn world with a director, and the facts a scene with a purpose is
 * staged from: the fixture the scene-talk tests share.
 */
import { ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { enrichCivicInputs } from "../../src/core2/civic-inputs";
import { initialFocusPeople } from "../../src/core2/focus";
import { advanceCore, createLifeCore } from "../../src/core2/life";
import { buildPopulation } from "../../src/core2/population";
import { createDirector } from "../../src/director/ledger";
import {
  composeSceneTalk,
  type PurposeType,
  type SceneTalk,
  type SceneTalkLine,
  type SceneTalkOptions,
  type TreeNode,
} from "../../src/director/scene-talk";
import { variantFamilies } from "../../src/director/arc-variant";

import type { Fact } from "../../src/english/scene-talk-words";
import situationFile from "../../src/director/data/situation-types.json" with { type: "json" };

// Scenes with a purpose: a setup, a person with a
// purpose, stakes, and an exchange that plays to resolved or refused, worded
// only from data/english/parts/scene-talk.json.
export const seed = process.env.GOLDEN_PATH_SEED ?? "scene-talk-test";
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
export const adults = base.people.filter(
  (person) => person.tier !== "husk" && age(person.birthDate) >= 25,
);
export const player = adults[0]!;
const input = { ...base, playerId: player.id };
export const director = createDirector({
  watch: [...initialFocusPeople(input)],
});
export const core = createLifeCore(input, { modules: [director.module] });
director.start(core);
advanceCore(core, "2021-01-03");
export const askerId = adults[1]!.id;
export const askedId = player.id;

export const fact = (text: string): Fact => ({
  text,
  sourceRecordIds: [askerId],
});
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
  // The clerk's petition lines are worded for a first filing or a repeat one.
  "first-filing",
];
export const facts: Record<string, Fact> = {
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
  "donor-first": fact("Pat"),
  "asker-first": fact("Lee"),
  position: fact("a cashier"),
  pay: fact("$15.00"),
  when: fact("this morning"),
  "stake-money": fact("money"),
  cushion: fact("two months"),
  remaining: fact("nine months"),
  "stake-time": fact("time"),
  child: fact("Jordan"),
  "stake-worked": fact("worked"),
  margin: fact("about 60 votes"),
  signatures: fact("1,250"),
  due: fact("March 5"),
};
// The engine is tested the way the grading page composes, with every part in,
// even the ones the owner rejected; "plays every purpose in play" checks play.
export const HELD = { includeHeld: true } as const;
export const types = (
  situationFile as unknown as { types: PurposeType[] }
).types.filter((row) => row.purpose);

// ---------------------------------------------------------------------------
// Building many scenes and reading the pairs they produced (the reply tests).
// ---------------------------------------------------------------------------

/** The scene types to build: every purpose type, and a type for each variant of a family. */
export function talkTypes(): PurposeType[] {
  const families = variantFamilies();
  return types.flatMap((type) => [
    type,
    ...Object.entries(families)
      .filter(([, family]) => family === type.purpose)
      .map(([variant, family]) => ({ ...type, purpose: variant, family })),
  ]);
}

/**
 * Builds a scene talk of every type, in play (the pieces play may say), and
 * once more where the player asks, from different askers. Skipped ones are
 * left out: a scene the bank cannot word never plays.
 */
export function buildTalks(
  options: SceneTalkOptions = {},
  limit = Infinity,
): SceneTalk[] {
  const talks: SceneTalk[] = [];
  const askers = adults.slice(1, 4).map((row) => row.id);
  for (const type of talkTypes())
    for (const [index, asker] of askers.entries()) {
      // The first asker for every type; the others only for the first dozen, for variety.
      if (talks.length >= limit) return talks;
      if (index > 0 && talks.length > 150) break;
      const result = composeSceneTalk(
        core,
        director,
        { askerId: asker, askedId },
        type,
        facts,
        index === 2 ? { standing: { lean: -0.2, favor: 0.3 } } : {},
        options,
      );
      if (result.kind === "composed") talks.push(result.talk);
    }
  return talks.slice(0, limit);
}

/** A pair the director produced: the piece said, and the piece it answered. */
export interface ObservedPair {
  readonly before: string;
  readonly reply: string;
  readonly step: string;
  readonly move: string;
  readonly scene: string;
  /** What the picker was asked, to ask it again. */
  readonly ask: {
    readonly purpose: string;
    readonly family?: string;
    readonly key: string;
    readonly afterMove: string;
    readonly tagged: boolean;
  };
}

/**
 * Every (line answered, line said) pair in a talk's whole tree where the
 * director named the line answered (a line it worded with `after` set).
 * The line answered is the previous spoken line, except that a "continue" is
 * said in answer to the reply, not to the asker's answer in between.
 */
export function observedPairs(talk: SceneTalk): ObservedPair[] {
  const out: ObservedPair[] = [];
  const scene = `${talk.purpose}/${talk.typeKey}`;
  const note = (before: SceneTalkLine | undefined, line: SceneTalkLine) => {
    if (!line.after || !before) return;
    if (before.move !== line.after)
      throw new Error(
        `${scene}: ${line.parts[0]} answers a ${line.after} but the line before is a ${before.move}`,
      );
    out.push({
      before: before.parts[0]!,
      reply: line.parts[0]!,
      step: line.step,
      move: line.move,
      scene,
      ask: {
        purpose: line.purpose,
        ...(line.family ? { family: line.family } : {}),
        key: line.key,
        afterMove: line.after,
        tagged: !!line.tag,
      },
    });
  };
  const spoken = (line: SceneTalkLine | undefined) =>
    !!line && line.role !== "narrator";
  const walkLines = (parent: SceneTalkLine, lines: SceneTalkLine[]) => {
    let previous: SceneTalkLine = parent;
    for (const line of lines) {
      if (line.role === "narrator") continue;
      // A "continue" answers the reply, not the asker's answer in between.
      const goesOn =
        line.step === "continue" ||
        line.step === "state" ||
        (previous !== parent && previous.move !== line.after);
      note(goesOn ? parent : previous, line);
      previous = line;
    }
  };
  /** The line the replies at a node answer: the asker's last line, else what came before. */
  const answered = (parent: SceneTalkLine, node: TreeNode) =>
    [...node.lines].reverse().find((line) => line.role === "asker") ?? parent;
  const walk = (parent: SceneTalkLine, node: TreeNode) => {
    walkLines(parent, node.lines);
    const last = answered(parent, node);
    if (node.end?.close) note(parent, node.end.close);
    for (const reply of node.replies) {
      note(last, reply.line);
      if (reply.next) walk(reply.line, reply.next);
    }
    for (const branch of node.branches ?? []) walk(parent, branch.node);
  };
  const { open } = talk;
  if (open && talk.intro[0]) note(open, talk.intro[0]);
  if (talk.intro[0] && talk.intro[1]) note(talk.intro[0], talk.intro[1]);
  if (spoken(talk.state)) walk(talk.state, talk.tree);
  return out;
}
