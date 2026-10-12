import type { EntityId } from "../../simulation/types";
import type { LegislativeStartingProcedureEntry } from "../../simulation/legislative-starting-procedures";
import type { SittingCalendar as LegislativeSittingCalendar } from "./sitting-calendar";
import type { MunicipalReading } from "../../simulation/municipal-government";
import type { SeasonKind } from "../../simulation/governing/governing-calendar";
import { addDays, makeIsoDate, type IsoDate } from "../elections/calendar";
import { nextSessionCalendarDate } from "./sitting-calendar";
import { regularSessionYearForWorld } from "./session-rules";
export interface GoverningCalendarFacts {
  readonly onDate: IsoDate;
  readonly stateKey: string | null;
  readonly sessions: Readonly<Record<string, readonly SessionWindow[]>>;
  readonly recordedYear: number;
  readonly entry: LegislativeStartingProcedureEntry | null;
  readonly defaultCalendar: LegislativeSittingCalendar;
  readonly municipalReading: MunicipalReading | null;
  readonly existingDueKeys: ReadonlySet<string>;
}
export interface GoverningDueRequest {
  readonly stableKey: string;
  readonly dueAt: string;
  readonly transitionKey: string;
  readonly entityIds: readonly EntityId[];
  readonly jurisdictionId: EntityId;
  readonly provenance: { readonly kind: "authored"; readonly note: string };
}
const STATE_GOVERNING_VERSION = "state-governing/v1";

type SessionWindow = {
  readonly conveneAt: string;
  readonly adjournAt: string | "full-year";
};

export const GOVERNING_SEASON = "governing:season" as const;

export function recordedStateBillDate(
  facts: GoverningCalendarFacts,
  jurisdictionId: EntityId,
):
  | {
      readonly covered: false;
    }
  | {
      readonly covered: true;
      readonly dueAt: IsoDate | null;
    } {
  const sessions =
    Number(facts.onDate.slice(0, 4)) === facts.recordedYear && facts.stateKey
      ? (facts.sessions[facts.stateKey] ?? null)
      : null;
  if (sessions === null) return { covered: false };
  for (const session of sessions) {
    const opensAt = makeIsoDate(session.conveneAt);
    const closesAt =
      session.adjournAt === "full-year"
        ? makeIsoDate(`${session.conveneAt.slice(0, 4)}-12-31`)
        : makeIsoDate(session.adjournAt);
    const nextAt =
      facts.onDate < opensAt
        ? opensAt
        : facts.onDate < closesAt
          ? addDays(facts.onDate, 7)
          : null;
    if (nextAt && nextAt > facts.onDate && nextAt <= closesAt)
      return { covered: true, dueAt: nextAt };
  }
  return {
    covered: true,
    dueAt: nextSessionCalendarDate(
      facts.defaultCalendar,
      facts.onDate,
      "bill",
      {
        notBefore: makeIsoDate(`${facts.recordedYear + 1}-01-01`),
        eligibleYear: (year) =>
          regularSessionYearForWorld(facts.entry, jurisdictionId, year),
      },
    ),
  };
}

export function scheduleGoverningSeasons(
  facts: GoverningCalendarFacts,
  officeKey: string,
  jurisdictionId: EntityId,
  municipal?: {
    readonly kind: "municipal";
    readonly governmentKey: string;
  },
): readonly GoverningDueRequest[] {
  const government = facts.municipalReading;
  const submission = government
    ? government.budget.submissionDeadline?.monthDay
    : null;
  const baseline =
    facts.entry?.baselinePack.session.sittingCalendar ?? facts.defaultCalendar;
  const budgetCalendar = baseline.tasks?.budget
    ? baseline
    : facts.defaultCalendar;
  const calendar = submission
    ? {
        ...baseline,
        id: `municipal-budget:${municipal!.governmentKey}`,
        note: "The recorded municipal budget submission date.",
        tasks: {
          ...baseline.tasks,
          budget: { kind: "annual" as const, monthDays: [submission] },
        },
      }
    : municipal
      ? budgetCalendar
      : baseline;
  const requests: GoverningDueRequest[] = [];
  const kinds: readonly SeasonKind[] = municipal
    ? ["budget"]
    : ["budget", "bill"];
  for (const kind of kinds) {
    const recordedBillDate =
      kind === "bill" && !municipal
        ? recordedStateBillDate(facts, jurisdictionId)
        : { covered: false as const };
    if (recordedBillDate.covered && recordedBillDate.dueAt === null) continue;
    const dueAt =
      kind === "bill" && recordedBillDate.covered
        ? recordedBillDate.dueAt!
        : nextSessionCalendarDate(calendar, facts.onDate, kind, {
            eligibleYear:
              kind === "bill"
                ? (year) =>
                    regularSessionYearForWorld(
                      facts.entry,
                      jurisdictionId,
                      year,
                    )
                : undefined,
          });
    const stableKey = `${STATE_GOVERNING_VERSION}:season:${officeKey}:${kind}:${dueAt}`;
    if (facts.existingDueKeys.has(stableKey)) continue;
    requests.push({
      stableKey,
      dueAt,
      transitionKey: GOVERNING_SEASON,
      entityIds: [jurisdictionId],
      jurisdictionId,
      provenance: {
        kind: "authored",
        note: `${calendar.id}: ${calendar.note}`,
      },
    });
  }
  return requests;
}

// stopgapId: "SG-P14-legislatures-legislative-season-fallback"
