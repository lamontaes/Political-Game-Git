/**
 * The greets that read what passed between two people (class H), printed in
 * the second scene as the player reads it. Played at Sheridan WY, seed "7":
 * a resident brings a problem to an official's office hours; the official's
 * reply is a real scene.reply; a later visit by the same resident (the
 * visit's record copied, labeled HAND-MADE below) stages the second scene.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { townSeats } from "../core2/modules/offices";
import { applyCoreEvent, coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import rules from "./data/scene-talk-rules.json" with { type: "json" };
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

describe("greets that read what passed (played)", () => {
  it("prints the second office-hours scene after a real reply, Sheridan WY, seed 7", () => {
    const { core, director: dir } = buildBenchWorld("7", gameStartDate(), {
      twoLevel: true,
      placeKey: "5669845",
    });
    const api = coreAPI(core);
    const officials: PersonId[] = [];
    for (const row of townSeats(api)) {
      const id = row.holder?.personId;
      if (id && core.people.get(id)?.alive) {
        dir.watch(core, id);
        officials.push(id);
      }
    }
    const day = (n: number) =>
      advanceCore(core, addDays(makeIsoDate(core.date), n));
    day(120);
    const visits = [...core.durableLog.values()].filter(
      (row) =>
        row.kind === "office.approached" &&
        row.personIds.length === 2 &&
        dir.ledger.people.has(String(row.facts?.officialId) as PersonId),
    );
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
    const kinds: [string, (m: string) => boolean][] = [
      ["refused", (m) => rules.passedBetween.refused.includes(m)],
      ["helped", (m) => rules.passedBetween.helped.includes(m)],
    ];
    const out: string[] = [`visits in 120 days: ${visits.length}`];
    const used = new Set<string>();
    for (const [kind, want] of kinds) {
      for (const visit of visits) {
        const officialId = String(visit.facts!.officialId) as PersonId;
        const residentId = String(visit.facts!.constituentId) as PersonId;
        if (used.has(residentId)) continue;
        const entry = entryOf(officialId, visit.id);
        const first = entry ? purposeScene(core, dir, officialId, entry) : null;
        if (first?.kind !== "composed" || !entry) continue;
        const path = pathWhere(first.scene.talk.tree, want);
        if (!path) continue;
        const recordId = replyInScene(core, dir, officialId, entry, path);
        if (!recordId) continue;
        used.add(residentId);
        const seen = new Set<string>();
        // HAND-MADE: the same resident visits again, up to eight times, each
        // visit the first one's record copied with its own id.
        for (let n = 1; n <= 8; n += 1) {
          day(2);
          const again = `${visit.id}:again${n}`;
          applyCoreEvent(core, {
            ...visit,
            id: again,
            date: core.date,
          } as never);
          day(1);
          const entry2 = entryOf(officialId, again);
          const second = entry2
            ? purposeScene(core, dir, officialId, entry2)
            : null;
          if (second?.kind !== "composed") {
            out.push(
              `${kind}: ${again} second scene ${second?.kind ?? "none"}`,
            );
            continue;
          }
          const talk = second.scene.talk;
          const greet = talk.open?.parts?.[0] ?? "no greet";
          if (seen.has(greet)) continue;
          seen.add(greet);
          const held = second.scene.facts
            .filter((row) =>
              ["asked-before", "helped-before", "refused-before"].includes(
                row.key,
              ),
            )
            .map((row) => `${row.key}[${row.recordIds.join(",")}]`);
          out.push(
            `=== ${kind}: first visit ${visit.id}, ${officialId} said ${said(first.scene.talk.tree, path)} (path ${path.join(".")}, record ${recordId})`,
            `second visit ${again}; facts ${held.join(" ")}`,
            `OPEN  (${talk.open?.speaker}): ${talk.open?.text} [${greet}]`,
            `STATE (${talk.state.speaker}): ${talk.state.text}`,
            ...(talk.rounds[0]?.replies ?? []).map((r) => `  REPLY: ${r.text}`),
          );
        }
        break;
      }
    }
    process.stdout.write(`GREETS PLAYED\n${out.join("\n")}\n`);
    expect(out.length).toBeGreaterThan(1);
  }, 600_000);
});
