// STOPGAP RULES3-GOV-045: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/office-continuity.ts :: statutoryPresidentialSuccessor.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 1051: !congress */
export function statutoryPresidentialSuccessorRule1(facts: {
  readonly congress: unknown;
}) {
  return !facts.congress;
}

/** Legacy line 1069: seat.occupant.kind !== "member" */
export function statutoryPresidentialSuccessorRule2(facts: {
  readonly seatOccupantKind: string;
}) {
  return facts.seatOccupantKind !== "member";
}

/** Legacy line 1071: member.caucusOrganizationId ?? member.partyOrganizationId */
export function statutoryPresidentialSuccessorRule3(facts: {
  readonly memberCaucusOrganizationId: string | null;
  readonly memberPartyOrganizationId: string | null;
}) {
  return facts.memberCaucusOrganizationId! ?? facts.memberPartyOrganizationId!;
}

/** Legacy line 1072: caucus         ? [             {               seatKey: seat.seatKey,               personId: member.personId,               party: caucus,               serviceSince: member.serviceSince ?? member.startedAt ?? null,             },           ]        */
export function statutoryPresidentialSuccessorRule4(facts: {
  readonly caucus: string | null;
  readonly seatKeySeatSeatKeyPersonIdMemberPersonIdPartyCaucusServiceSi: unknown[];
}) {
  return facts.caucus!
    ? facts.seatKeySeatSeatKeyPersonIdMemberPersonIdPartyCaucusServiceSi
    : [];
}

/** Legacy line 1083: sitting.length === 0 */
export function statutoryPresidentialSuccessorRule5(facts: {
  readonly sittingLength: number;
}) {
  return facts.sittingLength === 0;
}

/** Legacy line 1098: row.personId === elected.election.winnerPersonId */
export function statutoryPresidentialSuccessorRule6(facts: {
  readonly rowPersonId: string;
  readonly electedElectionWinnerPersonId: string | null;
}) {
  return facts.rowPersonId === facts.electedElectionWinnerPersonId!;
}

/** Legacy line 1100: holder       ? congressSeats().find(           (candidate) => candidate.seatKey === holder.seatKey,         )       : undefined */
export function statutoryPresidentialSuccessorRule7(facts: {
  readonly holder: unknown;
  readonly congressSeatsFindCandidateCandidateSeatKeyHolderSeatKey: unknown;
}) {
  return facts.holder
    ? facts.congressSeatsFindCandidateCandidateSeatKeyHolderSeatKey
    : undefined;
}

/** Legacy line 1102: candidate.seatKey === holder.seatKey */
export function statutoryPresidentialSuccessorRule8(facts: {
  readonly candidateSeatKey: string;
  readonly holderSeatKey: string;
}) {
  return facts.candidateSeatKey === facts.holderSeatKey;
}

/** Legacy line 1105: holder && seat */
export function statutoryPresidentialSuccessorRule9(facts: {
  readonly holder: unknown;
  readonly seat: unknown;
}) {
  return facts.holder && facts.seat;
}
