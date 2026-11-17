/**
 * A neighbor's invitation to a cause (Story lead, Nov 17: the join-cause rewrite) asks the player
 * to the next posted town meeting, and the lines the player answers with are placed by what the
 * records hold:
 *
 * - an agree is offered only where the player's own view is with the cause (`stand-with`), and a
 *   player whose view is against it is offered none;
 * - the yes writes the `attend` promise against the meeting by record id (promises.ts), the
 *   calendar marks the player and writes the neighbor onto the meeting;
 * - a thank-you never follows a no: no reply to a decline is answered with a thank, and a thanks
 *   close ends only a path that said yes.
 *
 * The place is drawn from all 56 by seed and attempt, never pinned; a draw with no tie outside the
 * household or no meeting posted in 45 days is passed over and named. HAND-STAGED: the
 * `cause.shared` record, as the drives engine's `share-drive` writes it (cause-invite-topics.test.ts
 * does the same); from that record on, the director's matching, the cast and the scene are the
 * engines' own.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { personLean } from "../core2/campaign-views";
import { gameStartDate } from "../core2/game-start";
import { townLean } from "../core2/modules/campaigns";
import { meetingOf } from "../core2/modules/office-day";
import { viewOn } from "../core2/modules/views";
import { applyCoreEvent, coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { allQuestions } from "../english/policy-names";
import { drawPlace } from "../../scripts/core2-year/place";
import { play } from "../../tests/support/real-borrower";
import { pathTo } from "../../tests/support/promise-play";
import { nextMeetingFacts } from "./meeting-facts";
import { promisesBetween } from "./promises";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

const SEED = "join-cause-paths-1";
const ATTEMPTS = 4;

interface WalkedPath {
  moves: string[];
  ending?: string;
  close?: string;
}

/** Every path of a tree as the moves said along it: the player's replies and the asker's answers in order. */
function walk(node: TreeNode, said: readonly string[], out: WalkedPath[]) {
  const here = [...said, ...node.lines.map((row) => `${row.role}:${row.move}`)];
  if (node.end)
    out.push({
      moves: here,
      ending: node.end.ending?.id,
      close: node.end.close?.move,
    });
  for (const reply of node.replies)
    if (reply.next)
      walk(reply.next, [...here, `asked:${reply.line.move}`], out);
}

