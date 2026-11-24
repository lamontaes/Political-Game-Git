/**
 * The greets that read what passed between two people (class H), printed in
 * the second scene as the player reads it. Development tooling, run by the
 * Words builder for a pull request's played file at its head; shipped play
 * never imports it.
 *
 *   node --import tsx scripts/words/relation-greets-replay.ts > played-<sha8>.md
 *
 * Place Sheridan WY (5669845), seed "7", and the pinned official below, who
 * holds a town council seat there: nothing is picked at run time. A resident
 * brings a problem to the official's office hours; the official's reply is a
 * real scene.reply; the game brings the same resident back after its own
 * return gap (caseRepeatDays, 180, constituent-cases.ts) and that second
 * visit stages the scene printed. It takes about ten minutes (the world
 * and 300 days of it, about 1.5 s a day); the first visits fall on Apr 20 and
 * May 20 and the second on Oct 17 and Nov 16, so no shorter span shows
 * both greets. That is why it is a script and not a test (the Account lead,
 * Nov 15).
 */
import { execSync } from "node:child_process";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { townSeats } from "../../src/core2/modules/offices";
import {
  CASES_MODULE_ID,
  type CaseRow,
} from "../../src/core2/modules/constituent-cases";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { relationFacts } from "../../src/director/relation-facts";
import rules from "../../src/director/data/scene-talk-rules.json" with { type: "json" };
import { purposeScene, replyInScene } from "../../src/director/purpose-scene";
import type { TreeNode } from "../../src/director/scene-talk";

/** The town official the residents of Sheridan WY, seed 7, bring problems to. */
const OFFICIAL = "person_00a6bd60d9b5c6b9" as PersonId;
const WANTED = [
  "scene-talk.open-greet.you-helped-me-once",
  "scene-talk.open-greet.you-told-me-no-last-time",
];

function main(): void {
  const sha = execSync("git rev-parse HEAD").toString().trim();
  process.stdout.write(
    `# Class H greets played at ${sha}\n\nSheridan WY (5669845), seed 7, official ${OFFICIAL} (pinned).\n\n`,
  );
  const build = () =>
    buildBenchWorld("7", gameStartDate(), {
      twoLevel: true,
      placeKey: "5669845",
    });
  // The official is named, not picked at run time. Found by a scout run of
  // this same world (every town official watched, 120 days): this official
  // held the office the most residents brought their problems to
  // (office.approached). Here that official is the player (the game keeps
  // what names the player), as play has it when the player holds the seat.
  const me = OFFICIAL;
  const { core, director: dir } = build();
  const seat = townSeats(coreAPI(core)).find(
    (row) => row.holder?.personId === OFFICIAL,
  );
  if (!seat) throw new Error("the pinned official no longer holds a town seat");
  process.stdout.write(
    `OFFICIAL ${OFFICIAL} holds ${JSON.stringify(seat?.office.id)}\n`,
  );
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
  if (!out.length) throw new Error("no second visit was played");
}
main();
