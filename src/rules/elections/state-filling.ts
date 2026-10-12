import { makeIsoDate, type IsoDate } from "./calendar";
import { generalElectionDay } from "./executive-calendar";
import {
  stateLegislativeElectionRule,
  isStateLegislativeSeatDue,
  type LegislativeCalendarFacts,
} from "./legislative-calendar";
import {
  legislativeTermDates,
  type LegislativeTermFacts,
} from "./legislative-terms";
import type { CandidacyPack } from "../../simulation/candidacy-packs";
import type {
  HistoricalEvent,
  EntityId,
  ElectionContestResultRecord,
} from "../../simulation/types";
export interface StateFillingFacts {
  readonly pack: CandidacyPack | null;
  readonly currentDate: IsoDate;
  readonly calendar: LegislativeCalendarFacts;
  readonly term: LegislativeTermFacts;
  readonly results: ReadonlyMap<string, HistoricalEvent>;
  readonly contestResults: ReadonlyMap<string, ElectionContestResultRecord>;
  readonly deaths: ReadonlySet<EntityId>;
}
export function nextStateSeatFilling(
  facts: StateFillingFacts,
  packId: string,
  officeKey: string,
  ordinal: number,
): {
  readonly electedOn: IsoDate;
  readonly takesOfficeOn: IsoDate | null;
} | null {
  const pack = facts.pack;
  if (!pack) return null;
  const today = facts.currentDate;
  const rule = stateLegislativeElectionRule(
    pack.jurisdictionKey.replace(/^US-/, ""),
  );
  for (
    let year = Number(today.slice(0, 4)) - 1;
    year < Number(today.slice(0, 4)) + 8;
    year += 1
  ) {
    if (
      !isStateLegislativeSeatDue(
        facts.calendar,
        pack.jurisdictionKey.replace(/^US-/, ""),
        officeKey,
        ordinal,
        year,
      )
    )
      continue;
    const electionDay = generalElectionDay(rule, year);
    const termStart =
      legislativeTermDates(facts.term, officeKey, electionDay)?.startsAt ??
      makeIsoDate(`${year + 1}-01-01`);
    const results = facts.results.get(electionDay);
    if (results && electionDay <= today && today < termStart) {
      const alive = (personId: EntityId) => !facts.deaths.has(personId);
      const drawn = results.participants.some((participant) => {
        const [key, seat, , kind] = (participant.detail ?? "").split("|");
        return (
          key === officeKey &&
          Number(seat) === ordinal &&
          kind === "new" &&
          alive(participant.personId)
        );
      });
      const campaign = results.tags.some((tag) => {
        const [key, seat, contestId] = tag
          .slice("campaign-seat:".length)
          .split("|");
        if (!tag.startsWith("campaign-seat:")) return false;
        if (key !== officeKey || Number(seat) !== ordinal || !contestId)
          return false;
        const result = facts.contestResults.get(contestId) ?? null;
        return result !== null && alive(result.winnerPersonId);
      });
      if (drawn || campaign)
        return { electedOn: electionDay, takesOfficeOn: termStart };
    }
    if (electionDay > today)
      return { electedOn: electionDay, takesOfficeOn: null };
  }
  return null;
}
export function stateWakeEventPackKeys(
  event: HistoricalEvent,
): readonly string[] {
  const seatKey =
    event.tags.find((tag) => tag.startsWith("seat:"))?.slice(5) ?? null;
  if (!seatKey) return [];
  const keys: string[] = [];
  for (
    let at = seatKey.indexOf("|");
    at >= 0;
    at = seatKey.indexOf("|", at + 1)
  )
    keys.push(seatKey.slice(0, at));
  return keys;
}

// stopgapId: "SG-P14-elections-state-filling-future-death"

// stopgapId: "SG-P14-elections-state-wake-prefix"
