import funds from "../../../data/research/congress/statehood-funds.json" with { type: "json" };
import { makeIsoDate } from "../dates";
import {
  statehoodAdmittedOn,
  statehoodPlace,
} from "../governing/statehood-admission";
import type { IsoDate, World } from "../types";
import { BUDGET_SOURCES, type PublicBudgetGovernment } from "./store";

/**
 * WHAT STATEHOOD DOES TO A PLACE'S FEDERAL AID.
 *
 * When a place is admitted (`governing/statehood-admission.ts`) no federal
 * payment changes. The new state's own government decides, once a year when it
 * adopts its budget, whether to certify to the President that its revenues
 * will cover what ending the higher Medicaid match costs it. Certifying ends
 * the higher match on the next fiscal year's first day, and the federal aid
 * on the state's books falls by the difference in the federal share of
 * Medicaid and of children's health insurance. The numbers are in
 * `data/research/congress/statehood-funds.json`; the place is the one the
 * statehood law is for, read from the seats data.
 *
 * DECIDED: whether the state certifies is read from its own books at the day
 * it adopts a budget: the general-fund balance plus the reserve against five
 * fiscal years of the loss (the bill's test, "estimated revenues sufficient",
 * read as money in hand; HARDWIRED reading of that test). A state that cannot
 * cover it declines, writes down why, and asks again a year later.
 *
 * The federal aid lost is a fixed number of fiscal 2024 dollars, HARDWIRED: it
 * does not grow with Medicaid spending. The state's spending on care is
 * unchanged, so what the state's books lose is met the way any shortfall is:
 * cuts under a balanced-budget law, the reserve, or borrowing.
 */

const FEDERAL_AID = BUDGET_SOURCES.indexOf("federalAid");

/** A year's federal aid lost when the higher match ends, in whole dollars. */
export function statehoodFederalAidLoss(): number {
  const { medicaid, childrensInsurance } = funds;
  return Math.round(
    medicaid.traditionalSpending *
      (medicaid.matchBefore - medicaid.matchAfter) +
      childrensInsurance.spending *
        (childrensInsurance.matchBefore - childrensInsurance.matchAfter),
  );
}

/** What a budget adopted after admission decided about certifying. */
export interface StatehoodCertification {
  readonly decidedOn: IsoDate;
  readonly certified: boolean;
  /** The first day of the fiscal year the lower match starts, or null. */
  readonly changeStartsOn: IsoDate | null;
  /** The books it read and the test it applied, in words. */
  readonly reason: string;
}

const million = (dollars: number) =>
  `$${(dollars / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })} million`;

/**
 * The state's decision at the day it adopts a budget, or null where it has
 * nothing to decide: not the place the statehood law is for, not yet
 * admitted, or already certified.
 */
export function decideStatehoodCertification(
  world: World,
  government: PublicBudgetGovernment,
  startsOn: IsoDate,
): StatehoodCertification | null {
  if (government.level !== "state") return null;
  if (government.key !== `US-${statehoodPlace()}`) return null;
  if (!statehoodAdmittedOn(world, startsOn)) return null;
  if (government.years.some((year) => year.statehoodCertification?.certified))
    return null;
  const loss = statehoodFederalAidLoss();
  const years = funds.certification.fiscalYears;
  const needed = loss * years;
  const held = government.balance + government.reserve;
  const certified = held >= needed;
  const changeStartsOn = certified
    ? makeIsoDate(`${Number(startsOn.slice(0, 4)) + 1}-${startsOn.slice(5)}`)
    : null;
  return {
    decidedOn: startsOn,
    certified,
    changeStartsOn,
    reason: certified
      ? `The state holds ${million(held)} in its general fund and reserve against ${million(needed)}, the ${million(loss)} a year that ending the higher Medicaid and children's insurance match costs it, for ${years} fiscal years, so it certifies to the President and the higher match ends when the next budget year begins.`
      : `The state holds ${million(held)} in its general fund and reserve against ${million(needed)}, the ${million(loss)} a year that ending the higher Medicaid and children's insurance match costs it, for ${years} fiscal years, so it does not certify, keeps the higher match, and asks again when it adopts next year's budget.`,
  };
}

/**
 * How statehood moves the state's federal aid on a date against what it opened
 * with: 1 until the state certified and the fiscal year the lower match starts
 * has begun, then the share of its opening federal aid that remains.
 */
export function statehoodFederalAidFactor(
  government: PublicBudgetGovernment,
  date: IsoDate,
): number {
  const certification = government.years.find(
    (year) => year.statehoodCertification?.certified,
  )?.statehoodCertification;
  if (!certification?.changeStartsOn || date < certification.changeStartsOn)
    return 1;
  const opening = government.years[0]?.expectedRevenue[FEDERAL_AID] ?? 0;
  if (opening <= 0) return 1;
  return Math.max(0, 1 - statehoodFederalAidLoss() / opening);
}
