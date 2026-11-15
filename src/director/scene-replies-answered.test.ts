/**
 * A reply the player is offered in a purpose scene always gets an answer
 * (director-purpose-scene-reply-with-no-answer). Before, a reply whose answer
 * no bank line could word stayed on the menu and the scene stopped on it
 * ("Who's going to speak for you at the council?" in a cause invite at
 * Salado, Texas). Now such a reply is not offered, and the missing answer is
 * listed among the scene's gaps for the bank.
 *
 * HAND-STAGED: the `cause.shared` record, as the drives engine's
 * `share-drive` writes it, for the two policy questions the Salado invites
 * were about. From that record on, the director's matching, the cast and the
 * scene are the engines' own.
 *
 * Pinned: Edgar, Wisconsin (5522550), seed edgar-petition-1.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { pairKey } from "../core2/kernel/ids";
import { advanceCore } from "../core2/life";
import { applyCoreEvent } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

const PLACE = "5522550";
const SEED = "edgar-petition-1";
const where = `Edgar, Wisconsin (${PLACE}), seed ${SEED}`;

/** Every reply offered in the tree whose branch has no line after it. */
function unanswered(node: TreeNode, out: string[] = []): string[] {
  for (const reply of node.replies) {
    if (!reply.next) continue;
    if (reply.line.move !== "leave" && !reply.next.lines.length)
      out.push(reply.line.text);
    unanswered(reply.next, out);
  }
  for (const branch of node.branches ?? []) unanswered(branch.node, out);
  return out;
}

describe("every reply a purpose scene offers is answered", () => {
  for (const topic of [
    "us-policy-positions:justice-public-safety.civilian-oversight-of-police",
    "us-policy-positions:justice-public-safety.permit-to-carry-concealed",
  ])
    it(`${where}: a cause invite about ${topic}`, () => {
      const previous = setBookkeeping(false);
      try {
        const { core, director, playerId } = buildBenchWorld(
          SEED,
          gameStartDate(),
          { twoLevel: true, placeKey: PLACE },
        );
        const id = playerId as PersonId;
        director.watch(core, id);
        const book = director.ledger.people.get(id)!;
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
        const home = core.people.get(id)!.householdId;
        const sharer = [...core.people.values()]
          .filter(
            (p) =>
              p.id !== id &&
              p.alive &&
              p.householdId !== home &&
              core.relationships.has(pairKey(id, p.id)),
          )
          .sort((a, b) => a.id.localeCompare(b.id))[0];
        expect(sharer, where).toBeTruthy();
        const recordId = `cause.shared:${core.date}:${sharer!.id}:${id}:cause:${topic}`;
        applyCoreEvent(core, {
          id: recordId,
          date: core.date,
          kind: "cause.shared",
          personIds: [sharer!.id],
          witnessIds: [id],
          placeId: sharer!.placeId,
          topic,
          desiredChange: topic,
          stressImpulse: 0.5,
          moodImpulse: -0.5,
          source: {
            tag: "ESTIMATED",
            asOf: core.date,
            citation: "Hand-staged shared cause for the answered replies test.",
          },
        });
        let entry;
        for (let day = 0; day < 14 && !entry; day += 1) {
          advanceCore(core, addDays(makeIsoDate(core.date), 1));
          entry = book.schedule.find(
            (row) =>
              row.bindings.some((b) => b.typeKey === "cause-invite") &&
              book.momentsById.get(row.momentId)?.causeId === recordId,
          );
        }
        expect(entry, `${where}: no invite scheduled`).toBeTruthy();
        const result = purposeScene(core, director, id, entry!, {
          typeKey: "cause-invite",
        });
        expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
          "composed",
        );
        if (result?.kind !== "composed") return;
        expect(unanswered(result.scene.talk.tree), where).toEqual([]);
      } finally {
        setBookkeeping(previous);
      }
    }, 120_000);
});
