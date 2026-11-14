/**
 * Words machine part 3: the subjects of a rule that judges a path through a
 * composed scene (`judges: "path"`). For each scene the director composes, the
 * path from its first line (narration, the open, the player's intro) up to and
 * including each line the rule applies to (the ask, a promise, an offer), on
 * every branch of the scene's tree. A path is keyed by its lines' bank keys in
 * order, so the same path in two scenes is one verdict; the sheet shows the
 * words as composed in the first scene that reached it.
 *
 * A "no" here is a gap in the scene (the stake or the who, what and why was
 * never said by that point), listed for the Words lead to write; it never
 * bars or pulls a line (Words lead, Nov 14).
 */
import type {
  SceneTalk,
  SceneTalkLine,
  TreeNode,
} from "../../src/director/scene-talk";
import { verdictId } from "../../src/english/judged";
import {
  judgesPaths,
  ruleApplies,
  type LineRule,
  type RulePiece,
} from "../../src/english/line-rules";

/** One line of a path as the scene said it. */
export interface PathLine {
  readonly key: string;
  /** As the scene composed it, with its slots filled. */
  readonly text: string;
  /** The bank's words, slots as `{name}`: what a reviewer reads, since the built scenes' fills come from a test fixture, not a played world. */
  readonly words: string;
  readonly role: SceneTalkLine["role"];
  readonly speaker: string;
  readonly move: string;
}

/** A path up to a line the rule applies to: one verdict, keyed by its lines. */
export interface PathSubject {
  readonly id: string;
  readonly keys: readonly string[];
  /** The first scene that reached it, purpose/type. */
  readonly scene: string;
  readonly lines: readonly PathLine[];
  /** How many composed scenes reached it. */
  scenes: number;
  /** What the scene can go on to say after the judged line, on any branch, in tree order (at most 16 lines): where a reason given only if asked shows up. */
  readonly after: readonly PathLine[];
}

/** How many lines after the judged one a sheet shows. */
const AFTER_LINES = 16;

/** Every line under a node, in tree order. */
function linesUnder(node: TreeNode): SceneTalkLine[] {
  return [
    ...node.lines,
    ...node.replies.flatMap((reply) => [
      reply.line,
      ...(reply.next ? linesUnder(reply.next) : []),
    ]),
    ...(node.branches ?? []).flatMap((branch) => linesUnder(branch.node)),
    ...(node.end?.close ? [node.end.close] : []),
  ];
}

/** Every path the rule judges in these scenes, in the order they were reached. */
export function scenePaths(
  rule: LineRule,
  pieces: readonly RulePiece[],
  talks: readonly SceneTalk[],
): PathSubject[] {
  if (!judgesPaths(rule)) return [];
  const byKey = new Map(pieces.map((piece) => [piece.key, piece]));
  const found = new Map<string, PathSubject>();
  const keyOf = (line: SceneTalkLine) => line.parts[0];
  for (const talk of talks) {
    const scene = `${talk.purpose}/${talk.typeKey}`;
    const reached = new Set<string>();
    const visit = (
      path: readonly SceneTalkLine[],
      rest: () => readonly SceneTalkLine[],
    ) => {
      const last = path[path.length - 1]!;
      const piece = byKey.get(keyOf(last) ?? "");
      if (!piece || !ruleApplies(rule, piece)) return;
      const lines = path.filter((line) => byKey.has(keyOf(line) ?? ""));
      const keys = lines.map((line) => keyOf(line)!);
      const id = verdictId(
        keys,
        keys.map((key) => byKey.get(key)!.text),
      );
      if (reached.has(id)) return;
      reached.add(id);
      const seen = found.get(id);
      if (seen) {
        seen.scenes += 1;
        return;
      }
      const shown = (line: SceneTalkLine): PathLine => ({
        key: keyOf(line)!,
        text: line.text,
        words: byKey.get(keyOf(line)!)!.text,
        role: line.role,
        speaker: line.speaker,
        move: line.move,
      });
      found.set(id, {
        id,
        keys,
        scene,
        lines: lines.map(shown),
        scenes: 1,
        after: rest()
          .filter((line) => byKey.has(keyOf(line) ?? ""))
          .slice(0, AFTER_LINES)
          .map(shown),
      });
    };
    const walk = (node: TreeNode, before: readonly SceneTalkLine[]) => {
      let path = before;
      for (const [i, line] of node.lines.entries()) {
        path = [...path, line];
        visit(path, () => [
          ...node.lines.slice(i + 1),
          ...linesUnder({ ...node, lines: [] }),
        ]);
      }
      for (const reply of node.replies) {
        const next = [...path, reply.line];
        visit(next, () => (reply.next ? linesUnder(reply.next) : []));
        if (reply.next) walk(reply.next, next);
      }
      for (const branch of node.branches ?? []) walk(branch.node, path);
      if (node.end?.close) visit([...path, node.end.close], () => []);
    };
    const opening = [
      ...talk.narration,
      ...(talk.open ? [talk.open] : []),
      ...talk.intro,
      talk.state,
    ];
    for (let n = 1; n <= opening.length; n += 1)
      visit(opening.slice(0, n), () => [
        ...opening.slice(n),
        ...linesUnder(talk.tree),
      ]);
    walk(talk.tree, opening);
  }
  return [...found.values()];
}
