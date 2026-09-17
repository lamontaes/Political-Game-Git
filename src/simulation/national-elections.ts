import { nationalOfficeRef } from "./national-election-offices";
import {
  NATIONAL_ELECTION_JURISDICTION,
  nationalUnitJurisdiction,
} from "./national-election-geography";
import { validateTimeDemand } from "./life";
import { compareSimulationMoments, makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import {
  nationalElectionRules,
  NATIONAL_ALLOCATION_VERSION,
  CONTINGENT_STATES,
} from "./national-election-rules";
import type {
  NationalElection,
  NationalElectionRecord,
  NationalUnitResult,
  NationalElectoralCount,
  NationalContingentChoice,
} from "./national-election-types";
import type { EntityId, World, ElectionContestProvenance } from "./types";
import { isPersonAliveAt } from "./vitality-integrity";

export function nationalRecords(
  world: World,
  electionId?: EntityId,
): readonly NationalElectionRecord[] {
  return (world.history.nationalElectionRecords ?? []).filter(
    (record) => !electionId || record.electionId === electionId,
  );
}
export function requireNationalElection(
  world: World,
  id: EntityId,
): NationalElection {
  const election = (world.history.nationalElections ?? []).find(
    (record) => record.id === id,
  );
  if (!election) throw new Error("National election not found.");
  return election;
}
export function nationalEntityAvailableAt(
  world: World,
  id: EntityId,
  date: string,
  sequence: number,
): boolean {
  const record = nationalHistoryRecords(world).find(
    (record) => record.id === id,
  );
  return !!record && record.recordedAt <= date && record.sequence < sequence;
}
export function nationalEntityExists(world: World, id: EntityId): boolean {
  return nationalHistoryRecords(world).some((record) => record.id === id);
}
export function nationalHistoryRecords(world: World) {
  return [
    ...(world.history.nationalElections ?? []),
    ...nationalRecords(world),
  ];
}
function note(value: string, label: string) {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${label} must be explicit.`);
}
function validateProvenance(
  world: World,
  provenance: ElectionContestProvenance,
  sequence: number,
) {
  if (
    !provenance ||
    !["authored", "manual", "simulated"].includes(provenance.method)
  )
    throw new Error("Invalid national provenance.");
  note(provenance.note ?? "", "National provenance note");
  for (const id of provenance.sourceEntityIds) {
    const record = [
      ...nationalHistoryRecords(world),
      ...(world.history.electionContests ?? []),
      ...(world.history.electionContestResults ?? []),
      ...world.history.events,
    ].find((record) => record.id === id);
    if (id === world.id || world.people[id] || world.jurisdictions[id])
      continue;
    if (!record || record.sequence >= sequence)
      throw new Error("National provenance references unavailable source.");
    const date =
      "recordedAt" in record
        ? record.recordedAt
        : "resolvedAt" in record
          ? record.resolvedAt
          : record.scheduledAt;
    if (date > world.currentDate)
      throw new Error("National provenance references future source.");
  }
}
export function registerNationalElection(
  world: World,
  input: Omit<
    NationalElection,
    "id" | "sequence" | "recordedAt" | "ruleVersion"
  >,
): World {
  nationalElectionRules(input.cycle);
  note(input.stableKey, "Election stable key");
  if (
    input.jurisdictionId !== NATIONAL_ELECTION_JURISDICTION.id ||
    !world.jurisdictions[input.jurisdictionId]
  )
    throw new Error("Missing national jurisdiction.");
  if (
    (world.history.nationalElections ?? []).some(
      (record) =>
        record.stableKey === input.stableKey || record.cycle === input.cycle,
    )
  )
    throw new Error("National election already registered for this cycle.");
  if (!input.tickets.length)
    throw new Error("National election needs declared tickets.");
  const people = input.tickets.flatMap((ticket) => [
    ticket.presidentPersonId,
    ticket.vicePresidentPersonId,
  ]);
  if (
    new Set(people).size !== people.length ||
    people.some((id) => !world.people[id])
  )
    throw new Error("Ticket people must exist and be distinct.");
  for (const ticket of input.tickets) {
    if (
      ![ticket.presidentState, ticket.vicePresidentState].every((state) =>
        nationalElectionRules(input.cycle).units.some(
          (unit) => unit.countsPopular && unit.state === state,
        ),
      )
    )
      throw new Error("Ticket residence state must be explicit and supported.");
  }
  validateProvenance(world, input.provenance, world.history.nextSequence);
  const election: NationalElection = {
    ...structuredClone(input),
    id: createStableId("national-election", `${world.id}:${input.stableKey}`),
    sequence: world.history.nextSequence,
    recordedAt: world.currentDate,
    ruleVersion: NATIONAL_ALLOCATION_VERSION,
  };
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      nationalElections: [...(world.history.nationalElections ?? []), election],
    },
  };
}
export type NationalRecordInput = NationalElectionRecord extends infer R
  ? R extends NationalElectionRecord
    ? Omit<R, "id" | "sequence" | "recordedAt">
    : never
  : never;
/** All mutations validate against prior canonical records, then append atomically. */
export function appendNationalRecord(
  world: World,
  input: NationalRecordInput,
): World {
  const record = {
    ...structuredClone(input),
    id: createStableId(
      "national-election-record",
      `${world.id}:${input.stableKey}`,
    ),
    sequence: world.history.nextSequence,
    recordedAt: world.currentDate,
  } as NationalElectionRecord;
  validateNationalRecord(world, record);
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      nationalElectionRecords: [...nationalRecords(world), record],
    },
  };
}
function priorRecord(world: World, id: EntityId, electionId: EntityId) {
  const record = nationalRecords(world, electionId).find(
    (record) => record.id === id,
  );
  if (!record) throw new Error("Missing prior national record.");
  return record;
}
export function nationalAllocation(world: World, electionId: EntityId) {
  const election = requireNationalElection(world, electionId);
  const records = nationalRecords(world, electionId);
  const units = nationalElectionRules(election.cycle).units.map((unit) => {
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
  world: World,
  electionId: EntityId,
  office: "president" | "vice-president",
) {
  const ids = requireNationalElection(world, electionId).tickets.map(
    (ticket) =>
      office === "president"
        ? ticket.presidentPersonId
        : ticket.vicePresidentPersonId,
  );
  return ids.map((personId) => ({
    personId,
    votes: nationalRecords(world, electionId).filter(
      (record) =>
        record.kind === "ballot" &&
        record.disposition === "accepted" &&
        (office === "president"
          ? record.presidentPersonId
          : record.vicePresidentPersonId) === personId,
    ).length,
  }));
}
export function nationalCountProposal(world: World, electionId: EntityId) {
  const allocation = nationalAllocation(world, electionId);
  const ballots = nationalRecords(world, electionId).filter(
    (record) => record.kind === "ballot",
  );
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
  const presidentTotals = ballotTotals(world, electionId, "president");
  const vicePresidentTotals = ballotTotals(world, electionId, "vice-president");
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
export function recordNationalCount(
  world: World,
  input: {
    stableKey: string;
    electionId: EntityId;
    provenance: ElectionContestProvenance;
    presidentialChoicePersonIds?: readonly EntityId[];
    vicePresidentialChoicePersonIds?: readonly EntityId[];
  },
): World {
  const proposal = nationalCountProposal(world, input.electionId);
  if (!proposal.ready)
    throw new Error(
      "Electoral count pending: missing certification, unresolved allocation, ballots or objections.",
    );
  return appendNationalRecord(world, {
    ...input,
    kind: "count",
    ballotIds: proposal.ballotIds,
    appointedElectors: proposal.appointedElectors,
    presidentialChoicePersonIds: input.presidentialChoicePersonIds ?? [],
    vicePresidentialChoicePersonIds:
      input.vicePresidentialChoicePersonIds ?? [],
    presidentPersonId: proposal.presidentPersonId,
    vicePresidentPersonId: proposal.vicePresidentPersonId,
  });
}
/** The count receiver supplies the lawful choice list. Missing/adjudicated ties stay pending. */
export function contingentCandidates(
  world: World,
  electionId: EntityId,
  office: "president" | "vice-president",
) {
  const count = nationalRecords(world, electionId).find(
    (record) => record.kind === "count",
  );
  if (count?.kind !== "count")
    throw new Error("Contingent election requires a recorded count.");
  const candidates =
    office === "president"
      ? count.presidentialChoicePersonIds
      : count.vicePresidentialChoicePersonIds;
  if (!candidates.length)
    throw new Error(
      "Contingent choice list is pending its constitutional count receiver.",
    );
  return candidates;
}
function validateChoiceList(
  world: World,
  electionId: EntityId,
  office: "president" | "vice-president",
  candidates: readonly EntityId[],
  elected: EntityId | null,
) {
  const totals = ballotTotals(world, electionId, office).filter(
    (total) => total.votes > 0,
  );
  if (elected && candidates.length)
    throw new Error("An electoral majority does not use a contingent list.");
  if (!candidates.length) return; // lawful cutoff receiver may remain pending
  const limit = office === "president" ? 3 : 2;
  if (
    new Set(candidates).size !== candidates.length ||
    candidates.length !== Math.min(limit, totals.length) ||
    candidates.some((id) => !totals.some((total) => total.personId === id))
  )
    throw new Error("Invalid constitutional choice list.");
  const lowestIncluded = Math.min(
    ...totals
      .filter((total) => candidates.includes(total.personId))
      .map((total) => total.votes),
  );
  if (
    totals.some(
      (total) =>
        !candidates.includes(total.personId) && total.votes >= lowestIncluded,
    )
  )
    throw new Error(
      "Supplied constitutional choice list excludes a higher count or has an unresolved cutoff tie.",
    );
}
export function recordContingentChoice(
  world: World,
  input: Omit<
    NationalContingentChoice,
    "id" | "sequence" | "recordedAt" | "kind" | "chosenPersonId"
  >,
): World {
  const quorum = Math.ceil((input.wholeNumber * 2) / 3);
  const candidates = contingentCandidates(
    world,
    input.electionId,
    input.office,
  );
  const chosenPersonId =
    input.votes.length >= quorum
      ? (candidates.find(
          (id) =>
            input.votes.filter((vote) => vote.candidatePersonId === id).length >
            input.wholeNumber / 2,
        ) ?? null)
      : null;
  return appendNationalRecord(world, {
    ...input,
    kind: "contingent-choice",
    chosenPersonId,
  });
}
export function nationalOutcome(
  world: World,
  electionId: EntityId,
  office: "president" | "vice-president",
) {
  const records = nationalRecords(world, electionId);
  const count = records.find(
    (record): record is NationalElectoralCount => record.kind === "count",
  );
  if (!count) return null;
  const id =
    office === "president"
      ? count.presidentPersonId
      : count.vicePresidentPersonId;
  if (id) return { personId: id, outcomeId: count.id };
  const choice = records
    .filter(
      (record): record is NationalContingentChoice =>
        record.kind === "contingent-choice" && record.office === office,
    )
    .at(-1);
  return choice?.chosenPersonId
    ? { personId: choice.chosenPersonId, outcomeId: choice.id }
    : null;
}
function validateNationalRecord(
  world: World,
  record: NationalElectionRecord,
  allocationCache?: ReturnType<typeof nationalAllocation>,
) {
  const election = requireNationalElection(world, record.electionId);
  const rules = nationalElectionRules(election.cycle);
  const prior = nationalRecords(world, record.electionId);
  note(record.stableKey, "National record stable key");
  if (nationalRecords(world).some((old) => old.stableKey === record.stableKey))
    throw new Error("Duplicate national stable key.");
  if (
    record.sequence <= election.sequence ||
    record.recordedAt < election.recordedAt
  )
    throw new Error("National record precedes election registration.");
  validateProvenance(world, record.provenance, record.sequence);
  const hasCount = prior.some((old) => old.kind === "count");
  if (
    hasCount &&
    ["unit-result", "certification", "ballot", "count"].includes(record.kind)
  )
    throw new Error(
      "Electoral count is closed; duplicate counting or changed inputs refused.",
    );
  switch (record.kind) {
    case "contest-link": {
      const contest = (world.history.electionContests ?? []).find(
        (old) => old.id === record.contestId,
      );
      const ids = election.tickets.map((ticket) => ticket.presidentPersonId);
      if (
        !rules.units.some((unit) => unit.key === record.unitKey) ||
        prior.some(
          (old) =>
            old.kind === "contest-link" &&
            (old.unitKey === record.unitKey ||
              old.contestId === record.contestId),
        ) ||
        !contest ||
        contest.sequence >= record.sequence ||
        contest.scheduledAt > record.recordedAt ||
        contest.electionDate !== rules.electionDate ||
        contest.office.officeKey !== `electors:${record.unitKey}` ||
        contest.jurisdictionId !==
          nationalUnitJurisdiction(election.cycle, record.unitKey).id ||
        contest.candidatePersonIds.length !== ids.length ||
        ids.some((id) => !contest.candidatePersonIds.includes(id))
      )
        throw new Error(
          "Invalid or duplicate canonical national unit contest link.",
        );
      break;
    }
    case "unit-result": {
      if (record.recordedAt < rules.electionDate)
        throw new Error("Popular result before election day.");
      if (
        !rules.units.some((unit) => unit.key === record.unitKey) ||
        prior.some(
          (old) => old.kind === "unit-result" && old.unitKey === record.unitKey,
        )
      )
        throw new Error("Invalid or duplicate result unit.");
      const ids = election.tickets.map((ticket) => ticket.presidentPersonId);
      if (
        record.tallies.length !== ids.length ||
        new Set(record.tallies.map((tally) => tally.candidatePersonId)).size !==
          ids.length ||
        record.tallies.some(
          (tally) =>
            !ids.includes(tally.candidatePersonId) ||
            !Number.isSafeInteger(tally.votes) ||
            tally.votes < 0,
        )
      )
        throw new Error("Invalid popular tallies.");
      if (
        record.allocationWinnerPersonId !== null &&
        !ids.includes(record.allocationWinnerPersonId)
      )
        throw new Error("Unit winner is not a declared candidate.");
      if (!record.unitKey.includes("-")) {
        for (const tally of record.tallies) {
          const total = prior
            .filter(
              (old) => old.kind === "unit-result" && !old.unitKey.includes("-"),
            )
            .reduce(
              (sum, old) =>
                sum +
                BigInt(
                  old.kind === "unit-result"
                    ? (old.tallies.find(
                        (item) =>
                          item.candidatePersonId === tally.candidatePersonId,
                      )?.votes ?? 0)
                    : 0,
                ),
              BigInt(tally.votes),
            );
          if (total > BigInt(Number.MAX_SAFE_INTEGER))
            throw new Error(
              "Popular total exceeds the exact supported integer range.",
            );
        }
      }
      if (record.sourceContestResultId) {
        const source = (world.history.electionContestResults ?? []).find(
          (old) => old.id === record.sourceContestResultId,
        );
        const contest = (world.history.electionContests ?? []).find(
          (old) => old.id === source?.contestId,
        );
        if (
          !source ||
          source.sequence >= record.sequence ||
          source.resolvedAt > record.recordedAt ||
          contest?.electionDate !== rules.electionDate ||
          contest.office.officeKey !== `electors:${record.unitKey}` ||
          contest.jurisdictionId !==
            nationalUnitJurisdiction(election.cycle, record.unitKey).id ||
          record.allocationWinnerPersonId !==
            (record.unitKey.startsWith("ME") ? null : source.winnerPersonId) ||
          record.tallies.some(
            (tally) =>
              source.tallies.find(
                (old) => old.candidatePersonId === tally.candidatePersonId,
              )?.votes !== tally.votes,
          )
        )
          throw new Error(
            "Contest result does not match declared elector unit/date/tallies.",
          );
      }
      break;
    }
    case "certification": {
      if (
        priorRecord(world, record.resultId, record.electionId).kind !==
          "unit-result" ||
        prior.some(
          (old) =>
            old.kind === "certification" && old.resultId === record.resultId,
        )
      )
        throw new Error("Invalid or duplicate certification.");
      if (!["certified", "contested"].includes(record.disposition))
        throw new Error("Invalid certification disposition.");
      if (
        record.allocationWinnerPersonId !== null &&
        !election.tickets.some(
          (ticket) =>
            ticket.presidentPersonId === record.allocationWinnerPersonId,
        )
      )
        throw new Error("Certified winner is not a declared candidate.");
      note(record.authorityNote, "Certification authority");
      break;
    }
    case "ballot": {
      if (record.recordedAt < rules.electorMeetingDate)
        throw new Error("Electoral ballot before meeting date.");
      const elector = (
        allocationCache ?? nationalAllocation(world, record.electionId)
      ).electors.find((slot) => slot.key === record.electorKey);
      if (
        !elector ||
        prior.some(
          (old) =>
            old.kind === "ballot" && old.electorKey === record.electorKey,
        )
      )
        throw new Error("Unappointed or duplicate elector ballot.");
      const p = election.tickets.find(
        (ticket) => ticket.presidentPersonId === record.presidentPersonId,
      );
      const v = election.tickets.find(
        (ticket) =>
          ticket.vicePresidentPersonId === record.vicePresidentPersonId,
      );
      if (
        (record.presidentPersonId && !p) ||
        (record.vicePresidentPersonId && !v) ||
        !["accepted", "contested"].includes(record.disposition)
      )
        throw new Error("Unsupported ballot candidate or disposition.");
      if (
        p?.presidentState === elector.state &&
        v?.vicePresidentState === elector.state
      )
        throw new Error(
          "Twelfth Amendment: both ballot choices inhabit the elector's state.",
        );
      break;
    }
    case "count": {
      if (record.recordedAt < rules.countDate)
        throw new Error("Electoral count before congressional count date.");
      const proposal = nationalCountProposal(world, record.electionId);
      if (
        !proposal.ready ||
        record.appointedElectors !== proposal.appointedElectors ||
        record.presidentPersonId !== proposal.presidentPersonId ||
        record.vicePresidentPersonId !== proposal.vicePresidentPersonId ||
        record.ballotIds.length !== proposal.ballotIds.length ||
        new Set(record.ballotIds).size !== record.ballotIds.length ||
        record.ballotIds.some((id) => !proposal.ballotIds.includes(id))
      )
        throw new Error("Invalid electoral count.");
      validateChoiceList(
        world,
        record.electionId,
        "president",
        record.presidentialChoicePersonIds,
        record.presidentPersonId,
      );
      validateChoiceList(
        world,
        record.electionId,
        "vice-president",
        record.vicePresidentialChoicePersonIds,
        record.vicePresidentPersonId,
      );
      break;
    }
    case "contingent-choice": {
      const count = priorRecord(world, record.countId, record.electionId);
      if (
        count.kind !== "count" ||
        !["president", "vice-president"].includes(record.office) ||
        (record.office === "president"
          ? count.presidentPersonId
          : count.vicePresidentPersonId) ||
        nationalOutcome(world, record.electionId, record.office)
      )
        throw new Error("This office does not need a contingent choice.");
      if (
        !Number.isSafeInteger(record.wholeNumber) ||
        record.wholeNumber < 1 ||
        record.votes.length > record.wholeNumber ||
        new Set(record.votes.map((vote) => vote.voterKey)).size !==
          record.votes.length
      )
        throw new Error("Invalid contingent membership/voter count.");
      const candidates = contingentCandidates(
        world,
        record.electionId,
        record.office,
      );
      if (
        record.office === "president" &&
        (record.wholeNumber !== CONTINGENT_STATES.length ||
          record.votes.some(
            (vote) => !CONTINGENT_STATES.includes(vote.voterKey),
          ))
      )
        throw new Error(
          "House votes require one delegation per state; DC has no delegation vote.",
        );
      if (record.office === "president" && record.senatorPersonIds.length)
        throw new Error("House choice does not use senator membership.");
      if (
        record.office === "vice-president" &&
        (record.wholeNumber !== CONTINGENT_STATES.length * 2 ||
          record.senatorPersonIds.length !== record.wholeNumber ||
          new Set(record.senatorPersonIds).size !== record.wholeNumber ||
          record.senatorPersonIds.some((id) => !world.people[id]) ||
          record.votes.some(
            (vote) =>
              !record.senatorPersonIds.includes(vote.voterKey as EntityId),
          ))
      )
        throw new Error(
          "Senate votes must belong to its explicit canonical membership snapshot.",
        );
      if (
        record.votes.some(
          (vote) =>
            vote.candidatePersonId &&
            !candidates.includes(vote.candidatePersonId),
        )
      )
        throw new Error("Candidate outside constitutional contingent list.");
      const chosen =
        record.votes.length >= Math.ceil((record.wholeNumber * 2) / 3)
          ? (candidates.find(
              (id) =>
                record.votes.filter((vote) => vote.candidatePersonId === id)
                  .length >
                record.wholeNumber / 2,
            ) ?? null)
          : null;
      if (chosen !== record.chosenPersonId)
        throw new Error("Contingent choice fails whole-body majority/quorum.");
      break;
    }
    case "qualification": {
      const plan = priorRecord(world, record.planId, record.electionId);
      if (
        plan.kind !== "term-plan" ||
        plan.personId !== record.personId ||
        prior.some(
          (old) => old.kind === "qualification" && old.planId === record.planId,
        ) ||
        !["qualified-and-sworn", "refused"].includes(record.disposition)
      )
        throw new Error("Invalid or duplicate office qualification.");
      if (
        record.effectiveAt.date > record.recordedAt ||
        compareSimulationMoments(record.effectiveAt, world.currentMoment) > 0 ||
        compareSimulationMoments(record.effectiveAt, plan.startsAt) < 0 ||
        compareSimulationMoments(record.effectiveAt, plan.endsAt) >= 0
      )
        throw new Error(
          "Oath/entry qualification must be actually recorded at or after the term boundary.",
        );
      note(record.authorityNote, "Qualification authority");
      break;
    }
    case "term-plan": {
      if (!["president", "vice-president"].includes(record.office))
        throw new Error("Unknown national office.");
      const outcome = nationalOutcome(world, record.electionId, record.office);
      if (
        !outcome ||
        outcome.outcomeId !== record.outcomeId ||
        outcome.personId !== record.personId ||
        prior.some(
          (old) => old.kind === "term-plan" && old.office === record.office,
        )
      )
        throw new Error("Term plan must match final office-specific outcome.");
      if (
        compareSimulationMoments(record.startsAt, rules.startsAt) !== 0 ||
        compareSimulationMoments(record.endsAt, rules.endsAt) !== 0
      )
        throw new Error("Term must use dated January 20 noon boundaries.");
      validateTimeDemand(world, record.workTimeDemand);
      if (
        record.workTimeDemand.locationJurisdictionId !== election.jurisdictionId
      )
        throw new Error(
          "National office work must retain its federal jurisdiction.",
        );
      note(record.qualificationNote, "Qualification/oath record");
      break;
    }
    case "term-state": {
      const plan = priorRecord(world, record.planId, record.electionId);
      if (
        plan.kind !== "term-plan" ||
        !["entered", "ended", "blocked"].includes(record.status)
      )
        throw new Error("Invalid term state.");
      if (
        record.effectiveAt.date > record.recordedAt ||
        compareSimulationMoments(record.effectiveAt, world.currentMoment) > 0
      )
        throw new Error("Future term transition.");
      const states = prior.filter(
        (old) => old.kind === "term-state" && old.planId === plan.id,
      );
      const work = record.workRelationshipId
        ? world.history.workRelationships.find(
            (work) => work.id === record.workRelationshipId,
          )
        : null;
      const body = work?.organizationId
        ? world.history.organizations.find(
            (body) => body.id === work.organizationId,
          )
        : null;
      const role = work
        ? world.history.workRoles.find(
            (role) =>
              role.workRelationshipId === work.id &&
              role.sequence < record.sequence,
          )
        : null;
      if (
        record.status === "entered" &&
        (!work ||
          work.stableKey !== `${plan.stableKey}:office-work` ||
          work.sequence >= record.sequence ||
          work.personId !== plan.personId ||
          work.kind !==
            (plan.office === "president"
              ? "employment:executive-officeholder"
              : "employment:vice-presidential-officeholder") ||
          body?.stableKey !== `national-office:us-${plan.office}` ||
          role?.locationJurisdictionId !== election.jurisdictionId ||
          role?.occupationClassification !==
            nationalOfficeRef(plan.office).occupationClassification)
      )
        throw new Error(
          "Term possession must bind its own canonical national office work, not an ordinary role.",
        );
      if (
        record.status === "entered" &&
        (!prior.some(
          (old) =>
            old.kind === "qualification" &&
            old.planId === plan.id &&
            old.disposition === "qualified-and-sworn" &&
            compareSimulationMoments(old.effectiveAt, record.effectiveAt) <= 0,
        ) ||
          states.length ||
          compareSimulationMoments(record.effectiveAt, plan.startsAt) < 0 ||
          compareSimulationMoments(record.effectiveAt, plan.endsAt) >= 0 ||
          !record.workRelationshipId ||
          !world.history.workRelationships.some(
            (work) =>
              work.id === record.workRelationshipId &&
              work.personId === plan.personId,
          ))
      )
        throw new Error("Invalid office entry/work binding.");
      if (
        record.status === "ended" &&
        (!states.some(
          (old) =>
            old.kind === "term-state" &&
            old.status === "entered" &&
            old.workRelationshipId === record.workRelationshipId,
        ) ||
          states.some(
            (old) => old.kind === "term-state" && old.status === "ended",
          ) ||
          compareSimulationMoments(record.effectiveAt, plan.endsAt) !== 0)
      )
        throw new Error("Invalid term expiry.");
      if (
        record.status === "blocked" &&
        (states.length || !record.reason || record.workRelationshipId)
      )
        throw new Error("Invalid blocked term.");
      if (
        record.outcomeEventId &&
        !world.history.events.some(
          (event) =>
            event.id === record.outcomeEventId &&
            event.sequence < record.sequence,
        )
      )
        throw new Error("Missing term outcome event.");
      break;
    }
    case "succession": {
      const vacated = priorRecord(
        world,
        record.vacatedPlanId,
        record.electionId,
      );
      const successor = priorRecord(
        world,
        record.successorPlanId,
        record.electionId,
      );
      const death = world.history.personDeaths.find(
        (row) => row.id === record.deathRecordId,
      );
      const entered = (planId: EntityId) =>
        prior.some(
          (old) =>
            old.kind === "term-state" &&
            old.planId === planId &&
            old.status === "entered" &&
            compareSimulationMoments(old.effectiveAt, record.effectiveAt) <= 0,
        );
      if (
        vacated.kind !== "term-plan" ||
        vacated.office !== "president" ||
        successor.kind !== "term-plan" ||
        successor.office !== "vice-president" ||
        successor.personId !== record.personId ||
        !death ||
        death.personId !== vacated.personId ||
        death.sequence >= record.sequence ||
        death.diedAt !== record.effectiveAt.date ||
        !entered(vacated.id) ||
        !entered(successor.id) ||
        compareSimulationMoments(record.effectiveAt, vacated.endsAt) >= 0 ||
        compareSimulationMoments(record.effectiveAt, world.currentMoment) > 0 ||
        record.basis !== "us-const-amend-xxv-s1" ||
        prior.some(
          (old) =>
            old.kind === "succession" &&
            old.vacatedPlanId === record.vacatedPlanId,
        )
      )
        throw new Error(
          "Succession needs the entered President's recorded death and an entered Vice President, once.",
        );
      break;
    }
    default:
      throw new Error("Unknown national record kind.");
  }
}
export function assertNationalElectionIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  if (!(
    world.history.nationalElections?.length ||
    world.history.nationalElectionRecords?.length
  ))
    return;
  for (const records of [
    world.history.nationalElections ?? [],
    world.history.nationalElectionRecords ?? [],
  ]) {
    if (
      records.some(
        (record, index) =>
          index > 0 && record.sequence <= records[index - 1]!.sequence,
      )
    )
      throw new Error(
        "National histories must remain ordered by append sequence.",
      );
  }
  const allocationCache = new Map<
    EntityId,
    ReturnType<typeof nationalAllocation>
  >();
  let replay: World = {
    ...world,
    history: {
      ...world.history,
      nationalElections: [],
      nationalElectionRecords: [],
    },
  };
  for (const record of nationalHistoryRecords(world).sort(
    (a, b) => a.sequence - b.sequence,
  )) {
    if (
      ids.has(record.id) ||
      !Number.isSafeInteger(record.sequence) ||
      record.recordedAt > world.currentDate
    )
      throw new Error("Invalid national identity/chronology.");
    ids.add(record.id);
    makeIsoDate(record.recordedAt);
    const frontier = {
      ...replay,
      currentDate: record.recordedAt,
      history: { ...replay.history, nextSequence: record.sequence },
    };
    if ("cycle" in record) {
      const { id, sequence, recordedAt, ruleVersion, ...input } = record;
      const checked = registerNationalElection(frontier, input);
      const expected = checked.history.nationalElections!.at(-1)!;
      if (
        id !== expected.id ||
        sequence !== expected.sequence ||
        recordedAt !== expected.recordedAt ||
        ruleVersion !== expected.ruleVersion
      )
        throw new Error("Invalid national election identity/version.");
      replay = {
        ...replay,
        history: {
          ...replay.history,
          nationalElections: [
            ...(replay.history.nationalElections ?? []),
            record,
          ],
        },
      };
    } else {
      if (record.kind === "ballot" && !allocationCache.has(record.electionId))
        allocationCache.set(
          record.electionId,
          nationalAllocation(frontier, record.electionId),
        );
      validateNationalRecord(
        frontier,
        record,
        allocationCache.get(record.electionId),
      );
      if (record.kind === "unit-result" || record.kind === "certification")
        allocationCache.delete(record.electionId);
      if (
        record.id !==
        createStableId(
          "national-election-record",
          `${world.id}:${record.stableKey}`,
        )
      )
        throw new Error("Invalid national record identity.");
      replay = {
        ...replay,
        history: {
          ...replay.history,
          nationalElectionRecords: [...nationalRecords(replay), record],
        },
      };
    }
  }
}
export function nationalPersonAlive(world: World, id: EntityId) {
  return isPersonAliveAt(world, id, {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  });
}
