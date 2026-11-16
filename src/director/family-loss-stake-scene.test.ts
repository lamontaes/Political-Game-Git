import { appendFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { playLife, type Presses } from "../../scripts/words/family-loss-life";
import {
  CANDIDACY_MODULE_ID,
  candidacyReasons,
} from "../core2/modules/candidacy";
import { resultOf } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import { familyFactsOf } from "../core2/modules/people";
import type { PersonId } from "../core2/types";
import { stakeOf } from "./family-stake";
import type { TreeNode } from "./scene-talk";
import { composeJournal } from "./journal";
import { purposeScene, replyInScene } from "./purpose-scene";
import { expectUpToFourDifferent } from "./reply-set-check";

// The talk at home after a lost race (scenes-from-life, household-after-the-loss):
// staged only for a relative who put work or money into the race, and what the
// player says about running again is kept where the candidacy engine reads it
// for the next contest. The count is said once, in the narration (owner, Nov 14:
// people do not say the figure).
// Played lives, never staged: a new adult is the player, files through the
// bench's own filing and presses only what the campaign page offers
// (scripts/words/family-loss-life.ts), and the scene is read for that player
// from the world's own count. The lives are pinned by seed; each was found by
// scripts/words/family-loss-life-scan.ts (the report names the picks and what
// it passed over). Each is about a minute.
const LIVES: { seed: string; presses: Presses }[] = [
  // Ili'ili AS: volunteers asked, no money given; a household member worked it.
  { seed: "losslife:5", presses: { volunteer: true, give: 0 } },
];

/** Every line under a node, with the reply that led to it. */
function treeLines(node: TreeNode | null, path: string[], out: string[]): void {
  if (!node) return;
  for (const line of node.lines)
    out.push(`${path.join(" > ")} => ${line.text}`);
  if (node.end?.close)
    out.push(`${path.join(" > ")} => ${node.end.close.text}`);
  for (const reply of node.replies) {
    out.push(`${path.join(" > ")} ? ${reply.line.text}`);
    treeLines(reply.next, [...path, `"${reply.line.text}"`], out);
  }
}

/** One pinned life: the loss scenes it showed, or why it could not. */
const run = (life: (typeof LIVES)[number]): { done: boolean; note: string } => {
  const file = process.env.PLAYED_FILE;
  const out = playLife(life.seed, life.presses);
  if (!("core" in out))
    return { done: false, note: `${out.where}: ${out.note}` };
  const { where, core, director, contest } = out;
  const api = coreAPI(core);
  const result = resultOf(api, contest.id);
  if (!result?.winnerId) return { done: false, note: `${where}: no winner` };
  // Someone the filer knows who walked doors (a relative, or anyone known by
  // name) is named in the filer's Journal, never "someone from my campaign"
  // (Storrs, Connecticut, storrs-1: a father).
  {
    const filer = out.me;
    const person = core.people.get(filer)!;
    const kin = familyFactsOf(person);
    const known = (pid: string) =>
      kin.has(pid as PersonId) || person.knownIds.has(pid as PersonId);
    const shifts = new Map(
      (director.ledger.people.get(filer)?.moments ?? [])
        .filter(
          (moment) =>
            moment.causeKind.startsWith("event:volunteer-shift") &&
            moment.counterpartIds.some(known),
        )
        .map((moment) => [moment.id, moment.counterpartIds.find(known)!]),
    );
    const told = composeJournal(core, director, filer)
      .flatMap((chapter) => chapter.lines)
      .filter((line) => line.momentIds.some((mid) => shifts.has(mid)));
    for (const line of told)
      expect(
        (line.plain ?? line.text).match(/^(Someone|A volunteer)\b/),
        `${where}: "${line.text}" for ${shifts.get(line.momentIds[0]!)}`,
      ).toBeNull();
    process.stdout.write(
      `VOLUNTEER LINES ${where}: ${told.length} lines for people ${filer} knows: ${told
        .slice(0, 2)
        .map((line) => `"${line.text}"`)
        .join(" ")}\n`,
    );
  }
  const causeId = `election-result:${contest.id}`;
  const lines: string[] = [];
  let promised = false;
  for (const filing of [out.filing]) {
    const filer = out.me;
    const here = `${where}: ${filing.id}`;
    // The player lost: the count's own list of who missed the cut names them.
    const missed = JSON.parse(
      String(core.durableLog.get(causeId)?.facts?.outIds ?? "[]"),
    ) as string[];
    expect(missed, `${here}: the player lost`).toContain(filer);
    const entry = director.ledger.people
      .get(filer)!
      .schedule.find((row) =>
        row.momentId.includes(`election-result:${contest.id}`),
      );
    expect(entry, `${here}: the count fired no moment`).toBeTruthy();
    const household =
      core.households.get(core.people.get(filer)!.householdId)?.memberIds ?? [];
    const parts = household.filter(
      (id) => stakeOf(core, filer, causeId, id) !== null,
    );
    const staged = entry!.bindings.find((row) => row.typeKey === "family-loss");
    // The record decides it: no part in the race, no scene.
    expect(!!staged, `${here}: parts ${parts.join(",")}`).toBe(
      parts.length > 0,
    );
    if (!staged) continue;
    const scene = purposeScene(core, director, filer, entry!, {
      typeKey: "family-loss",
    });
    expect(scene?.kind, `${here}: ${JSON.stringify(scene)}`).toBe("composed");
    if (scene?.kind !== "composed") continue;
    const { askerId, facts, talk, cause } = scene.scene;
    expect(parts, here).toContain(askerId);
    expect(cause.id, here).toBe(causeId);
    const part = facts.find(
      (row) => row.key === "stake-worked" || row.key === "stake-gave",
    );
    expect(part, `${here}: the scene names no part`).toBeTruthy();
    expect(part!.recordIds, here).toContain(causeId);
    // Worked it, or gave money: the relative says which.
    const margin = facts.find((row) => row.key === "margin")!;
    // The count is said once, in the narration; nothing the relative or the
    // player says repeats it, and no line asserts a size the count does not.
    expect(
      talk.narration.some((line) => line.text.includes(margin.text)),
      `${here}: the narration says the count`,
    ).toBe(true);
    const said: string[] = [];
    treeLines(talk.tree, [], said);
    for (const text of [talk.state.text, ...said])
      expect(text, `${here}: the count said again`).not.toContain(margin.text);
    // What the count was, so a reader can judge "close": every candidate's
    // votes, the winner's lead as a share of the votes cast, and (for money)
    // what was given.
    const countFacts = (() => {
      const votes = Object.entries(
        JSON.parse(
          String(core.durableLog.get(causeId)?.facts?.totals ?? "{}"),
        ) as Record<string, number>,
      ).sort((a, b) => b[1] - a[1]);
      const cast = votes.reduce((sum, row) => sum + row[1], 0);
      const given = facts.find((row) => row.key === "given")?.text;
      const seats =
        Number(core.durableLog.get(causeId)?.facts?.seats ?? 1) || 1;
      const own = Object.fromEntries(votes)[filer] ?? 0;
      const last = votes[Math.min(seats, votes.length) - 1]?.[1] ?? own;
      return `votes ${votes.map((row) => row[1]).join(", ")} of ${cast} cast, ${seats} seat${seats === 1 ? "" : "s"}, this candidate got ${own} and the last winning seat got ${last}, so ${Math.max(0, last - own)} short${given ? `, given ${given}` : ""}`;
    })();
    if (file)
      appendFileSync(
        file,
        [
          `### ${where}: ${filing.id}, ${countFacts}`,
          ...talk.narration.map((line) => `Narration: ${line.text}`),
          `They say: ${talk.state.text}`,
          ...said.map((text) => `- ${text}`),
          "",
          "",
        ].join("\n"),
      );
    // The strongest part at home speaks: a relative who also worked it on
    // their own (the campaign enlisted them) outranks the money given.
    expect(part!.key, here).toBe(
      `stake-${stakeOf(core, filer, causeId, askerId)!.kind}`,
    );
    // Up to four replies, all different stances (owner, Nov 10).
    const moves = talk.tree.replies.map((row) => row.line.move);
    expect(new Set(moves).size, `${here}: ${moves}`).toBe(moves.length);
    expect(
      new Set(talk.tree.replies.map((row) => row.line.text)).size,
      here,
    ).toBe(moves.length);
    expectUpToFourDifferent(
      talk.tree.replies.map((row) => row.line),
      here,
    );
    for (const move of moves)
      expect(["thank", "blame", "deflect", "promise"], here).toContain(move);
    lines.push(
      `${here} (${part!.key}, lost by ${margin.text}): ${core.people.get(askerId)!.givenName}: "${talk.state.text}" / ${talk.tree.replies.map((row) => `${row.line.move}: "${row.line.text}"`).join(" | ")}`,
    );

    // The concession call, from the same result; no line in it judges how
    // close the count was (no cutoff decides that).
    const callEntry = entry!;
    if (callEntry.bindings.some((row) => row.typeKey === "race-lost")) {
      const call = purposeScene(core, director, filer, callEntry, {
        typeKey: "race-lost",
      });
      if (call?.kind === "composed") {
        const heard: string[] = [];
        treeLines(call.scene.talk.tree, [], heard);
        for (const text of heard) {
          expect(text, `${here}: a line nothing records`).not.toContain(
            "Closer than anybody expected",
          );
        }
        if (file)
          appendFileSync(
            file,
            [
              `### ${where}: the concession call`,
              `They say: ${call.scene.talk.state.text}`,
              ...heard.map((text) => `- ${text}`),
              "",
              "",
            ].join("\n"),
          );
      }
    }

    // Say you will run again: the relative's answer is kept for the next contest.
    const at = talk.tree.replies.findIndex(
      (row) => row.line.move === "promise",
    );
    const root = talk.tree.replies[at]!;
    const answer = root.next?.lines.find((row) => row.role === "asker");
    core.playerId = filer;
    const id = replyInScene(core, director, filer, entry!, [at], {
      typeKey: "family-loss",
    });
    expect(id, here).toBeTruthy();
    const backing = core.durableLog.get(id!)?.facts?.backing;
    const rows = api
      .moduleState(CANDIDACY_MODULE_ID)
      .table("backing")
      .query("byPerson", [filer]) as unknown as { stance: number }[];
    const person = core.people.get(filer)!;
    const next = {
      contestId: contest.id,
      officeName: contest.title,
      filingDeadline: contest.filingDeadline,
      sourceIds: [contest.id],
    };
    const reasons = candidacyReasons(api, person, next);
    if (backing) {
      expect(rows.length, `${here}: answer not kept`).toBe(1);
      expect(rows[0]!.stance, here).toBe(backing === "behind" ? 1 : -1);
      // The next contest's weighing reads it: pulled toward or away from running.
      expect(
        Math.sign(reasons.householdBacking ?? 0),
        `${here}: ${answer?.move} read as ${backing}`,
      ).toBe(rows[0]!.stance);
      promised = true;
      lines.push(
        `${here}: promised to run again; ${answer!.speaker} answered "${answer!.text}" (${backing}), kept as ${id}, householdBacking ${reasons.householdBacking}`,
      );
    } else expect(reasons.householdBacking, here).toBeUndefined();
  }
  return { done: promised, note: lines.join("\n") };
};

it("the talk after a lost race is for the relative who put in work or money, says the count once, places its size words by the count, and what is said about running again is read by the next contest", () => {
  const file = process.env.PLAYED_FILE;
  if (file)
    writeFileSync(
      file,
      `# After the loss, played (head ${process.env.PLAYED_SHA ?? "unknown"})\n\n`,
    );
  for (const life of LIVES) {
    const began = Date.now();
    const out = run(life);
    expect(out.done, out.note).toBe(true);
    process.stdout.write(
      `${out.note}\n${life.seed}: ${Math.round((Date.now() - began) / 1000)} s\n`,
    );
  }
}, 600_000);