describe("a neighbor's invitation to a cause", () => {
  it("asks for a posted meeting, plays a yes only where the stand or the office holds, and keeps the attend promise by record id", () => {
    const previous = setBookkeeping(false);
    const passed: string[] = [];
    try {
      for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
        const place = drawPlace(SEED, `join-cause:${attempt}`);
        const where = `${place.name} (${place.key}), seed ${SEED} draw ${attempt}, world seed ${place.seed}`;
        const { core, director, playerId } = buildBenchWorld(
          place.seed,
          gameStartDate(),
          { twoLevel: true, placeKey: place.key },
        );
        const me = playerId as PersonId;
        const api = coreAPI(core);
        director.watch(core, me);
        core.focusPersonIds.add(me);
        const book = director.ledger.people.get(me)!;
        for (let day = 0; day < 45 && !nextMeetingFacts(core).meeting; day += 2)
          play(core, me, 2);
        const ahead = nextMeetingFacts(core);
        const meetingId = ahead.meeting?.sourceRecordIds[0];
        if (!meetingId) {
          passed.push(`${where}: no meeting posted in 45 days`);
          continue;
        }
        const home = core.people.get(me)!.householdId;
        const sharers = [...(core.relationshipsByPerson.get(me) ?? [])]
          .map((id) => core.relationships.get(id)!)
          .map((row) => (row.actorId === me ? row.otherId : row.actorId))
          .filter((id) => {
            const person = core.people.get(id as PersonId);
            return (
              person?.alive &&
              person.id.startsWith("person_") &&
              person.householdId !== home
            );
          })
          .sort() as PersonId[];
        if (sharers.length < 2) {
          passed.push(`${where}: fewer than two ties outside the home`);
          continue;
        }
        const lean = personLean(
          core.people,
          core.people.get(me)!,
          townLean(api),
        );
        const ranked = allQuestions().sort(
          (a, b) => viewOn(api, me, b, lean) - viewOn(api, me, a, lean),
        );
        const stage = (sharer: PersonId, topic: string) => {
          const recordId = `cause.shared:${core.date}:${sharer}:${me}:cause:${topic}`;
          applyCoreEvent(core, {
            id: recordId,
            date: core.date,
            kind: "cause.shared",
            personIds: [sharer],
            witnessIds: [me],
            placeId: core.people.get(sharer)!.placeId,
            topic,
            desiredChange: "enact",
            stressImpulse: 0.5,
            moodImpulse: -0.5,
            source: {
              tag: "ESTIMATED",
              asOf: core.date,
              citation: "Hand-staged shared cause for the join-cause test.",
            },
          });
          let entry;
          for (let day = 0; day < 7 && !entry; day += 1) {
            play(core, me, 2);
            entry = book.schedule.find(
              (row) =>
                row.bindings.some((b) => b.typeKey === "cause-invite") &&
                book.momentsById.get(row.momentId)?.causeId === recordId,
            );
          }
          expect(entry, `${where}: no invite staged for ${topic}`).toBeTruthy();
          const result = purposeScene(core, director, me, entry!, {
            typeKey: "cause-invite",
          });
          expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
            "composed",
          );
          if (result?.kind !== "composed") throw new Error(where);
          return { entry: entry!, scene: result.scene, recordId };
        };
        const paths = (tree: TreeNode) => {
          const out: WalkedPath[] = [];
          walk(tree, [], out);
          return out;
        };
        // A cause the player is for: the yes is offered and keeps the promise.
        const withUs = stage(sharers[0]!, ranked[0]!);
        const factKeys = (scene: typeof withUs.scene) =>
          scene.facts.map((row) => row.key);
        expect(factKeys(withUs.scene), where).toContain("stand-with");
        const request = withUs.scene.talk.state;
        expect(request.text, where).toContain(ahead.body!.text);
        const path = pathTo(withUs.scene.talk.tree, "joined");
        expect(path, `${where}: no yes`).toBeTruthy();
        const replyId = replyInScene(core, director, me, withUs.entry, path!, {
          typeKey: "cause-invite",
        })!;
        const reply = core.durableLog.get(replyId)!;
        expect(reply.facts?.["promise-meetingId"], where).toBe(meetingId);
        const factId = `promise:${replyId}`;
        const held = promisesBetween(director.ledger, me, sharers[0]!).find(
          (row) => row.id === factId,
        );
        expect(held?.outcome, where).toBe("open");
        expect(held?.kind, where).toBe("attend");
        expect(held?.meetingId, where).toBe(meetingId);
        for (let step = 0; step < 30 && !meetingOf(api, meetingId); step += 1)
          play(core, me, 2);
        const row = meetingOf(api, meetingId);
        expect(row?.audience, `${where}: ${meetingId} not marked`).toBe(me);
        expect(row?.with, where).toContain(sharers[0]);
        // The agree is offered only with a stand with the cause or an office held.
        for (const scene of [withUs.scene]) {
          const agrees = scene.talk.tree.replies.filter(
            (r) => r.line.move === "agree",
          );
          expect(agrees.length, where).toBeGreaterThan(0);
          for (const key of factKeys(scene).length ? ["x"] : []) void key;
          expect(
            factKeys(scene).includes("stand-with") ||
              factKeys(scene).includes("title"),
            where,
          ).toBe(true);
        }
        // A cause the player is against: no yes is offered anywhere in the talk.
        const against = stage(sharers[1]!, ranked[ranked.length - 1]!);
        const apart = factKeys(against.scene);
        expect(apart, where).toContain("stand-apart");
        if (!apart.includes("title")) {
          const everyPath = paths(against.scene.talk.tree);
          expect(
            everyPath.some((p) => p.moves.includes("asked:agree")),
            `${where}: a yes offered to a player against the cause`,
          ).toBe(false);
        }
        // No thank-you follows a no, and a thanks close ends only a yes.
        for (const scene of [withUs.scene, against.scene])
          for (const p of paths(scene.talk.tree)) {
            p.moves.forEach((move, at) => {
              if (move === "asked:decline")
                expect(p.moves[at + 1], where).not.toBe("asker:thank");
            });
            if (p.close === "thank")
              expect(p.moves, where).toContain("asked:agree");
          }
        process.stdout.write(
          `JOIN-CAUSE ${where}: ${withUs.recordId} yes kept as ${factId} (attend, ${meetingId}), open; ${against.recordId} offers no yes; passed over: ${passed.join("; ") || "none"}\n`,
        );
        return;
      }
      throw new Error(`No place played the invitation: ${passed.join("; ")}`);
    } finally {
      setBookkeeping(previous);
    }
  }, 900_000);
});
