import type { EntityId } from "../../simulation/types";
import type {
  NationalElection,
  NationalElectionRecord,
  NationalElectoralCount,
  PresidentialTicket,
} from "../../simulation/national-election-types";
import type { nationalElectionRules } from "../../simulation/national-election-rules";
import type { CalibrationRow } from "../../simulation/world-setup/political-start";
import { applySwing } from "./electorate";
export function roundTo(value: number, places = 6): number {
  const factor = 10 ** places;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}
export interface PresidentialCountFacts {
  readonly election: NationalElection | null;
  readonly units: ReturnType<typeof nationalElectionRules>["units"];
  readonly records: readonly NationalElectionRecord[];
  readonly calibration: readonly CalibrationRow[];
  readonly mood: number;
  readonly policy: Parameters<typeof applySwing>[0];
}
export function presidentialElectionResults(facts: PresidentialCountFacts) {
  const election = facts.election;
  if (!election) return null;
  const [democratic, republican] = election.tickets;
  const stateResults = new Map<string, { share: number; total: number }>();
  const writes = [];
  for (const unit of facts.units) {
    if (
      facts.records.some(
        (record) =>
          record.kind === "unit-result" && record.unitKey === unit.key,
      )
    )
      continue;
    if (!stateResults.has(unit.state)) {
      const row = facts.calibration.find(
        (row) => row.contestKey === `us-president:${unit.state}`,
      );
      stateResults.set(unit.state, {
        share: roundTo(
          applySwing(
            facts.policy,
            row?.democraticTwoPartyShare ?? 0.5,
            facts.mood * 100,
          ),
        ),
        total: row?.totalVotes ?? 0,
      });
    }
    const { share, total } = stateResults.get(unit.state)!;
    const democraticVotes = Math.round(total * share);
    const republicanVotes = total - democraticVotes;
    const winner =
      democraticVotes > republicanVotes
        ? democratic!.presidentPersonId
        : democraticVotes < republicanVotes
          ? republican!.presidentPersonId
          : null;
    writes.push({
      unitKey: unit.key,
      tallies: [
        {
          candidatePersonId: democratic!.presidentPersonId,
          votes: democraticVotes,
        },
        {
          candidatePersonId: republican!.presidentPersonId,
          votes: republicanVotes,
        },
      ],
      allocationWinnerPersonId: winner,
    });
  }
  const carried = new Map<EntityId, number>();
  for (const unit of facts.units) {
    const result = facts.records.find(
      (record) => record.kind === "unit-result" && record.unitKey === unit.key,
    );
    const winner =
      result?.kind === "unit-result"
        ? result.allocationWinnerPersonId
        : writes.find((row) => row.unitKey === unit.key)
            ?.allocationWinnerPersonId;
    if (winner) carried.set(winner, (carried.get(winner) ?? 0) + unit.electors);
  }
  return {
    writes,
    carried: election.tickets
      .map((ticket) => ({
        personId: ticket.presidentPersonId,
        electors: carried.get(ticket.presidentPersonId) ?? 0,
      }))
      .sort((a, b) => b.electors - a.electors),
  };
}
export function contingentVote(
  organizationId: EntityId | null,
  majorPartyIds: readonly EntityId[],
  candidates: readonly EntityId[],
  nomineeOf: (ticket: PresidentialTicket) => EntityId,
  election: NationalElection,
): EntityId | null {
  const index = majorPartyIds.findIndex((id) => id === organizationId);
  const ticket = index < 0 ? undefined : election.tickets[index];
  const nominee = ticket ? nomineeOf(ticket) : null;
  return nominee && candidates.includes(nominee) ? nominee : null;
}
export function contingentElectionVotes(facts: {
  readonly count: NationalElectoralCount | null;
  readonly held: ReadonlySet<string>;
  readonly states: readonly string[];
  readonly house: readonly {
    readonly stateUsps: string;
    readonly personId: EntityId;
  }[];
  readonly senators: readonly EntityId[];
  readonly partyIds: ReadonlyMap<EntityId, EntityId | null>;
  readonly majorPartyIds: readonly EntityId[];
  readonly election: NationalElection;
}) {
  const count = facts.count;
  if (!count) return [];
  const writes = [];
  if (
    !count.presidentPersonId &&
    count.presidentialChoicePersonIds.length &&
    !facts.held.has("president")
  ) {
    const candidates = count.presidentialChoicePersonIds;
    const votes = [];
    for (const state of facts.states) {
      const members = facts.house
        .filter((seat) => seat.stateUsps === state)
        .map((seat) => seat.personId);
      if (!members.length) continue;
      const tally = new Map<EntityId, number>();
      for (const person of members) {
        const choice = contingentVote(
          facts.partyIds.get(person) ?? null,
          facts.majorPartyIds,
          candidates,
          (ticket) => ticket.presidentPersonId,
          facts.election,
        );
        if (choice) tally.set(choice, (tally.get(choice) ?? 0) + 1);
      }
      const ranked = [...tally].sort((a, b) => b[1] - a[1]);
      votes.push({
        voterKey: state,
        candidatePersonId:
          ranked.length &&
          (ranked.length === 1 || ranked[0]![1] > ranked[1]![1])
            ? ranked[0]![0]
            : null,
      });
    }
    writes.push({
      office: "president" as const,
      votes,
      wholeNumber: facts.states.length,
      senatorPersonIds: [] as EntityId[],
    });
  }
  if (
    !count.vicePresidentPersonId &&
    count.vicePresidentialChoicePersonIds.length &&
    !facts.held.has("vice-president")
  ) {
    const candidates = count.vicePresidentialChoicePersonIds;
    const votes = facts.senators.map((personId) => ({
      voterKey: personId,
      candidatePersonId: contingentVote(
        facts.partyIds.get(personId) ?? null,
        facts.majorPartyIds,
        candidates,
        (ticket) => ticket.vicePresidentPersonId,
        facts.election,
      ),
    }));
    writes.push({
      office: "vice-president" as const,
      votes,
      wholeNumber: facts.states.length * 2,
      senatorPersonIds: facts.senators,
    });
  }
  return writes;
}

// stopgapId: "SG-P14-elections-presidential-district-proxy"

// stopgapId: "SG-P14-elections-contingent-party-and-state-proxy"
