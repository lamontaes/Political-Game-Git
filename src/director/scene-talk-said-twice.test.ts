/**
 * A talk says a fact at most twice (the Story lead's brief to writers, from
 * the owner's padded-name rule of Nov 14: a full name at most twice a talk).
 * The most specific wording wins a spot, so once a fact such as how long two
 * people were together is on the record, every line with a wording for it
 * said it: a played breakup said "About fifty years" in the statement, all
 * four replies and two answers. The composer counts what the talk has said
 * and, on each screen, the replies already offered there.
 *
 * The cut removed the breakup and layoff lines from this branch, so the test
 * composes them from the Story branch's pieces, copied verbatim into a test
 * fixture and added to the bank for this file only.
 */
import { describe, expect, it, vi } from "vitest";

import sceneTalkBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import {
  composeSceneTalk,
  type SceneTalk,
  type SceneTalkLine,
  type TreeNode,
} from "./scene-talk";
import {
  askedId,
  askerId,
  core,
  director,
  fact,
  facts,
  HELD,
  types,
} from "../../tests/support/scene-talk-fixture";
import { useFit, type BankPart, type Fact } from "../english/scene-talk-words";

vi.mock("../../data/english/parts/scene-talk.json", async (original) => {
  const bank = (await original()) as {
    default: { parts: unknown[] } & Record<string, unknown>;
  };
  const extra =
    (await import("../../tests/support/scene-talk-said-twice-parts.json")) as unknown as {
      default: { parts: unknown[] };
    };
  return {
    default: {
      ...bank.default,
      parts: [...bank.default.parts, ...extra.default.parts],
    },
  };
});

const BANK = (sceneTalkBank as unknown as { parts: BankPart[] }).parts;
const TEXT = new Map(BANK.map((part) => [part.key, part.text]));

/** The fact texts a line's pieces put in its slots, lowercased (a line says each once). */
function textsSaid(
  line: SceneTalkLine,
  given: Readonly<Record<string, Fact>>,
): Set<string> {
  const out = new Set<string>();
  for (const key of line.parts)
    for (const [, slot] of (TEXT.get(key) ?? "").matchAll(/\{([\w-]+)\}/g)) {
      const text = given[slot!]?.text;
      if (text && line.text.toLowerCase().includes(text.toLowerCase()))
        out.add(text.toLowerCase());
    }
  return out;
}

interface Screen {
  /** The lines said on the way to the screen and on it, then the replies it offers. */
  lines: SceneTalkLine[];
  /** Every piece said or offered on the path before this screen. */
  before: Set<string>;
}

/**
 * Every screen of the talk's tree: the lines said on the way to it and on
 * it, then the replies it offers. A screen's text is what the player has read
 * when they choose.
 */
function screens(talk: SceneTalk): Screen[] {
  const out: Screen[] = [];
  const walk = (node: TreeNode, before: SceneTalkLine[], offered: string[]) => {
    const said = [
      ...before,
      ...node.lines,
      ...(node.end?.close ? [node.end.close] : []),
    ];
    const replies = node.replies.map((reply) => reply.line);
    out.push({
      lines: [...said, ...replies],
      before: new Set([...offered, ...said.flatMap((line) => line.parts)]),
    });
    const now = [...offered, ...replies.flatMap((line) => line.parts)];
    for (const reply of node.replies)
      if (reply.next) walk(reply.next, [...said, reply.line], now);
    for (const branch of node.branches ?? []) walk(branch.node, said, offered);
  };
  walk(
    talk.tree,
    [
      ...talk.narration,
      ...(talk.open ? [talk.open] : []),
      ...talk.intro,
      talk.state,
    ],
    [],
  );
  return out;
}

/** A line that says a fact's text a third time or more on a screen, and the lines before it. */
interface Thrice {
  text: string;
  line: SceneTalkLine;
  earlier: SceneTalkLine[];
  before: Set<string>;
}

function saidThrice(
  talk: SceneTalk,
  given: Readonly<Record<string, Fact>>,
): Thrice[] {
  const found: Thrice[] = [];
  for (const screen of screens(talk))
    screen.lines.forEach((line, at) => {
      const earlier = screen.lines.slice(0, at);
      for (const text of textsSaid(line, given)) {
        const times = earlier.filter((row) => textsSaid(row, given).has(text));
        if (times.length >= 2)
          found.push({ text, line, earlier, before: screen.before });
      }
    });
  return found;
}

/** Each third mention, with the lines that said the fact before it. */
function show(rows: Thrice[], given: Readonly<Record<string, Fact>>): string[] {
  const said = (line: SceneTalkLine, text: string) =>
    textsSaid(line, given).has(text);
  return [
    ...new Set(
      rows.map(
        (row) =>
          `"${row.text}" a third time: ${[
            ...row.earlier.filter((line) => said(line, row.text)),
            row.line,
          ]
            .map((line) => line.text)
            .join(" / ")}`,
      ),
    ),
  ];
}

/**
 * Whether a wording that fits the line's spot was left that would not have
 * said a fact a third time, and was not said or offered on the path already:
 * a third mention the composer could have spared.
 */
function avoidable(
  row: Thrice,
  given: Readonly<Record<string, Fact>>,
): boolean {
  const counts = new Map<string, number>();
  for (const line of row.earlier)
    for (const text of textsSaid(line, given))
      counts.set(text, (counts.get(text) ?? 0) + 1);
  const spot = {
    step: row.line.step,
    move: row.line.move,
    role: row.line.role,
    purpose: row.line.purpose,
    key: row.line.key,
    ...(row.line.after ? { after: row.line.after } : {}),
    ...(row.line.outcome ? { outcome: row.line.outcome } : {}),
  };
  return BANK.some(
    (part) =>
      !part.piece &&
      !row.before.has(part.key) &&
      part.uses.some((u) => useFit(u, spot, [spot.step], given) >= 0) &&
      [...part.text.matchAll(/\{([\w-]+)\}/g)].every(([, slot]) => {
        const text = given[slot!]?.text?.toLowerCase();
        return !text || (counts.get(text) ?? 0) < 2;
      }),
  );
}

function compose(
  key: string,
  given: Readonly<Record<string, Fact>>,
): SceneTalk {
  const type = types.find((row) => row.key === key)!;
  const result = composeSceneTalk(
    core,
    director,
    { askerId, askedId },
    type,
    given,
    {},
    HELD,
  );
  if (result.kind !== "composed") throw new Error(result.reason);
  return result.talk;
}

describe("a scene talk says a fact at most twice", () => {
  it("a breakup says how long they were together in no more than two lines a screen", () => {
    const given = { ...facts, together: fact("about fifty years") };
    delete (given as Record<string, Fact>).child;
    const talk = compose("breakup", given);
    // The fact is said: the rule spares it, it does not silence it.
    expect(
      screens(talk).some((screen) =>
        screen.lines.some((line) =>
          textsSaid(line, given).has("about fifty years"),
        ),
      ),
    ).toBe(true);
    const thrice = saidThrice(talk, given);
    expect(show(thrice, given)).toEqual([]);
  });

  it("a layoff says the workplace a third time only where no wording that fits avoids it", () => {
    const given = { ...facts, workplace: fact("the restaurant") };
    const talk = compose("layoff", given);
    const thrice = saidThrice(talk, given).filter((row) =>
      avoidable(row, given),
    );
    expect(show(thrice, given)).toEqual([]);
  });
});
