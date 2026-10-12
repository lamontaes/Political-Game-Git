import { addDays, type IsoDate } from "../elections/calendar";
import type {
  LegislativeRulePack,
  RuleValue,
} from "../../simulation/legislature-rules";
/** KEEP part of executiveBillActionWindow; selection/lookup remains with the port. */
export function executiveBillActionWindow(
  pack: LegislativeRulePack,
  presentedAt: IsoDate | null,
  closed: IsoDate | null,
  onDate: IsoDate,
  fallbackBasis: RuleValue<"CALENDAR" | "BUSINESS" | "SUNDAYS_EXCEPTED"> | null,
) {
  if (presentedAt === null) return null;
  const afterAdjournment = closed !== null && onDate > closed;
  const days = afterAdjournment
    ? pack.executive.actionWindowDaysAfterAdjournment
    : pack.executive.actionWindowDaysInSession;
  const recordedBasis = afterAdjournment
    ? pack.executive.actionWindowDayBasisAfterAdjournment
    : pack.executive.actionWindowDayBasisInSession;
  const basis = recordedBasis ?? fallbackBasis;
  if (
    days.kind !== "known" ||
    basis?.kind !== "known" ||
    !["CALENDAR", "BUSINESS", "SUNDAYS_EXCEPTED"].includes(basis.value) ||
    !Number.isInteger(days.value) ||
    days.value < 0
  )
    return null;
  let lastActionDate = presentedAt;
  // stopgapId: "SG-P14-legislatures-business-holidays"
  for (let remaining = days.value; remaining > 0;) {
    lastActionDate = addDays(lastActionDate, 1);
    const weekday = new Date(`${lastActionDate}T00:00:00Z`).getUTCDay();
    if (
      basis.value === "CALENDAR" ||
      (basis.value === "SUNDAYS_EXCEPTED" && weekday !== 0) ||
      (basis.value === "BUSINESS" && weekday !== 0 && weekday !== 6)
    )
      remaining -= 1;
  }
  // stopgapId: "SG-P14-legislatures-adjournment-inaction"
  const outcome = afterAdjournment
    ? null
    : pack.executive.inactionOutcomeInSession;
  return {
    lastActionDate,
    inactionAt: addDays(lastActionDate, 1),
    inactionOutcome: outcome?.kind === "known" ? outcome.value : null,
  };
}
