import type {
  EntityId,
  HistoricalEvent,
  ElectionContestRecord,
  ElectionContestResultRecord,
} from "../../simulation/types";
import type { IsoDate } from "./calendar";
import type { CongressSeat } from "../../simulation/living-world/congress-seats";
import type { CongressCandidate } from "../../simulation/living-world/congress-candidates";
import type { GeneratedSeatCondition } from "../../simulation/world-setup/types";
import type { JointAssemblyVote } from "../../simulation/governing/joint-assembly";
import { aggregateCongressAffiliation } from "./delegate-projection";
const SEAT_TENURE_EVENT = "world.legislative-seat-tenure";
const SEAT_PARTY_TAG = "party:";
const SEAT_CAUCUS_TAG = "caucus:";
export interface CongressDecisionFacts {
  readonly writerVersion: string;
  readonly people: ReadonlyMap<string, unknown>;
  readonly alive: ReadonlySet<EntityId>;
  readonly legislatureChooses: boolean;
  readonly contest: ElectionContestRecord | undefined;
  readonly contestResult: ElectionContestResultRecord | null;
  readonly condition: GeneratedSeatCondition | null;
  readonly intent: boolean | null;
  readonly members: readonly unknown[] | null;
  readonly legislatureVote: JointAssemblyVote | null;
  readonly candidates: readonly CongressCandidate[];
  readonly slate: HistoricalEvent | null;
  readonly controlledPersonId: EntityId | null;
}
function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

export interface SeatOutcome {
  readonly seat: CongressSeat;
  readonly incumbentPersonId: EntityId | null;
  readonly successorKey: string | null;
  readonly recordedWinnerPersonId?: EntityId | null;
  readonly party: string;
  readonly caucus: string;
  readonly serviceSince: IsoDate;
  readonly chosenByLegislature?: boolean;
  readonly legislatureVote?: JointAssemblyVote;
  readonly deadlocked?: boolean;
}

