import {
  compareSimulationMoments,
  nationalElectionRules,
  nationalAllocation,
  nationalCountProposal,
  nationalOutcome,
  nationalRecords,
  nationalOfficeHolder,
  requireNationalElection,
  personName,
  NATIONAL_ELECTION_SOURCES,
} from "../simulation";
import type { EntityId, World } from "../simulation";

/** Public recorded result counts only. No support metric, forecast or media call is synthesized. */
export function projectNationalElectionResults(
  world: World,
  electionId: EntityId,
) {
  const election = requireNationalElection(world, electionId);
  const records = nationalRecords(world, electionId);
  const allocation = nationalAllocation(world, electionId);
  const count = records.find((record) => record.kind === "count");
  const ballots = nationalCountProposal(world, electionId);
  const tickets = election.tickets.map((ticket) => ({
    ...ticket,
    presidentName: personName(world.people[ticket.presidentPersonId]!),
    vicePresidentName: personName(world.people[ticket.vicePresidentPersonId]!),
    popularVotes: records
      .filter(
        (record) =>
          record.kind === "unit-result" && !record.unitKey.includes("-"),
      )
      .reduce(
        (sum, record) =>
          sum +
          (record.kind === "unit-result"
            ? (record.tallies.find(
                (tally) => tally.candidatePersonId === ticket.presidentPersonId,
              )?.votes ?? 0)
            : 0),
        0,
      ),
    allocatedElectors: allocation.electors.filter(
      (elector) =>
        elector.allocatedTicketPresidentId === ticket.presidentPersonId,
    ).length,
    recordedPresidentialBallots:
      ballots.presidentTotals.find(
        (total) => total.personId === ticket.presidentPersonId,
      )?.votes ?? 0,
    countedPresidentialBallots:
      count?.kind === "count"
        ? (ballots.presidentTotals.find(
            (total) => total.personId === ticket.presidentPersonId,
          )?.votes ?? 0)
        : null,
    countedVicePresidentialBallots:
      count?.kind === "count"
        ? (ballots.vicePresidentTotals.find(
            (total) => total.personId === ticket.vicePresidentPersonId,
          )?.votes ?? 0)
        : null,
  }));
  const outcome = (office: "president" | "vice-president") => {
    const chosen = nationalOutcome(world, electionId, office);
    const holder = nationalOfficeHolder(world, office);
    const termEnded =
      compareSimulationMoments(
        world.currentMoment,
        nationalElectionRules(election.cycle).endsAt,
      ) >= 0;
    return {
      chosenName: chosen ? personName(world.people[chosen.personId]!) : null,
      possessionName: holder
        ? personName(world.people[holder.plan.personId]!)
        : null,
      state: !count
        ? "Awaiting congressional count"
        : !chosen
          ? `Awaiting ${office === "president" ? "House state-delegation" : "Senate individual-member"} contingent choice`
          : termEnded
            ? "Chosen; term period ended"
            : !holder || holder.plan.electionId !== electionId
              ? "Chosen; office entry pending"
              : "In office",
    };
  };
  return {
    electionId,
    cycle: election.cycle,
    ruleVersion: election.ruleVersion,
    tickets,
    units: allocation.units,
    popularComplete: allocation.units
      .filter((unit) => unit.countsPopular)
      .every((unit) => unit.resultId !== null),
    mediaProjection: null,
    countRecorded: !!count,
    countReady: ballots.ready,
    president: outcome("president"),
    vicePresident: outcome("vice-president"),
    sources: NATIONAL_ELECTION_SOURCES,
  };
}
