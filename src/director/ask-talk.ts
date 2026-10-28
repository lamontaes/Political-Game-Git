/**
 * A scene in which the player does the asking (owner, Oct 14: convince one
 * member to switch). The evening before a floor vote on the player's bill,
 * the legislature's count names the colleagues it needs (`vote-ahead`); the
 * player asks one of them for their vote.
 *
 * The words are the vote ask's own (purpose `ask-vote`), with the speakers
 * turned around: the player says the asker's lines (the request, a plea, a
 * trade, pressing for an answer, letting it go), and the colleague the asked
 * member's (a yes, not yet, a no). The tree is shaped as every scene with a
 * purpose is, the player's lines the choices, so the story screen plays it
 * unchanged.
 *
 * Each purpose the player can ask in is a row of `ASKS`: the words the one
 * asked answers in and the asks the player may try again with. A door on
 * the player's own canvass is the same exchange on the support ask's bank
 * (purpose `ask-support`): the player asks a resident for their vote, and
 * the resident answers from where the knock left them (the campaign
 * engine's warmth toward the player).
 *
 * The colleague answers from where they stand, never by a roll: their own
 * position on the bill, and what a yes given as a favor to the player is
 * worth to them (the weight the roll call reads, `favorWorth`). Asked plainly,
 * they say yes only if they already lean for it; not there yet if a favor
 * would carry them; no otherwise. Asked again with a plea or a trade, the
 * favor carries them where it would at the roll; pressed, they hold where
 * they stood.
 */
import { P } from "../core2/parameters";
import type { CoreState, PersonId } from "../core2/types";
import arcsFile from "./data/purpose-arcs.json" with { type: "json" };
import {
  wordSceneMove,
  type Fact,
  type SceneMove,
} from "../english/scene-talk-words";
import type {
  Outcome,
  PurposeType,
  SceneTalk,
  SceneTalkCast,
  SceneTalkLine,
  SceneTalkOptions,
  SceneTalkResult,
  TreeNode,
} from "./scene-talk";

const zero = P.zero;
const one = P.one;
const two = P.two;

/** Where the colleague stands before they answer. */
export interface AskStanding {
  /** Their position on the bill today: above zero for it. */
  lean: number;
  /** What a yes given as a favor to the player adds at the roll. */
  favor: number;
}

interface Ending {
  id: string;
  label: string;
  keeps: string;
  opens?: string;
}

/** How one purpose's ask is answered, and how the player may ask again. */
interface AskRow {
  /** The answer of one already for it, of one a favor would carry, of one against. */
  yes: string;
  carried: string;
  no: string;
  /** The answers to a second ask that carries them, best first. */
  relent: readonly string[];
  /** The player's second ask after a "not yet" or a no, and what it weighs. */
  again: readonly { move: string; carries: "favor" | "lean" }[];
  /** The ending a path reaches, by the last answer. */
  endingOf: (answer: string | undefined) => string;
  /** Which endings resolve the ask and which refuse it. */
  resolved: string;
  refused: string;
}

const ASKS: Readonly<Record<string, AskRow>> = {
  "ask-vote": {
    yes: "agree",
    carried: "stall",
    no: "refuse",
    relent: ["relent", "agree"],
    again: [
      { move: "plea", carries: "favor" },
      { move: "bargain", carries: "favor" },
      { move: "press", carries: "lean" },
    ],
    endingOf: (answer) =>
      answer === "agree" || answer === "relent"
        ? "vote-given"
        : answer === "refuse"
          ? "refused"
          : answer === "stall"
            ? "undecided"
            : "left-there",
    resolved: "vote-given",
    refused: "refused",
  },
  "ask-support": {
    yes: "agree",
    carried: "deflect",
    no: "decline",
    relent: ["agree"],
    again: [{ move: "press", carries: "lean" }],
    endingOf: (answer) =>
      answer === "agree"
        ? "pledged"
        : answer === "decline"
          ? "not-yet"
          : answer === "deflect"
            ? "dodged"
            : "left-there",
    resolved: "pledged",
    refused: "not-yet",
  },
};

const ENDINGS = new Map(
  Object.keys(ASKS).map((purpose) => [
    purpose,
    new Map(
      (
        (
          arcsFile as unknown as {
            purposes: Record<string, { endings?: readonly Ending[] }>;
          }
        ).purposes[purpose]?.endings ?? []
      ).map((row) => [row.id, row]),
    ),
  ]),
);

