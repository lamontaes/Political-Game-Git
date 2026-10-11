// Lifted unchanged from src/simulation/office-transition.ts; RULES-3, 2026-10-11.
import { addDays } from "./dates";
import type { EntityId, IsoDate } from "../../simulation/types";

export const OFFICE_TRANSITION_SERVICE_ATTENDED =
  "election.transition-service-attended";

export type OfficeTransitionLevel =
  | "federal-house"
  | "federal-senate"
  | "state-legislature"
  | "state-executive"
  | "local";

export type OfficeTransitionCoverage = "public-practice" | "blanket";

export interface TransitionSpan {
  readonly opens:
    | { readonly daysAfterElection: number }
    | { readonly daysBeforeStart: number };
  readonly closes:
    | { readonly daysAfterElection: number }
    | { readonly daysBeforeStart: number };
}

export interface OfficeTransitionService {
  readonly key: string;
  /** Player-facing name of the service. */
  readonly title: string;
  /** Player-facing: what happens there, in the institution's own terms. */
  readonly description: string;
  readonly span: TransitionSpan;
}

export interface OfficeTransitionProfile {
  readonly key: string;
  readonly level: OfficeTransitionLevel;
  readonly coverage: OfficeTransitionCoverage;
  /**
   * Player-facing: what a winner here is called before the term begins, from
   * the office's name (for a legislature, the chamber's).
   */
  readonly electTitle: (officeName: string) => string;
  /** Player-facing: how the term begins. */
  readonly entry: string;
  /** Player-facing: the swearing-in, as this institution holds it. */
  readonly swearingIn: string;
  readonly services: readonly OfficeTransitionService[];
  /** Developer-facing: what this profile does not model yet. */
  readonly notCoded: readonly string[];
}

export interface DatedTransitionService extends OfficeTransitionService {
  readonly opensOn: IsoDate;
  /** Last day the service can be attended. */
  readonly closesOn: IsoDate;
}

export function windowDate(
  bound: TransitionSpan["opens"],
  electionDate: IsoDate,
  startsAt: IsoDate,
): IsoDate {
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

export type TransitionServiceStatus =
  "upcoming" | "open" | "attended" | "missed";

export function transitionAttendanceKey(
  personId: EntityId,
  contestId: EntityId,
  serviceKey: string,
) {
  return `office-transition:${contestId}:${personId}:${serviceKey}`;
}

export function transitionServiceStatus(
  today: IsoDate,
  hasAttended: boolean,
  service: DatedTransitionService,
): TransitionServiceStatus {
  if (hasAttended) return "attended";
  if (today < service.opensOn) return "upcoming";
  if (today > service.closesOn) return "missed";
  return "open";
}
