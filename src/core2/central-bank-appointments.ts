/**
 * The central bank's seats turn over on their real dates. A governor's
 * 14-year term ends every second January and the seat goes to a new
 * appointee (a full term can't be renewed, 12 U.S.C. 242); a reserve bank
 * president is reappointed every five years until the System's retirement
 * age. The appointer chooses among seeded candidates: the president with the
 * Senate's consent (`board-appointer.ts`, registered with
 * `registerBoardAppointer` when the government opens). A world with no
 * appointer leaves each member in place until a successor is named.
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

function ageOn(birthDate: string, date: string): number {
  return (
    Number(date.slice(0, 4)) -
    Number(birthDate.slice(0, 4)) -
    (date.slice(5) < birthDate.slice(5) ? 1 : 0)
  );
}

/** Every seat whose term ended by today gets its next term: a reappointment or a new member. */
export function reviewBoardTerms(
  api: CoreAPI,
  members: ModuleTable,
  p: MacroParameter,
  source: Source,
): void {
  const core = api.state as CoreState;
  for (;;) {
    const sitting = members.query("all", [true]) as unknown as BoardMember[];
    const ended = sitting
      .filter((row) => row.termEndsAt < core.date)
      .sort((a, b) => a.termEndsAt.localeCompare(b.termEndsAt))[0];
    if (!ended) return;
    const vacancy = nextTerm(ended, p);
    const incumbent = core.people.get(ended.personId);
    const stays =
      ended.seatKind === "president" &&
      incumbent?.alive === true &&
      ageOn(incumbent.birthDate, vacancy.termStartsAt) <
        p("macroPresidentRetirementAge");
    let next: BoardMember;
    let reasons: Readonly<Record<string, number>> = {};
    if (stays) {
      next = {
        ...ended,
        appointedAt: vacancy.termStartsAt,
        termEndsAt: vacancy.termEndsAt,
      };
    } else {
      const candidates = boardCandidates(core.seed, vacancy, p);
      const others = sitting.filter((row) => row.id !== ended.id);
      const pick = appointer?.(api, vacancy, candidates, others);
      // No one confirmed: the member stays on until a successor is (the Federal Reserve Act's holdover).
      if (!pick) {
        members.put({
          ...ended,
          termEndsAt: vacancy.termStartsAt,
          isMember: true,
        } as unknown as { id: string });
        return;
      }
      reasons = pick.reasons;
      const chosen = candidates[pick.index]!;
      const person = fillInIdentity(core, chosen.identity);
      next = {
        ...ended,
        personId: person.id,
        appointedAt: vacancy.termStartsAt,
        termEndsAt: vacancy.termEndsAt,
        career: chosen.career,
        experiencedInflationPct: chosen.experiencedInflationPct,
        source: chosen.identity.source,
      };
    }
    const board = withLeans(
      [...sitting.filter((row) => row.id !== ended.id), next],
      p,
    );
    for (const row of board)
      members.put({ ...row, isMember: true } as unknown as { id: string });
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
        reappointed: stays ? "yes" : "no",
        termEndsAt: next.termEndsAt,
        ...Object.fromEntries(
          Object.entries(reasons).map(([key, value]) => [key, String(value)]),
        ),
      },
    });
  }
}
