import { backdropFor, stagePeople } from "./scene";
import type { CoreState } from "../core2/types";
import type { PollingVisit } from "../director/polling-place";

/** The picture's hour: the polls in the morning light. A presentation choice. */
const POLLING_MINUTE = 8 * 60;

/**
 * The polling-place scene as the screen plays it: the place's picture, the
 * voter and the household members who go along standing in it, and the
 * ballot, every contest and candidate from the elections engine's records.
 */
export function pollingScene(core: CoreState, visit: PollingVisit) {
  // The voter, and the household members who go along with them.
  const name = (id: string) => {
    const row = core.people.get(id)!;
    return {
      id,
      name: `${row.givenName} ${row.familyName}`,
      reason:
        id === visit.record.personId
          ? ("you" as const)
          : ("household" as const),
    };
  };
  const cast = [visit.record.personId, ...visit.withIds].map(name);
  return {
    id: visit.record.id,
    situationKey: visit.situationKey,
    electionDate: visit.record.electionDate,
    place: visit.place,
    backdrop: backdropFor(core, visit.place, POLLING_MINUTE),
    people: stagePeople(core, visit.place, cast).people,
    contests: visit.contests.map((contest) => ({
      ...contest,
      marked:
        contest.id in visit.record.marked
          ? { candidateId: visit.record.marked[contest.id] }
          : null,
    })),
    status: visit.record.status,
  };
}