export function decideSeat(
  facts: CongressDecisionFacts,
  seat: CongressSeat,
  record: HistoricalEvent | undefined,
  year: number,
  newStart: IsoDate,
): SeatOutcome | null {
  const incumbent =
    record?.type === SEAT_TENURE_EVENT
      ? record.participants.find((p) => p.role === "focus:subject")?.personId
      : undefined;
  const recordedParty = record ? tagValue(record, SEAT_PARTY_TAG) : null;
  const recordedCaucus = record ? tagValue(record, SEAT_CAUCUS_TAG) : null;
  const person = incumbent ? facts.people.get(incumbent) : undefined;
  const eligible =
    incumbent !== undefined &&
    person !== undefined &&
    facts.alive.has(incumbent);
  if (facts.legislatureChooses && !facts.contest) {
    const condition = facts.condition;
    const seeking = eligible && facts.intent !== false;
    const caucusOf = (party: string) =>
      party === "democratic" || party === "republican"
        ? party
        : (condition?.caucus ?? recordedCaucus ?? "none");
    const serviceSince = () =>
      (record
        ? (tagValue(record, "service-since:") as IsoDate | null)
        : null) ??
      record?.occurredAt ??
      newStart;
    const successorKey = `${`${facts.writerVersion}:seat:${seat.seatKey}`}:term:${newStart}:member`;
    const members = facts.members;
    if (members) {
      const vote = facts.legislatureVote!;
      if (!vote.winner)
        return {
          seat,
          incumbentPersonId: null,
          successorKey: null,
          party: "none",
          caucus: "none",
          serviceSince: newStart,
          chosenByLegislature: true,
          legislatureVote: vote,
          deadlocked: true,
        };
      const returns = vote.winner.personId === incumbent && incumbent;
      return {
        seat,
        incumbentPersonId: returns ? incumbent! : null,
        successorKey: vote.winner.personId ? null : successorKey,
        ...(vote.winner.personId && !returns
          ? { recordedWinnerPersonId: vote.winner.personId }
          : {}),
        party: vote.winner.party,
        caucus: caucusOf(vote.winner.party),
        serviceSince: returns ? serviceSince() : newStart,
        chosenByLegislature: true,
        legislatureVote: vote,
      };
    }
    const party = aggregateCongressAffiliation({
      democraticShare: condition?.generatedShare ?? null,
      baselineAffiliation: condition?.affiliation ?? null,
      incumbentAffiliation: recordedParty,
      incumbentSeeking: seeking,
    });
    if (party === null) return null;
    const returns = seeking && recordedParty === party && incumbent;
    return {
      seat,
      incumbentPersonId: returns ? incumbent! : null,
      successorKey: returns ? null : successorKey,
      party,
      caucus: caucusOf(party),
      serviceSince: returns ? serviceSince() : newStart,
      chosenByLegislature: true,
    };
  }
  const contest = facts.contest;
  if (contest) {
    const result = facts.contestResult;
    if (!result) return null;
    const incumbentWon = result.winnerPersonId === incumbent;
    const nominee = incumbentWon
      ? undefined
      : facts.candidates.find(
          (candidate) => candidate.personId === result.winnerPersonId,
        );
    const nomineeCaucus =
      nominee?.party === "democratic" || nominee?.party === "republican"
        ? nominee.party
        : "none";
    return {
      seat,
      incumbentPersonId: incumbentWon ? result.winnerPersonId : null,
      successorKey: null,
      recordedWinnerPersonId: result.winnerPersonId,
      party: incumbentWon
        ? (recordedParty ?? "none")
        : (nominee?.party ?? "none"),
      caucus: incumbentWon ? (recordedCaucus ?? "none") : nomineeCaucus,
      serviceSince: incumbentWon
        ? ((record
            ? (tagValue(record, "service-since:") as IsoDate | null)
            : null) ??
          record?.occurredAt ??
          newStart)
        : newStart,
    };
  }
  const slate = facts.slate;
  if (slate) {
    const viable = facts.candidates.filter((candidate) =>
      facts.alive.has(candidate.personId),
    );
    if (viable.length === 0) return null;
    const condition = facts.condition;
    const seeking =
      eligible &&
      facts.intent === true &&
      viable.some((candidate) => candidate.personId === incumbent);
    const preferredParty = aggregateCongressAffiliation({
      democraticShare: condition?.generatedShare ?? null,
      baselineAffiliation: condition?.affiliation ?? null,
      incumbentAffiliation: recordedParty,
      incumbentSeeking: seeking,
    });
    const supportFor = (party: string): number => {
      const share = condition?.generatedShare;
      if (share === null || share === undefined)
        return condition?.affiliation === party ? 1 : 0;
      if (party === "democratic") return share;
      if (party === "republican") return 1 - share;
      return 0;
    };
    const winner =
      viable.find((candidate) => candidate.party === preferredParty) ??
      [...viable].sort(
        (left, right) =>
          supportFor(right.party) - supportFor(left.party) ||
          left.personId.localeCompare(right.personId),
      )[0]!;
    const incumbentWon = winner.personId === incumbent;
    return {
      seat,
      incumbentPersonId: incumbentWon ? winner.personId : null,
      successorKey: null,
      recordedWinnerPersonId: winner.personId,
      party: winner.party,
      caucus:
        winner.party === "democratic" || winner.party === "republican"
          ? winner.party
          : (condition?.caucus ?? recordedCaucus ?? "none"),
      serviceSince: incumbentWon
        ? ((record
            ? (tagValue(record, "service-since:") as IsoDate | null)
            : null) ??
          record?.occurredAt ??
          newStart)
        : newStart,
    };
  }
  const seeking = (facts.intent ?? eligible) && eligible;
  const condition = facts.condition;
  const party = aggregateCongressAffiliation({
    democraticShare: condition?.generatedShare ?? null,
    baselineAffiliation: condition?.affiliation ?? null,
    incumbentAffiliation: recordedParty,
    incumbentSeeking: seeking,
  });
  if (party === null) return null;
  const caucus =
    party === "democratic" || party === "republican"
      ? party
      : (condition?.caucus ?? recordedCaucus ?? "none");
  if (incumbent !== undefined && facts.controlledPersonId === incumbent) {
    return {
      seat,
      incumbentPersonId: null,
      successorKey: `${`${facts.writerVersion}:seat:${seat.seatKey}`}:term:${newStart}:member`,
      party,
      caucus,
      serviceSince: newStart,
    };
  }
  const returns = seeking && recordedParty === party;
  if (returns && incumbent) {
    return {
      seat,
      incumbentPersonId: incumbent,
      successorKey: null,
      party,
      caucus,
      serviceSince:
        (record
          ? (tagValue(record, "service-since:") as IsoDate | null)
          : null) ??
        record?.occurredAt ??
        newStart,
    };
  }
  return {
    seat,
    incumbentPersonId: null,
    successorKey: `${`${facts.writerVersion}:seat:${seat.seatKey}`}:term:${newStart}:member`,
    party,
    caucus,
    serviceSince: newStart,
  };
}
