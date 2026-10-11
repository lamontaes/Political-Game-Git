import { validateIsoDate } from "./calendar";
import { generalElectionDay, isElectionYear } from "./executive-calendar";
import type { StateExecutiveTermRule } from "../../simulation/nationwide-world/state-executive-term-rules";
import type { IsoDate } from "./calendar";
export function planOrdinaryStateExecutiveTerm(facts: {
  readonly contestExists: boolean;
  readonly resultExists: boolean;
  readonly identityExists: boolean;
  readonly regularElection: boolean;
  readonly dates:
    | { readonly kind: "unknown" }
    | {
        readonly kind: "dated";
        readonly startsAt: IsoDate;
        readonly endsAt: IsoDate;
      };
  readonly qualificationBlocks: number;
  readonly winnerPersonId: string;
}): {
  readonly startsAt: IsoDate;
  readonly endsAt: IsoDate;
  readonly winnerPersonId: string;
  readonly qualify: boolean;
} | null {
  if (
    !facts.contestExists ||
    !facts.resultExists ||
    !facts.identityExists ||
    !facts.regularElection ||
    facts.dates.kind !== "dated"
  )
    return null;
  return {
    ...facts.dates,
    winnerPersonId: facts.winnerPersonId,
    qualify: facts.qualificationBlocks === 0,
  };
}
export function seatOpeningGovernorElect(facts: {
  readonly termEnds: IsoDate | null;
  readonly rule: StateExecutiveTermRule | null;
  readonly currentDate: IsoDate;
  readonly window: {
    readonly startsAt: IsoDate | null;
    readonly endExclusive: IsoDate | null;
    readonly ruleVersion: string | null;
  };
  readonly alreadyRecorded: boolean;
}): {
  readonly electionDay: IsoDate;
  readonly electionYear: number;
  readonly startsAt: IsoDate;
  readonly endExclusive: IsoDate | null;
  readonly ruleVersion: string | null;
} | null {
  const { termEnds, rule } = facts;
  if (!termEnds || !rule || termEnds <= facts.currentDate) return null;
  let electionYear = Number(termEnds.slice(0, 4));
  while (
    !isElectionYear(rule.election, electionYear) ||
    generalElectionDay(rule.election, electionYear) >= termEnds
  ) {
    electionYear -= 1;
    if (electionYear < Number(termEnds.slice(0, 4)) - rule.election.cycleYears)
      return null;
  }
  const electionDay = generalElectionDay(rule.election, electionYear);
  if (
    electionDay >= facts.currentDate ||
    facts.window.startsAt !== termEnds ||
    facts.alreadyRecorded
  )
    return null;
  return {
    electionDay,
    electionYear,
    startsAt: termEnds,
    endExclusive: facts.window.endExclusive,
    ruleVersion: facts.window.ruleVersion,
  };
}
export function statutoryPresidentialSuccessor<
  T extends { readonly seatKey: string },
>(facts: {
  readonly chambers: readonly {
    readonly members: readonly {
      readonly personId: string;
      readonly seatKey: string;
    }[];
    readonly winnerPersonId: string | null;
    readonly office: string;
    readonly basis: string;
  }[];
  readonly catalog: readonly T[];
}): {
  readonly personId: string;
  readonly seat: T;
  readonly office: string;
  readonly basis: string;
} | null {
  for (const chamber of facts.chambers) {
    if (chamber.members.length === 0) continue;
    const holder = chamber.members.find(
      (row) => row.personId === chamber.winnerPersonId,
    );
    const seat = holder
      ? facts.catalog.find((candidate) => candidate.seatKey === holder.seatKey)
      : undefined;
    if (holder && seat)
      return {
        personId: holder.personId,
        seat,
        office: chamber.office,
        basis: chamber.basis,
      };
  }
  return null;
}
export function seatHouseDelegates(
  seats: readonly {
    readonly seatKey: string;
    readonly termYears: number;
    readonly startsAt: IsoDate;
    readonly endExclusive: IsoDate;
    readonly priorTerms: number;
    readonly caucus: string;
  }[],
) {
  return seats.map((seat) => ({
    seatKey: seat.seatKey,
    startsAt: seat.startsAt,
    endExclusive: seat.endExclusive,
    caucus: seat.caucus,
    returningPersonId: null,
    serviceSince: validateIsoDate(
      String(
        Number(seat.startsAt.slice(0, 4)) - seat.priorTerms * seat.termYears,
      ) + "-01-03",
    ),
  }));
}
