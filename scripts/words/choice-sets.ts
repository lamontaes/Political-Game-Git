/**
 * The sets of replies spots offer together, for the rule
 * `four-replies-are-four-answers` (`src/english/choice-sets.ts` flags them):
 *
 * - scenes with a purpose: every situation the director can word, composed in
 *   the scene fixture's drawn world through the one scene composer, every node
 *   of its tree (the lie and the tagged option aside);
 * - everyday talk: the replies each subject can give, one per meaning group as
 *   the talk composer offers them, with the acknowledgment where the subject
 *   is a statement (a subject nobody asks about).
 *
 * A development tool: no model calls.
 */
import situationFile from "../../src/director/data/situation-types.json" with { type: "json" };
import directorFile from "../../src/director/data/director.json" with { type: "json" };
import { CONVERSATION_DATA } from "../../src/director/conversation";
import {
  everydayMeaning,
  sceneMeaning,
} from "../../src/director/reply-meanings";
import {
  composeSceneTalk,
  type PurposeType,
  type TreeNode,
} from "../../src/director/scene-talk";
import { CONVERSATION_BANK } from "../../src/english/mined/conversation-bank";
import {
  choicesReport,
  type ChoiceReply,
  type ChoiceSpot,
  type ChoicesReport,
} from "../../src/english/choice-sets";
import {
  adults,
  askedId,
  core,
  director,
  facts,
  talkTypes,
} from "../../tests/support/scene-talk-fixture";

const wanted = (
  directorFile as unknown as {
    parameters: { directorChoicesPerTurn: { value: number } };
  }
).parameters.directorChoicesPerTurn.value;

/** Each subject's answers, one reply per meaning group (the first in the bank's order). */
export function everydaySpots(): ChoiceSpot[] {
  const pieces = new Map<string, string[]>();
  const texts = new Map<string, string>();
  for (const part of CONVERSATION_BANK.parts)
    for (const use of part.uses)
      if (use.role === "answer") {
        const at = `${use.subject}|${use.choice}`;
        pieces.set(at, [...(pieces.get(at) ?? []), part.key]);
        if (!texts.has(at)) texts.set(at, part.text);
      }
  const spots: ChoiceSpot[] = [];
  for (const [subject, bank] of Object.entries(CONVERSATION_DATA.subjects)) {
    // A greeting and a goodbye open and close a talk; they offer no set of replies.
    if (!bank.answers?.length || bank.open?.length || bank.leave?.length)
      continue;
    const replies = new Map<string, ChoiceReply>();
    for (const move of bank.answers) {
      const group = everydayMeaning(subject, move.key);
      if (replies.has(group)) continue;
      const at = `${subject}|${move.key}`;
      replies.set(group, {
        move: move.key,
        group,
        pieces: pieces.get(at) ?? [],
        text: texts.get(at) ?? move.text,
      });
    }
    // A statement is taken in with an acknowledgment, which is offered too.
    if (!bank.ask?.length && !replies.has("acknowledges"))
      replies.set("acknowledges", {
        move: "ack",
        group: "acknowledges",
        pieces: [],
        text: "(an acknowledgment)",
      });
    spots.push({
      id: `everyday talk: ${subject}`,
      replies: [...replies.values()],
    });
  }
  return spots;
}

/** Every node of every scene the director can word, composed in the fixture's world. */
export function sceneSpots(): ChoiceSpot[] {
  const spots = new Map<string, ChoiceSpot>();
  const unpurposed = (
    situationFile as unknown as { types: PurposeType[] }
  ).types.filter((row) => !row.purpose);
  for (const type of [...talkTypes(), ...unpurposed]) {
    const result = composeSceneTalk(
      core,
      director,
      { askerId: adults[1]!.id, askedId },
      type,
      facts,
      {},
      {},
    );
    if (result.kind !== "composed") continue;
    const { talk } = result;
    const walk = (node: TreeNode) => {
      const asker = [...node.lines].reverse().find((l) => l.role === "asker");
      const replies = node.replies
        .map((row) => row.line)
        .filter((line) => line.move !== "lie" && !line.tag)
        .map((line) => ({
          move: line.move,
          group: sceneMeaning(line.move),
          pieces: line.parts,
          text: line.text,
        }));
      const id = `scene: ${talk.purpose} after ${asker?.move ?? "state"}`;
      // The same spot reached on another path keeps its worst set.
      const seen = spots.get(id);
      const groups = (set: readonly ChoiceReply[]) =>
        new Set(set.map((row) => row.group)).size;
      if (replies.length && (!seen || groups(replies) < groups(seen.replies)))
        spots.set(id, { id, replies });
      for (const row of node.replies) if (row.next) walk(row.next);
      for (const branch of node.branches ?? []) walk(branch.node);
    };
    walk(talk.tree);
  }
  return [...spots.values()];
}

/** The report the rule folds into a run. */
export function choiceSetsReport(): ChoicesReport {
  return choicesReport([...everydaySpots(), ...sceneSpots()], wanted);
}
