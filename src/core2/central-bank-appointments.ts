/**
 * The central bank's seats turn over on their real dates. A governor's
 * 14-year term ends every second January (a full term cannot be renewed,
 * 12 U.S.C. 242); Reserve Bank presidents have five-year terms.
 * The appointer chooses among seeded candidates: the president with the
 * Senate's consent for governors, or Class B/C directors with Board approval
 * for Reserve Bank presidents. Without an appointment, governors hold over
 * and expired Reserve Bank presidencies are vacant (12 U.S.C. 242, 341).
 */
import {
  boardCandidates,
  nextTerm,
  withLeans,
  type BoardCandidate,
  type BoardMember,
  type BoardVacancy,
} from "./central-bank-board";
import type { MacroParameter } from "./macro-model";
import type { ModuleTable } from "./module-state";
import { fillInIdentity } from "./state";
import type { CoreAPI, CoreState, Source } from "./types";

/** Picks one of the candidates and gives its reasons; nothing when no one is confirmed. */
export type BoardAppointer = (
  api: CoreAPI,
  vacancy: BoardVacancy,
  candidates: readonly BoardCandidate[],
  sitting: readonly BoardMember[],
) => { index: number; reasons: Readonly<Record<string, number>> } | undefined;
let appointer: BoardAppointer | undefined;

export function registerBoardAppointer(next: BoardAppointer | undefined): void {
  appointer = next;
}

/** Expired seats await an actual appointment; only living governors may hold over. */
export function reviewBoardTerms(
  api: CoreAPI,
  members: ModuleTable,
  p: MacroParameter,
  source: Source,
): void {
  const core = api.state as CoreState;
  // Each expired seat is considered once this month. A rejected nomination
  // must not extend its statutory term or prevent other seats being heard.
  const expired = (
    members.rows() as unknown as (BoardMember & {
      isMember: boolean;
      vacant?: boolean;
      holdoverSince?: string;
    })[]
  )
    .filter((row) => (row.isMember || row.vacant) && row.termEndsAt < core.date)
    .sort(
      (a, b) =>
        a.termEndsAt.localeCompare(b.termEndsAt) || a.id.localeCompare(b.id),
    );
  for (const ended of expired) {
    const sitting = members.query("all", [true]) as unknown as BoardMember[];
    let vacancy = nextTerm(ended, p);
    while (vacancy.termEndsAt < core.date)
      vacancy = nextTerm({ ...ended, termEndsAt: vacancy.termEndsAt }, p);
    const candidates = appointer ? boardCandidates(core.seed, vacancy, p) : [];
    const others = sitting.filter((row) => row.id !== ended.id);
    const pick = appointer?.(api, vacancy, candidates, others);
    if (!pick) {
      // stopgapId: SG-WORLD-board-appointment-records
      api.stopgap("SG-WORLD-board-appointment-records");
      const holds =
        ended.seatKind === "governor" &&
        core.people.get(ended.personId)?.alive === true;
      const alreadyRecorded = holds
        ? ended.holdoverSince !== undefined
        : ended.vacant === true;
      members.put({
        ...ended,
        isMember: holds,
        vacant: !holds,
        ...(holds ? { holdoverSince: ended.holdoverSince ?? core.date } : {}),
      } as unknown as { id: string });
      if (!alreadyRecorded) {
        for (const row of holds ? [] : withLeans(others, p))
          members.put({ ...row, isMember: true } as unknown as { id: string });
        api.emit({
          id: `event:economy.board-${holds ? "holdover" : "vacancy"}:${core.date}:${ended.seatId}`,
          date: core.date,
          kind: holds ? "economy.board-holdover" : "economy.board-vacancy",
          personIds: [ended.personId],
          placeId: core.people.get(ended.personId)!.placeId,
          source,
          publicRecord: true,
          topic: ended.seatId,
          facts: {
            seatId: ended.seatId,
            termEndsAt: ended.termEndsAt,
            reason: "no-confirmed-appointment",
          },
        });
      }
      continue;
    }
    {
      const reasons = pick.reasons;
      const chosen = candidates[pick.index]!;
      const person = fillInIdentity(core, chosen.identity);
      const next: BoardMember & { holdoverSince?: string } = {
        ...ended,
        personId: person.id,
        appointedAt: core.date,
        termEndsAt: vacancy.termEndsAt,
        career: chosen.career,
        experiencedInflationPct: chosen.experiencedInflationPct,
        source: chosen.identity.source,
      };
      delete next.holdoverSince;
      const board = withLeans(
        [...sitting.filter((row) => row.id !== ended.id), next],
        p,
      );
      for (const row of board)
        members.put({ ...row, isMember: true, vacant: false } as unknown as {
          id: string;
        });
      api.emit({
        id: `event:economy.board-appointment:${core.date}:${ended.seatId}`,
        date: core.date,
        kind: "economy.board-appointment",
        personIds: [next.personId],
        placeId: core.people.get(next.personId)!.placeId,
        source,
        publicRecord: true,
        topic: ended.seatId,
        facts: {
          seatId: ended.seatId,
          reappointed: next.personId === ended.personId ? "yes" : "no",
          termEndsAt: next.termEndsAt,
          ...Object.fromEntries(
            Object.entries(reasons).map(([key, value]) => [key, String(value)]),
          ),
        },
      });
    }
  }
}