/** The ending a path reaches, by the last answer of the one asked. */
function endingFor(
  purpose: string,
  answer: string | undefined,
): {
  outcome: Outcome;
  ending?: Ending;
} {
  const row = ASKS[purpose]!;
  const id = row.endingOf(answer);
  const outcome: Outcome =
    id === row.resolved ? "resolved" : id === row.refused ? "refused" : "open";
  const ending = ENDINGS.get(purpose)?.get(id);
  return ending ? { outcome, ending } : { outcome };
}

/**
 * The exchange where the player asks: `cast.askedId` is the player (whose
 * lines are the choices), `cast.askerId` the colleague asked.
 */
export function composeAskTalk(
  core: Readonly<CoreState>,
  cast: SceneTalkCast,
  type: PurposeType,
  facts: Readonly<Record<string, Fact>>,
  standing: AskStanding,
  options: SceneTalkOptions = {},
): SceneTalkResult {
  const purpose = type.purpose ?? "ask-vote";
  const key = type.tag?.key ?? type.key;
  const row = ASKS[purpose];
  if (!row)
    return { kind: "skipped", reason: `the player does not ask in ${purpose}` };
  const player = core.people.get(cast.askedId);
  const colleague = core.people.get(cast.askerId);
  if (!player || !colleague)
    return {
      kind: "skipped",
      reason: "the asker or the asked is not a person",
    };
  const scene = `${type.key}:${cast.askedId}:${cast.askerId}`;
  const gaps = new Set<string>();
  const gap = (step: string, move: string, after?: string) =>
    gaps.add(`${type.key}/${step}/${move}${after ? ` after ${after}` : ""}`);
  let n = zero;
  /**
   * One line: the bank's piece for the role it was written for (the asker's
   * lines are the player's here), shown in the seat it is said from.
   */
  const say = (
    use: Omit<SceneMove, "purpose" | "key">,
    speakerId: PersonId,
    moment: string,
    said: ReadonlySet<string>,
  ): SceneTalkLine | null => {
    const speaker = speakerId === cast.askedId ? player : colleague;
    const worded = wordSceneMove({
      move: { ...use, purpose, key },
      facts,
      seed: core.seed,
      speakerId,
      traits: speaker.traits,
      momentKey: `${scene}:${moment}`,
      said,
      options,
    });
    if (!worded || "unused" in worded) return null;
    n += one;
    return {
      n,
      step: worded.step,
      role: speakerId === cast.askedId ? "asked" : "asker",
      speakerId,
      speaker: `${speaker.givenName} ${speaker.familyName}`,
      text: worded.text,
      move: use.move,
      register: "scene-talk",
      ...(worded.bearing ? { bearing: worded.bearing } : {}),
      key,
      purpose,
      round: zero,
      ...(use.after ? { after: use.after } : {}),
      parts: [worded.pieceKey],
      slotRecordIds: [...worded.slotRecordIds],
      asks: worded.asks,
      invites: worded.invites,
    };
  };
  const plus = (said: ReadonlySet<string>, line: SceneTalkLine) =>
    new Set([...said, ...line.parts]);
  // The colleague's answer of the first of `moves` the bank can word.
  const answer = (
    moves: readonly string[],
    after: string,
    moment: string,
    said: ReadonlySet<string>,
  ) => {
    for (const move of moves) {
      const line = say(
        { step: "reply", move, role: "asked", after },
        cast.askerId,
        `${moment}:${move}`,
        said,
      );
      if (line) return line;
    }
    gap("reply", moves.join("/"), after);
    return null;
  };

  // The narrator sets the scene, where the purpose has words for it.
  const narrate = say(
    { step: "narrate", move: "narrate", role: "narrator" },
    cast.askerId,
    "narrate",
    new Set(),
  );
  if (narrate) narrate.role = "narrator";
  // The ask: the player's request, said as the scene opens.
  const state = say(
    { step: "state", move: "request", role: "asker" },
    cast.askedId,
    "state",
    new Set(),
  );
  if (!state)
    return {
      kind: "skipped",
      reason: `the request that opens ${type.key} cannot be worded from the records given`,
    };
  state.auto = true;
  let said = plus(narrate ? plus(new Set(), narrate) : new Set(), state);
  const carried = standing.lean + standing.favor > zero;
  // Where they stand before any favor: for it, carried by one, or against.
  const first = answer(
    standing.lean > zero ? [row.yes] : carried ? [row.carried] : [row.no],
    "request",
    "first",
    said,
  );
  if (!first)
    return {
      kind: "skipped",
      reason: `the colleague's answer to ${type.key} cannot be worded from the records given`,
    };
  first.round = one;
  said = plus(said, first);
  const tree: TreeNode = { lines: [first], replies: [] };
  let nodes = one;
  const endingCounts: Record<string, number> = {};
  const endings = new Set<Outcome>();
  const close = (node: TreeNode, last: string | undefined) => {
    const end = endingFor(purpose, last);
    node.end = end;
    endings.add(end.outcome);
    if (end.ending)
      endingCounts[end.ending.id] = (endingCounts[end.ending.id] ?? zero) + one;
  };
  if (first.move === row.yes) {
    // A yes: the player thanks them, and the vote is given.
    const thanks = say(
      { step: "follow", move: "thank", role: "asker", after: row.yes },
      cast.askedId,
      "thank",
      said,
    );
    if (thanks) {
      thanks.round = two;
      const next: TreeNode = { lines: [], replies: [] };
      nodes += one;
      tree.replies.push({ line: thanks, next });
      close(next, row.yes);
    } else {
      gap("follow", "thank", row.yes);
      close(tree, row.yes);
    }
  } else {
    // Not yet, or no: the player asks again, or lets it go.
    for (const again of [...row.again, { move: "accept", carries: "none" }]) {
      const line = say(
        { step: "follow", move: again.move, role: "asker", after: first.move },
        cast.askedId,
        `again:${again.move}`,
        said,
      );
      if (!line) {
        gap("follow", again.move, first.move);
        continue;
      }
      line.round = two;
      const next: TreeNode = { lines: [], replies: [] };
      nodes += one;
      tree.replies.push({ line, next });
      if (again.carries === "none") {
        close(next, first.move === row.no ? row.no : undefined);
        continue;
      }
      const yes = again.carries === "favor" ? carried : standing.lean > zero;
      const last = answer(
        yes ? row.relent : [row.no],
        again.move,
        `last:${again.move}`,
        plus(said, line),
      );
      if (last) {
        last.round = two;
        next.lines.push(last);
      }
      close(next, last?.move ?? first.move);
    }
    if (tree.replies.length < two)
      return {
        kind: "skipped",
        reason: `fewer than two asks after ${first.move} can be worded for ${type.key}`,
      };
  }
  // The flat view: the first choice on each node, as the grading bench reads it.
  const lines: SceneTalkLine[] = [state, first];
  const rounds = tree.replies.length
    ? [
        {
          round: one,
          replies: tree.replies.map((row) => row.line),
          chosen: tree.replies[zero]!.line,
          ...(tree.replies[zero]!.next?.lines[zero]
            ? { answer: tree.replies[zero]!.next!.lines[zero]! }
            : {}),
        },
      ]
    : [];
  if (rounds[zero]) {
    lines.push(rounds[zero].chosen);
    if (rounds[zero].answer) lines.push(rounds[zero].answer);
  }
  const outcome =
    (tree.replies[zero]?.next ?? tree).end?.outcome ?? ("open" as Outcome);
  const talk: SceneTalk = {
    typeKey: type.key,
    purpose,
    askerId: cast.askerId,
    askedId: cast.askedId,
    narration: narrate ? [narrate] : [],
    intro: [],
    state,
    tree,
    rounds,
    outcome,
    lines,
    nodes,
    endings: [...endings].sort(),
    depth: tree.replies.length ? one : zero,
    gaps: [...gaps].sort(),
    endingCounts,
  };
  return { kind: "composed", talk };
}

/** The colleague's last answer along a path through an ask: the move the legislature reads. */
export function lastAnswer(
  tree: TreeNode,
  path: readonly number[],
): string | undefined {
  let node: TreeNode | null = tree;
  let last = tree.lines.filter((row) => row.role === "asker").at(-one)?.move;
  for (const index of path) {
    node = node?.replies[index]?.next ?? null;
    if (!node) break;
    last =
      node.lines.filter((row) => row.role === "asker").at(-one)?.move ?? last;
  }
  return last;
}
