/**
 * The greets that read what passed between two people (class H), printed in
 * the second scene as the player reads it. Played at Sheridan WY, seed "7",
 * for as many days as the game needs: a resident brings a problem to an
 * official's office hours; the official's reply is a real scene.reply; the
 * game brings the same resident back (a resident waits caseRepeatDays, 180,
 * before bringing a problem again, constituent-cases.ts), and that second
 * visit stages the scene printed. Nothing is hand-made. The days are the
 * game's own: a second visit is a year later (skill pinned-tests).
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { townSeats } from "../core2/modules/offices";
import {
  CASES_MODULE_ID,
  type CaseRow,
} from "../core2/modules/constituent-cases";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { relationFacts } from "./relation-facts";
import rules from "./data/scene-talk-rules.json" with { type: "json" };
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

const WANTED = [
  "scene-talk.open-greet.you-helped-me-once",
  "scene-talk.open-greet.you-told-me-no-last-time",
];

describe("greets that read what passed (played)", () => {
  it("prints the second office-hours scene after a real reply, Sheridan WY, seed 7", () => {
    const build = () =>
      buildBenchWorld("7", gameStartDate(), {
        twoLevel: true,
        placeKey: "5669845",
      });
    const officialsOf = (w: ReturnType<typeof build>) =>
      townSeats(coreAPI(w.core))
        .map((row) => row.holder?.personId)
        .filter((id): id is PersonId => !!id && !!w.core.people.get(id)?.alive);
    // The same world twice. The first, a scout, shows which official the
    // residents bring their problems to; in the second that official is the
    // player (the game keeps what names the player), as play has it when the
    // player holds the seat.
    const scout = build();
    for (const id of officialsOf(scout)) scout.director.watch(scout.core, id);
    advanceCore(scout.core, addDays(makeIsoDate(scout.core.date), 120));
    const tally = new Map<string, number>();
    for (const row of scout.core.durableLog.values())
      if (row.kind === "office.approached" && row.personIds.length === 2)
        tally.set(
          String(row.facts?.officialId),
          (tally.get(String(row.facts?.officialId)) ?? 0) + 1,
        );
    const me = [...tally.entries()].sort(
      (x, y) => y[1] - x[1] || x[0].localeCompare(y[0]),
    )[0]![0] as PersonId;
    const { core, director: dir } = build();
    (core as { playerId?: string }).playerId = me;
    core.focusPersonIds.add(me);
    dir.watch(core, me);
    const api = coreAPI(core);
    const seats = [me];
    const day = (n: number) =>
      advanceCore(core, addDays(makeIsoDate(core.date), n));
    const entryOf = (officialId: PersonId, id: string) =>
      dir.ledger.people
        .get(officialId)
        ?.schedule.find((row) => row.momentId.includes(id));
    const pathWhere = (
      node: TreeNode,
      want: (move: string) => boolean,
    ): number[] | null => {
      for (const [index, reply] of node.replies.entries()) {
        if (reply.next?.end && want(reply.line.move)) return [index];
        const deeper = reply.next ? pathWhere(reply.next, want) : null;
        if (deeper) return [index, ...deeper];
      }
      return null;
    };
    const said = (root: TreeNode, path: readonly number[]) => {
      const lines: string[] = [];
      let node: TreeNode | null = root;
      for (const index of path) {
        const reply = node?.replies[index];
        if (!reply) break;
        lines.push(`${reply.line.text} [${reply.line.move}]`);
        node = reply.next;
      }
      return lines.join(" / ");
    };
    const wants = [
      (m: string) => rules.passedBetween.refused.includes(m),
      (m: string) => rules.passedBetween.helped.includes(m),
    ];
    const replied = new Map<
      string,
      { text: string; recordId: string; visitId: string; caseId: string }
    >();
    const handled = new Set<string>();
    const greets = new Set<string>();
    const out: string[] = [];
    let turn = 0;
    for (
      let days = 0;
      days < 800 && !WANTED.every((key) => greets.has(key));
      days += 5
    ) {
      day(5);
      const visits = [...core.durableLog.values()].filter(
        (row) =>
          row.kind === "office.approached" &&
          row.personIds.length === 2 &&
          seats.includes(row.facts?.officialId as PersonId) &&
          !handled.has(row.id),
      );
      for (const visit of visits) {
        handled.add(visit.id);
        const officialId = String(visit.facts!.officialId) as PersonId;
        const residentId = String(visit.facts!.constituentId) as PersonId;
        const entry = entryOf(officialId, visit.id);
        const scene = entry ? purposeScene(core, dir, officialId, entry) : null;
        if (scene?.kind !== "composed" || !entry) continue;
        const talk = scene.scene.talk;
        const earlier = replied.get(`${officialId}:${residentId}`);
        const greetKey = talk.open?.parts?.[0] ?? "no greet";
        if (earlier) {
          const held = scene.scene.facts
            .filter((row) =>
              ["asked-before", "helped-before", "refused-before"].includes(
                row.key,
              ),
            )
            .map((row) => `${row.key}[${row.recordIds.join(",")}]`);
          out.push(
            `=== second visit ${visit.id} (${core.date}), ${residentId} to ${officialId}`,
            `first visit ${earlier.visitId}; the official said ${earlier.text}; record ${earlier.recordId}`,
            `facts ${held.join(" ") || "none"}`,
            `OPEN  (${talk.open?.speaker}): ${talk.open?.text} [${greetKey}]`,
            `STATE (${talk.state.speaker}): ${talk.state.text}`,
            ...(talk.rounds[0]?.replies ?? []).map((r) => `  REPLY: ${r.text}`),
          );
          greets.add(greetKey);
          const rec = core.durableLog.get(earlier.recordId as never);
          out.push(
            `RECORD ${JSON.stringify(
              rec
                ? {
                    date: rec.date,
                    personIds: rec.personIds,
                    asked: rec.facts?.asked,
                    move: rec.facts?.move,
                    ending: rec.facts?.ending,
                    keeps: rec.facts?.keeps,
                    case: (
                      api
                        .moduleState(CASES_MODULE_ID)
                        .table("cases")
                        .get(earlier.caseId) as unknown as CaseRow | undefined
                    )?.status,
                  }
                : null,
            )}; relationFacts(${scene.scene.askerId}, ${scene.scene.askedId}).passed=${JSON.stringify(relationFacts(core, scene.scene.askerId, scene.scene.askedId).passed)}; in logByKind ${core.logByKind.get("scene.reply")?.has(earlier.recordId)}`,
          );
          continue;
        }
        const path = pathWhere(talk.tree, wants[turn % wants.length]!);
        if (!path) continue;
        const recordId = replyInScene(core, dir, officialId, entry, path);
        if (!recordId) continue;
        turn += 1;
        replied.set(`${officialId}:${residentId}`, {
          text: said(talk.tree, path),
          recordId,
          visitId: visit.id,
          caseId: String(visit.facts!.caseId),
        });
      }
    }
    process.stdout.write(
      `GREETS PLAYED, ${core.date}, first replies ${replied.size}\n${out.join("\n")}\n`,
    );
    expect(out.length).toBeGreaterThan(0);
  }, 3_600_000);
});
