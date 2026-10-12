import { addDays, type IsoDate } from "./calendar";
import type {
  TransitionSpan,
  OfficeTransitionProfile,
  DatedTransitionService,
  TransitionServiceStatus,
} from "../../simulation/office-transition";
function windowDate(
  bound: TransitionSpan["opens"],
  electionDate: IsoDate,
  startsAt: IsoDate,
): ReturnType<typeof addDays> {
  return "daysAfterElection" in bound
    ? addDays(electionDate, bound.daysAfterElection)
    : addDays(startsAt, -bound.daysBeforeStart);
}

export function datedTransitionServices(
  profile: OfficeTransitionProfile,
  electionDate: IsoDate,
  startsAt: IsoDate,
): readonly DatedTransitionService[] {
  const first = addDays(electionDate, 1);
  const last = addDays(startsAt, -1);
  if (last < first) return [];
  return profile.services.flatMap((service) => {
    const opens = windowDate(service.span.opens, electionDate, startsAt);
    const closes = windowDate(service.span.closes, electionDate, startsAt);
    const opensOn = opens < first ? first : opens;
    const closesOn = closes > last ? last : closes;
    return closesOn < opensOn ? [] : [{ ...service, opensOn, closesOn }];
  });
}

export function transitionServiceStatus(
  onDate: IsoDate,
  attended: boolean,
  service: DatedTransitionService,
): TransitionServiceStatus {
  if (attended) return "attended";
  if (onDate < service.opensOn) return "upcoming";
  if (onDate > service.closesOn) return "missed";
  return "open";
}
