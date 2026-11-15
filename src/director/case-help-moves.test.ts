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
import sceneTalkBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import { spanSaid } from "../english/span-words";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

/**
 * Office hours said as moves about the constituent's case (words composer,
 * unit 5: the case-help set, data/english/scene-move-sets.json). In a played
 * world a resident member of a body (the player) lives until a resident
 * brings them a case at office hours (constituent-cases.ts office.approached)
 * and the director stages the scene. Every line said is whole (no empty
 * slot), names what the case's records hold, two replies offered together
 * differ,. Then the scene's
 * ending decides the case: the call the player says they'll make is the
 * case taken up (constituent-cases.ts reads scene.reply and refers it), and
 * a no turns it away. Drawn places, a fresh seed, place and seed printed.
 */
const seed = "case-help-pinned-1";
const DAYS = 90;

interface BankLine {
  key: string;
  text: string;
  uses: { set?: string; role: string }[];
}

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
  const find = () =>
    director.ledger.people
      .get(me)
      ?.schedule.find((row) =>
        row.bindings.some((b) => b.typeKey === "office-hours"),
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
    for (const line of [...offered, ...node.lines]) {
      expect(line.text, `${where}: ${line.text}`).not.toMatch(/[{}]|undefined/);
    }
  }
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

// Two named draws, each pinned: Steelville, Missouri brings the case that is
// taken up; Georgetown, Delaware the one that is turned away.
const PINNED = { help: 2, decline: 1 } as const;

describe(`office hours said as moves about the case (seed ${seed})`, () => {
  for (const decision of ["help", "decline"] as const)
    it(`a case brought at office hours is ${decision === "help" ? "taken up" : "turned away"} by the scene's ending`, () => {
      const skipped = run(`${seed}:${decision}:${PINNED[decision]}`, decision);
      expect(skipped).toBeNull();
    }, 600_000);
});

// What the bank says, read as written (no world needed).
describe("the case-help lines read as an American resident and an official would say them", () => {
  const pieces = (sceneTalkBank.parts as unknown as BankLine[]).filter((part) =>
    part.uses.some((use) => use.set === "case-help"),
  );
  it("has the lines", () => expect(pieces.length).toBeGreaterThan(70));
  it("never calls the minimum wage the floor, and never says 'Many thanks'", () => {
    for (const part of pieces) {
      expect(part.text.replace(/\{[a-z-]+\}/g, ""), part.key).not.toMatch(
        /\bfloor\b|Many thanks/i,
      );
    }
  });
  it("names the agency only in the official's own replies; the resident says 'them' or nothing", () => {
    for (const part of pieces)
      if (part.uses.some((use) => use.role === "asker"))
        expect(part.text, part.key).not.toContain("{agency}");
  });
  it("tells no one how many other cases are open", () => {
    for (const part of pieces)
      expect(part.text, part.key).not.toContain("{other-cases}");
  });
  it("says how long ago a layoff was with a span that takes 'ago'", () => {
    for (let days = 1; days < 4000; days += 7)
      expect(`${spanSaid(days)} ago`, String(days)).not.toMatch(
        /last|ago ago|more than eighty/,
      );
  });
});
