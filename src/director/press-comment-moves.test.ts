import { describe, expect, it } from "vitest";
import {
  composeSceneTalk,
  type PurposeType,
  type TreeNode,
} from "./scene-talk";
import { SITUATION_LIBRARY } from "./scheduling";
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import type { BankPart, Fact } from "../english/scene-talk-words";
import { answerFitsQuestion, questionKind } from "../english/composed-checks";
import {
  adults,
  askedId,
  core,
  director,
  seed,
} from "../../tests/support/scene-talk-fixture";

// A reporter's call is said as moves about the bill's records (words
// composer, unit 4; data/english/scene-move-sets.json, the on-record set):
// the member's replies state the side their own vote took, never the other
// unless it is the lie; two replies offered together are different moves in
// different words; a slot is never said empty; and across ten reporters the
// same wording does not lead more than three calls.
const TYPE = SITUATION_LIBRARY.types.find(
  (row) => row.key === "press-interview",
) as unknown as PurposeType;
const PARTS = (sceneBank as unknown as { parts: BankPart[] }).parts;
const BY_KEY = new Map(PARTS.map((part) => [part.key, part]));
const DRAWS = 10;
const MOST_CALLS_PER_WORDING = 3;

const cite = (text: string): Fact => ({ text, sourceRecordIds: ["bill:x"] });
const record = (side: "for" | "against"): Record<string, Fact> => ({
  name: cite("Pat Rivera"),
  bill: cite("Ordinance 2025-4"),
  story: cite("Ordinance 2025-4"),
  about: cite("a higher minimum wage"),
  outlet: cite("the Ledger"),
  place: cite("the town"),
  first: cite(core.people.get(askedId)!.givenName),
  "floor-count": cite(side === "for" ? "5 to 2" : "2 to 5"),
  [side === "for" ? "bill-passed" : "bill-failed"]: cite("yes"),
  [side === "for" ? "voted-yes" : "voted-no"]: cite("2025-4"),
  "own-vote": cite("yes"),
  [`stand-${side}`]: cite("yes"),
  "reason-town": cite("yes"),
  [side === "for" ? "next-desk" : "next-dead"]: cite("yes"),
});

/** Every node of a tree, with the replies it offers. */
function nodes(node: TreeNode, out: TreeNode[] = []): TreeNode[] {
  out.push(node);
  for (const reply of node.replies) if (reply.next) nodes(reply.next, out);
  return out;
}
const core_ = (key: string) => BY_KEY.get(key);

describe(`a reporter's call said as moves about the bill (seed ${seed})`, () => {
  for (const side of ["for", "against"] as const)
    it(`a member who voted ${side} states that side, in words that differ by reporter`, () => {
      const facts = record(side);
      const other = side === "for" ? "stand-against" : "stand-for";
      const leads = new Map<string, number>();
      for (let draw = 0; draw < DRAWS; draw += 1) {
        const askerId = adults[(draw % (adults.length - 2)) + 1]!.id;
        const where = `draw ${draw}, reporter ${askerId}, side ${side}, seed ${seed}`;
        const result = composeSceneTalk(
          core,
          director,
          { askerId, askedId, causeId: `press:${draw}` },
          TYPE,
          facts,
          {},
        );
        expect(result.kind, `${where}: ${JSON.stringify(result)}`).toBe(
          "composed",
        );
        if (result.kind !== "composed") continue;
        for (const node of nodes(result.talk.tree)) {
          const offered = node.replies.map((reply) => reply.line);
          // An answer is the kind the question asks for (rule
          // answer-is-the-kind-asked): a yes or a no to a yes-or-no question,
          // and a promise of a reason keeps it.
          const asked = [...node.lines]
            .reverse()
            .find((line) => line.role === "asker" && questionKind(line.text));
          for (const line of offered) {
            if (asked && line.move === "answer")
              expect(
                answerFitsQuestion(asked.text, line.text),
                `${where}: "${asked.text}" answered "${line.text}"`,
              ).toBe(true);
            expect(line.text, where).not.toMatch(
              /\bI'll (?:say|tell)[^.?!]* why[^.?!]*\.$/,
            );
          }
          // Two replies offered together are different moves and different words.
          expect(new Set(offered.map((line) => line.move)).size, where).toBe(
            offered.length,
          );
          expect(new Set(offered.map((line) => line.text)).size, where).toBe(
            offered.length,
          );
          for (const line of [...offered, ...node.lines]) {
            expect(line.text, where).not.toMatch(
              /[{}]|undefined|\b(?:that|this) thing\b/,
            );
            // A turn says its stand once: after an opener that says the
            // side, no bare yes or no ("...I still disagree. Yes. I'd vote").
            if (line.parts.some((key) => core_(key)?.piece?.stand))
              expect(line.text, where).not.toMatch(
                /[.!?]\s+(?:Yes|No|Still no|Still yes|Even then|Every time)\.\s/,
              );
            // Only the lie says the side the member's vote did not take.
            if (line.move === "lie") continue;
            for (const key of line.parts) {
              const needs = core_(key)?.uses.flatMap(
                (u) => u.requiresFacts ?? [],
              );
              expect(needs ?? [], `${where}: ${line.text}`).not.toContain(
                other,
              );
            }
          }
        }
        const first = result.talk.tree.replies.find(
          (reply) => reply.line.move === "answer",
        );
        if (first)
          leads.set(first.line.text, (leads.get(first.line.text) ?? 0) + 1);
      }
      const most = Math.max(0, ...leads.values());
      expect(
        most,
        `the member's first answer across ${DRAWS} reporters: ${JSON.stringify([...leads])}`,
      ).toBeLessThanOrEqual(MOST_CALLS_PER_WORDING);
    });
});
