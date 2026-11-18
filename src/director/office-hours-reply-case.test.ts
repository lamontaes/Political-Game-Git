import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  CASES_MODULE_ID,
  type CaseRow,
} from "../core2/modules/constituent-cases";
import { CAMPAIGNS_MODULE_ID } from "../core2/modules/campaigns";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

// The official's answer at office hours settles the resident's case through the
// cases engine, the way the desk's decision does (pool item
// scene-office-hours-reply-handles-the-case): "I'll make the call" and "Let me
// refer you" are help, "I can't help" a decline, and the case row cites the
// reply. A reply that settles nothing leaves the case open.
// Drawn (CTO, Nov 17: tests draw their place; it was pinned to Taylors SC,
// Kandiyohi MN and Donnelly ID): places drawn from all 56 until two have
// played a reply that helps; a place where no resident visits an official in
// DAYS, or no visit offers a reply that helps, is passed over and named.
// GOLDEN_PATH_SEED replays one.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const DRAWS = 6;
const PROVED = 2;
const DAYS = 45;

/** The first path of reply indexes through the tree that reaches an ending that settles the case as `settles`, or (settles null) any ending that settles nothing. */
function pathTo(
  node: TreeNode | null,
  settles: "help" | "decline" | null,
  path: number[] = [],
): number[] | null {
  for (const [index, reply] of (node?.replies ?? []).entries()) {
    const next = reply.next;
    const ending = next?.end?.ending;
    if (
      next?.end &&
      (ending?.settles ?? null) === settles &&
      !next.replies.length
    )
      return [...path, index];
    const deeper = pathTo(next, settles, [...path, index]);
    if (deeper) return deeper;
  }
  return null;
}

it(`an office-hours reply settles the resident's case through the cases engine (seed ${seed})`, () => {
  setBookkeeping(false);
  const proved: string[] = [];
  const passed: string[] = [];
  for (let i = 0; i < DRAWS && proved.length < PROVED; i += 1) {
    const place = drawPlace(`${seed}:${i}`, "office-hours-reply");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const outcome = officeHoursAt(place, where);
    (outcome === "helped" ? proved : passed).push(
      outcome === "helped" ? where : `${where}: ${outcome}`,
    );
  }
  console.log(
    `office hours: helped at ${proved.join("; ")}; passed over: ${passed.join("; ") || "none"}`,
  );
  expect(
    proved.length,
    `places where an office-hours reply helped; passed over: ${passed.join("; ")}`,
  ).toBe(PROVED);
}, 1_200_000);

/** Plays one place: "helped" once a reply that helps settled a case, else why it was passed over. */
function officeHoursAt(
  place: { key: string; seed: string },
  where: string,
): string {
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  for (const row of townSeats(api)) {
    const id = row.holder?.personId;
    if (id && core.people.get(id)?.alive) director.watch(core, id);
  }
  // A day at a time, stopping the day a resident's visit lands: the office
  // settles an unanswered case itself once its response window ends.
  const open = (): ReturnType<typeof visitsNow> =>
    visitsNow().filter(
      (row) =>
        (
          api
            .moduleState(CASES_MODULE_ID)
            .table("cases")
            .get(String(row.facts?.caseId)) as unknown as CaseRow | undefined
        )?.status === "open",
    );
  const visitsNow = () =>
    [...core.durableLog.values()].filter(
      (row) =>
        row.kind === "office.approached" &&
        director.ledger.people.has(String(row.facts?.officialId) as PersonId),
    );
  for (let day = 0; day < DAYS && !open().length; day += 1)
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const visits = open();
  if (!visits.length)
    return `no resident brought a problem to an official in ${DAYS} days`;
  const cases = api.moduleState(CASES_MODULE_ID).table("cases");
  const caseOf = (id: string): CaseRow => cases.get(id) as unknown as CaseRow;
  let helped = 0;
  let declined = 0;
  let left = 0;
  for (const visit of visits) {
    const officialId = String(visit.facts!.officialId) as PersonId;
    const caseId = String(visit.facts!.caseId);
    const here = `${where}: ${visit.id}`;
    const entry = director.ledger.people
      .get(officialId)!
      .schedule.find((row) => row.momentId.includes(visit.id));
    const result = entry
      ? purposeScene(core, director, officialId, entry)
      : null;
    if (result?.kind !== "composed" || caseOf(caseId)?.status !== "open")
      continue;
    const tree = result.scene.talk.tree;
    // Help where the tree offers it, else a decline, else a reply that settles nothing.
    const want = (
      pathTo(tree, "help") && !helped
        ? "help"
        : pathTo(tree, "decline") && !declined
          ? "decline"
          : null
    ) as "help" | "decline" | null;
    const path = pathTo(tree, want);
    if (!path) {
      continue;
    }
    const before = caseOf(caseId);
    const id = replyInScene(core, director, officialId, entry!, path);
    expect(id, here).toBeTruthy();
    const after = caseOf(caseId);
    if (want) {
      expect(after.status, `${here}: ${want}`).toBe(
        want === "help" ? "helped" : "declined",
      );
      expect(after.handledBy, here).toBe("official");
      expect(after.replyId, here).toBe(id);
      const causes = api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("causes")
        .rows() as unknown as {
        voterId: string;
        candidateId: string;
        act: string;
        sourceId?: string;
      }[];
      // The resident's view of the official: where its why is kept, it cites the reply.
      for (const cause of causes.filter(
        (row) =>
          row.voterId === before.personId &&
          row.candidateId === officialId &&
          row.act === "constituent-case",
      ))
        expect(cause.sourceId, here).toBe(id);
      if (want === "help") helped += 1;
      else declined += 1;
    } else {
      expect(after.status, `${here}: a reply that settles nothing`).toBe(
        "open",
      );
      left += 1;
    }
  }
  if (!helped)
    return helped + declined + left
      ? "no visit offered a reply that helps"
      : "no reply was played";
  return "helped";
}
