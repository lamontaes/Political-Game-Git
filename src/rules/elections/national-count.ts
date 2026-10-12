import type { EntityId } from "../../simulation/types";
import type {
  NationalElectionRecord,
  NationalElection,
  NationalUnitResult,
} from "../../simulation/national-election-types";
import type { nationalElectionRules } from "../../simulation/national-election-rules";
export interface NationalCountFacts {
  readonly election: NationalElection;
  readonly records: readonly NationalElectionRecord[];
  readonly units: ReturnType<typeof nationalElectionRules>["units"];
}
export function nationalAllocation(
  facts: NationalCountFacts,
  electionId: EntityId,
) {
  const records = facts.records.filter(
    (record) => record.electionId === electionId,
  );
  const units = facts.units.map((unit) => {
    const result = records.find(
      (record): record is NationalUnitResult =>
        record.kind === "unit-result" && record.unitKey === unit.key,
    );
    const certification = result
      ? records.find(
          (record) =>
            record.kind === "certification" && record.resultId === result.id,
        )
      : null;
    const winnerPersonId =
      certification?.kind === "certification"
        ? certification.allocationWinnerPersonId
        : (result?.allocationWinnerPersonId ?? null);
    const status = !result
      ? "missing-result"
      : !certification
        ? "uncertified"
        : certification.kind === "certification" &&
            certification.disposition === "contested"
          ? "contested"
          : !winnerPersonId
            ? "unresolved-winner"
            : "allocated";
    return { ...unit, resultId: result?.id ?? null, winnerPersonId, status };
  });
  const electors = units
    .filter((unit) => unit.status === "allocated")
    .flatMap((unit) =>
      Array.from({ length: unit.electors }, (_, i) => ({
        key: `${unit.key}:${i + 1}`,
        state: unit.state,
        allocatedTicketPresidentId: unit.winnerPersonId!,
      })),
    );
  return {
    units,
    electors,
    complete: units.every((unit) => unit.status === "allocated"),
  };
}

function ballotTotals(
  facts: NationalCountFacts,
  electionId: EntityId,
  office: "president" | "vice-president",
) {
  const ids = facts.election.tickets.map((ticket) =>
    office === "president"
      ? ticket.presidentPersonId
      : ticket.vicePresidentPersonId,
  );
  return ids.map((personId) => ({
    personId,
    votes: facts.records
      .filter((record) => record.electionId === electionId)
      .filter(
        (record) =>
          record.kind === "ballot" &&
          record.disposition === "accepted" &&
          (office === "president"
            ? record.presidentPersonId
            : record.vicePresidentPersonId) === personId,
      ).length,
  }));
}

export function nationalCountProposal(
  facts: NationalCountFacts,
  electionId: EntityId,
) {
  const allocation = nationalAllocation(facts, electionId);
  const ballots = facts.records
    .filter((record) => record.electionId === electionId)
    .filter((record) => record.kind === "ballot");
  const missingElectorKeys = allocation.electors
    .filter(
      (elector) =>
        !ballots.some(
          (ballot) =>
            ballot.kind === "ballot" && ballot.electorKey === elector.key,
        ),
    )
    .map((elector) => elector.key);
  const objections = ballots.some(
    (ballot) => ballot.kind === "ballot" && ballot.disposition === "contested",
  );
  const majority = Math.floor(allocation.electors.length / 2) + 1;
  const presidentTotals = ballotTotals(facts, electionId, "president");
  const vicePresidentTotals = ballotTotals(facts, electionId, "vice-president");
  return {
    ready: allocation.complete && !missingElectorKeys.length && !objections,
    majority,
    appointedElectors: allocation.electors.length,
    missingElectorKeys,
    objections,
    presidentTotals,
    vicePresidentTotals,
    presidentPersonId:
      presidentTotals.find((total) => total.votes >= majority)?.personId ??
      null,
    vicePresidentPersonId:
      vicePresidentTotals.find((total) => total.votes >= majority)?.personId ??
      null,
    ballotIds: ballots.map((record) => record.id),
  };
}

export function constitutionalChoiceList(
  facts: NationalCountFacts,
  electionId: EntityId,
  office: "president" | "vice-president",
): readonly EntityId[] {
  const proposal = nationalCountProposal(facts, electionId);
  if (
    (office === "president"
      ? proposal.presidentPersonId
      : proposal.vicePresidentPersonId) !== null
  )
    return [];
  const totals = ballotTotals(facts, electionId, office)
    .filter((total) => total.votes > 0)
    .sort((a, b) => b.votes - a.votes);
  const limit = office === "president" ? 3 : 2;
  if (
    totals.length > limit &&
    totals[limit]!.votes === totals[limit - 1]!.votes
  )
    return [];
  return totals.slice(0, limit).map((total) => total.personId);
}

/** Rule-math dependency of the contingent-choice record writer. */
export function contingentChoice(
  wholeNumber: number,
  candidates: readonly EntityId[],
  votes: readonly { readonly candidatePersonId: EntityId | null }[],
): EntityId | null {
  const quorum = Math.ceil((wholeNumber * 2) / 3);
  return votes.length >= quorum
    ? (candidates.find(
        (id) =>
          votes.filter((vote) => vote.candidatePersonId === id).length >
          wholeNumber / 2,
      ) ?? null)
    : null;
}
