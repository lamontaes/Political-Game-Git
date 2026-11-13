import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { seatView } from "../bench/legislature";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  CASES_MODULE_ID,
  type CaseRow,
} from "../core2/modules/constituent-cases";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";
import { answerFitsQuestion, questionKind } from "../english/composed-checks";

/**
 * Office hours said as moves about the constituent's case (words composer,
 * unit 5: the case-help set, data/english/scene-move-sets.json). In a played
 * world a resident member of a body (the player) lives until a resident
 * brings them a case at office hours (constituent-cases.ts office.approached)
 * and the director stages the scene. Every line said is whole (no empty
 * slot), names what the case's records hold, two replies offered together
 * differ, and an answer is the kind its question asks for. Then the scene's
 * ending decides the case: the call the player says they'll make is the
 * case taken up (constituent-cases.ts reads scene.reply and refers it), and
 * a no turns it away. Drawn places, a fresh seed, place and seed printed.
 */
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 8;
const DAYS = 90;

function nodes(node: TreeNode, out: TreeNode[] = []): TreeNode[] {
  out.push(node);
  for (const reply of node.replies) if (reply.next) nodes(reply.next, out);
  return out;
}

/** The path to the first reply of a move that ends the scene. */
function pathTo(node: TreeNode, move: string, ending: string): number[] | null {
  for (const [at, reply] of node.replies.entries()) {
    if (reply.line.move === move && reply.next?.end?.ending?.id === ending)
      return [at];
    const deeper = reply.next ? pathTo(reply.next, move, ending) : null;
    if (deeper) return [at, ...deeper];
  }
  return null;
}

const run = (drawSeed: string, decision: "help" | "decline"): string | null => {
  const place = drawPlace(drawSeed, "case-help-moves");
  const where = `${place.name} (${place.key}), seed ${drawSeed}`;
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const member = [...core.people.values()]
    .filter((p) => p.alive && p.id.startsWith("person_"))
    .sort((a, b) => a.id.localeCompare(b.id))
    .find((p) => seatView(core, p.id).bodies.length > 0);
  if (!member) return `${where}: no resident member of a body`;
  const me = member.id as PersonId;
  core.playerId = me;
  director.watch(core, me);
  const cases = coreAPI(core).moduleState(CASES_MODULE_ID).table("cases");
  // A visit whose case the office has not already decided by its deadline.
  const open = (momentId: string) =>
    (
      cases.get(momentId.slice(momentId.indexOf("case:"))) as
        CaseRow | undefined
    )?.status === "open";
  const find = () =>
    director.ledger.people
      .get(me)
      ?.schedule.find(
        (row) =>
          row.bindings.some((b) => b.typeKey === "office-hours") &&
          open(row.momentId),
      );
  let entry = find();
  for (let day = 0; day < DAYS && !entry; day++) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    entry = find();
  }
  if (!entry) return `${where}: no case brought to ${me} in ${DAYS} days`;
  const result = purposeScene(core, director, me, entry, {
    typeKey: "office-hours",
  });
  expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe("composed");
  if (result?.kind !== "composed") return null;
  const { talk, cause } = result.scene;
  for (const node of nodes(talk.tree)) {
    const offered = node.replies.map((reply) => reply.line);
    expect(new Set(offered.map((line) => line.text)).size, where).toBe(
      offered.length,
    );
    const asked = [...node.lines]
      .reverse()
      .find((line) => line.role === "asker" && questionKind(line.text));
    for (const line of [...offered, ...node.lines]) {
      expect(line.text, `${where}: ${line.text}`).not.toMatch(/[{}]|undefined/);
      if (asked && line.move === "answer")
        expect(answerFitsQuestion(asked.text, line.text), where).toBe(true);
    }
  }
  // A lie that the call was made is answered: believed, the constituent
  // thanks you for what they think was done, naming the office from the case
  // record; caught, only where they hold the record that says otherwise.
  expect(
    talk.gaps.filter((gap) => /\/follow\/.* after lie/.test(gap)),
    where,
  ).toEqual([]);
  const agency = result.scene.facts.find((row) => row.key === "agency");
  let lies = 0;
  for (const node of nodes(talk.tree))
    for (const reply of node.replies.filter((r) => r.line.move === "lie")) {
      lies += 1;
      // Answered in a follow, or, on the last round, in the close.
      const follow = reply.next?.lines.find((line) => line.role === "asker");
      const answer = follow ?? reply.next?.end?.close;
      expect(
        answer,
        `${where}: no answer to "${reply.line.text}"`,
      ).toBeTruthy();
      if (follow)
        expect(["thank", "accept", "confront"], where).toContain(follow.move);
      if (follow && agency)
        expect(follow.text.toLowerCase(), where).toContain(
          agency.text.toLowerCase(),
        );
    }
  expect(lies, `${where}: no lie offered`).toBeGreaterThan(0);
  const ending = decision === "help" ? "will-call" : "cant-help";
  const path = pathTo(
    talk.tree,
    decision === "help" ? "promise" : "decline",
    ending,
  );
  expect(path, `${where}: no reply reaches ${ending}`).not.toBeNull();
  const replyId = replyInScene(core, director, me, entry, path!, {
    typeKey: "office-hours",
  });
  expect(replyId, where).not.toBeNull();
  const caseId = String(cause.facts.caseId);
  const row = coreAPI(core)
    .moduleState(CASES_MODULE_ID)
    .table("cases")
    .get(caseId) as CaseRow | undefined;
  process.stdout.write(
    `${where}: ${ending} on ${caseId} -> ${row?.status} (${row?.outcome}), handled by ${row?.handledBy}\n`,
  );
  expect(row?.status, where).toBe(decision === "help" ? "helped" : "declined");
  expect(row?.handledBy, where).toBe("official");
  return null;
};

describe(`office hours said as moves about the case (seed ${seed})`, () => {
  for (const decision of ["help", "decline"] as const)
    it(`a case brought at office hours is ${decision === "help" ? "taken up" : "turned away"} by the scene's ending`, () => {
      const passed: string[] = [];
      for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
        const skipped = run(`${seed}:${decision}:${attempt}`, decision);
        if (skipped === null) return;
        passed.push(skipped);
      }
      throw new Error(
        `no drawn place brought a case in ${ATTEMPTS} tries: ${passed.join("; ")}`,
      );
    }, 600_000);
});
