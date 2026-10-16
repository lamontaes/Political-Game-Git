/**
 * Who fills a central bank seat when a term ends. A governor is named by the
 * president from the candidates put forward and confirmed by the Senate
 * (12 U.S.C. 242); a reserve bank president is chosen by the bank and
 * approved by the Board of Governors (12 U.S.C. 341), read here as the
 * sitting governors choosing and approving. The ranking is `nominateAndConfirm`'s:
 * alignment with the appointer's side, qualification and acquaintance, and
 * each confirming member votes on where the nominee sits against their own
 * side. Nobody is picked by closeness to the board's middle.
 */
import boardData from "./data/macro/board.json" with { type: "json" };
import { nominateAndConfirm, partySide } from "./appointments";
import { campaignParameter } from "./campaign-views";
import {
  inflationLeans,
  type BoardCandidate,
  type BoardMember,
  type BoardVacancy,
} from "./central-bank-board";
import { type BoardAppointer } from "./central-bank-appointments";
import { FEDERAL_SENATE, members } from "./modules/legislature";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import type { MacroParameter } from "./macro-model";
import type { CoreAPI } from "./types";

const PRESIDENT_SEAT = "seat:US:president";
const QUALIFICATION = boardData.careerQualification.values as Record<
  string,
  number
>;

/** The president in office, if the world has offices and one is serving. */
function servingPresident(api: CoreAPI): TermRow | undefined {
  if (!api.state.modules.has(OFFICES_MODULE_ID)) return undefined;
  const term = api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .query("bySeatStatus", [PRESIDENT_SEAT, "serving"])[0] as unknown as
    TermRow | undefined;
  return term?.personId ? term : undefined;
}

export const boardAppointer: BoardAppointer = (
  api,
  vacancy: BoardVacancy,
  candidates: readonly BoardCandidate[],
  sitting: readonly BoardMember[],
) => {
  const p: MacroParameter = (key) => api.parameter(key);
  // A candidate's place on the scale: lived inflation against the board's own
  // spread, hawkish positive (the Republican side).
  // stopgapId: SG-WORLD-board-hawk-side
  api.stopgap("SG-WORLD-board-hawk-side");
  const leans = inflationLeans(
    [...sitting, ...candidates].map((row) => row.experiencedInflationPct),
    p,
  );
  const lean = new Map(
    candidates.map((c, i) => [c.identity.id, leans[sitting.length + i]!]),
  );
  const governor = vacancy.seatKind === "governor";
  let appointerSide: number;
  let body: { name: string; sides: readonly number[] };
  if (governor) {
    const president = servingPresident(api);
    // No president in office, or no Senate: nobody can name the member.
    if (!president) return undefined;
    const senate = members(api, FEDERAL_SENATE);
    if (!senate.length) return undefined;
    appointerSide = partySide(president.party);
    body = {
      name: FEDERAL_SENATE,
      sides: senate.map((t) => partySide(t.party)),
    };
  } else {
    // The sitting governors choose and approve a reserve bank's president.
    const board = sitting.filter((row) => row.seatKind === "governor");
    if (!board.length) return undefined;
    const middle =
      board.reduce((n, row) => n + row.inflationLean, p("zero")) / board.length;
    appointerSide = middle;
    body = {
      name: "board-of-governors",
      sides: board.map((row) => Math.sign(row.inflationLean)),
    };
  }
  // stopgapId: SG-WORLD-board-career-qualification
  api.stopgap("SG-WORLD-board-career-qualification");
  const result = nominateAndConfirm({
    seatKey: vacancy.seatId,
    appointerSide,
    candidates: candidates.map((c) => ({
      id: c.identity.id,
      lean: lean.get(c.identity.id)!,
      qualification: QUALIFICATION[c.career] ?? p("zero"),
      // Seeded candidates are not yet anyone's acquaintance.
      known: false,
    })),
    confirmingBody: body,
    tolerance: campaignParameter("confirmationTolerance"),
  });
  if (!result.nomineeId) return undefined;
  const index = candidates.findIndex((c) => c.identity.id === result.nomineeId);
  const choice = result.reasons.find(
    (r) => r.candidateId === result.nomineeId,
  )!;
  return {
    index,
    reasons: {
      alignment: choice.alignment,
      qualification: choice.qualification,
      acquaintance: choice.acquaintance,
      total: choice.total,
      confirmYes: result.confirmation?.yes ?? 0,
      confirmNo: result.confirmation?.no ?? 0,
    },
  };
};
