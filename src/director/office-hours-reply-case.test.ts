import { expect, it } from "vitest";
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
// Three named places and fixed seeds, so the test is the same run every time.
const PLACES = [
  { name: "Taylors, South Carolina", key: "4571395", seed: "office-hours-a" },
  { name: "Kandiyohi, Minnesota", key: "2732372", seed: "office-hours-f" },
  { name: "Donnelly, Idaho", key: "1622330", seed: "office-hours-c" },
] as const;
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

it.each(PLACES)(
  "an office-hours reply settles the resident's case through the cases engine in $name",
  (place) => {
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    setBookkeeping(false);
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
    expect(
      visits.length,
      `${where}: no resident brought a problem to an official in ${DAYS} days`,
    ).toBeGreaterThan(0);
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
    expect(
      helped + declined + left,
      `${where}: no reply was played`,
    ).toBeGreaterThan(0);
    expect(
      helped,
      `${where}: no visit offered a reply that helps`,
    ).toBeGreaterThan(0);
  },
  600_000,
);
