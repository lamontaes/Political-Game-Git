import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { policyNames } from "../bench/words";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import type { Fact } from "./render";
import { SITUATION_LIBRARY } from "./scheduling";
import {
  composeSceneTalk,
  type PurposeType,
  type SceneTalkLine,
  type TreeNode,
} from "./scene-talk";

// A line the owner liked in his voice notes, released into the bank
// (data/english/grades/voice-notes-batches-11-19.json), is said in a scene of
// a played world: a colleague asks a member of a real bill's body for their
// vote, in a world on a fresh seed and a place drawn from all 56, named by
// the bill's and the members' record ids. A proof scene: the director fires
// no vote ask from the records yet (words-scenes-fire-in-play), so two
// sitting members stand in, as the batch pages stage them.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "released-lines");
console.log(`released lines: seed ${seed}, ${place.name} (${place.key})`);

const released = new Set(
  (
    JSON.parse(
      readFileSync(
        "data/english/grades/voice-notes-batches-11-19.json",
        "utf8",
      ),
    ) as { grades: { grade: string; parts: string[] }[] }
  ).grades
    .filter((row) => row.grade === "good")
    .flatMap((row) => row.parts),
);

function every(node: TreeNode | null, into: SceneTalkLine[] = []) {
  if (!node) return into;
  into.push(...node.lines);
  if (node.end?.close) into.push(node.end.close);
  for (const reply of node.replies) {
    into.push(reply.line);
    every(reply.next, into);
  }
  for (const branch of node.branches ?? []) every(branch.node, into);
  return into;
}

describe("a released line in a played world", () => {
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  // The legislatures' first bills come on the first sitting day.
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const api = coreAPI(core);
  const names = policyNames();
  const terms = api
    .moduleState("core2-offices-v1")
    .table("terms")
    .rows() as unknown as {
    officeId: string;
    status: string;
    personId?: string;
  }[];
  const members = (body: string) =>
    terms
      .filter(
        (row) =>
          row.officeId === body &&
          row.status === "serving" &&
          row.personId &&
          core.people.get(row.personId as PersonId)?.alive,
      )
      .map((row) => row.personId as PersonId)
      .sort();
  const bills = (
    api
      .moduleState("core2-legislature-v1")
      .table("bills")
      .rows() as unknown as {
      id: string;
      bodyOfficeId: string;
      provisions?: { kind: string; question?: string }[];
    }[]
  ).flatMap((bill) => {
    const question = bill.provisions?.find(
      (row) => row.kind === "policy-question",
    )?.question;
    const title = question ? names[question] : undefined;
    const seats = members(bill.bodyOfficeId);
    return title && seats.length >= 2 ? [{ bill, title, seats }] : [];
  });
  const type = SITUATION_LIBRARY.types.find(
    (row) => row.key === "vote-asked",
  ) as unknown as PurposeType;

  it("says a line the owner liked, with the records it is about", () => {
    expect(bills.length, "no bill with a sitting body").toBeGreaterThan(0);
    const said: { line: SceneTalkLine; billId: string; cast: string[] }[] = [];
    for (const { bill, title, seats } of bills) {
      const [askerId, askedId] = seats as [PersonId, PersonId];
      const asker = core.people.get(askerId)!;
      const asked = core.people.get(askedId)!;
      const facts: Record<string, Fact> = {
        name: {
          text: `${asker.givenName} ${asker.familyName}`,
          sourceRecordIds: [askerId],
        },
        first: { text: asked.givenName, sourceRecordIds: [askedId] },
        bill: { text: `"${title}"`, sourceRecordIds: [bill.id] },
      };
      const result = composeSceneTalk(
        core,
        director,
        { askerId, askedId },
        type,
        facts,
        {},
        // Grading view: the rest of the scene's lines are still held.
        { includeHeld: true },
      );
      if (result.kind !== "composed") continue;
      for (const line of every(result.talk.tree))
        if (line.parts.some((key) => released.has(key)))
          said.push({ line, billId: bill.id, cast: [askerId, askedId] });
      if (said.length) break;
    }
    expect(said.length, "no scene said a released line").toBeGreaterThan(0);
    const { line, billId, cast } = said[0]!;
    console.log(
      `released line "${line.text}" (${line.parts.join(", ")}) in a vote ask on ${billId} between ${cast.join(" and ")}`,
    );
    expect(line.parts.every((key) => released.has(key))).toBe(true);
  });
});
