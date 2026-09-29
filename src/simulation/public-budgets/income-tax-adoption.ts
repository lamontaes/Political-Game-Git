import bases from "../../../data/research/money/public-budget-bases.json" with { type: "json" };
import stateIncomeTax2026 from "../../../data/research/money/state-income-tax-2026.json" with { type: "json" };
import outcomeBases from "../../../data/research/outcome-web/place-outcome-bases-2024.json" with { type: "json" };
import { BUDGET_CALIBRATION } from "./opening";

/**
 * What a state that began with no wage income tax collects once a law adopts
 * one, for the residents whose own paychecks the world does not write out.
 *
 * ESTIMATED FROM AVERAGE: a new tax has no collections to read, and a bill
 * does not carry its own rates yet, so it collects what the states that do
 * tax wages collect per resident on average (Census Bureau 2022 state
 * government finances over BEA 2024 population), moved by how the state's
 * median earnings compare with theirs (Census Bureau 2024 American Community
 * Survey): a state whose workers earn more pays more on the same rates. It
 * is carried to the opening year by the budget calibration factor, the same
 * way every opening amount is. The paychecks the world writes out withhold
 * under the rates `state-income-tax-law.ts` estimates, and the budget adds
 * what they actually withheld on top of this.
 */

interface PerResident {
  readonly revenue: Readonly<Record<string, number>>;
}

interface Base {
  readonly population2024?: number | null;
  readonly state?: PerResident;
}

const PLACES = bases.places as unknown as Readonly<Record<string, Base>>;
const WAGE_TAX = stateIncomeTax2026.places as unknown as Readonly<
  Record<string, { readonly wageIncomeTax: string }>
>;
const EARNINGS = outcomeBases.measures["labor.median-earnings"]
  .places as Readonly<Record<string, number>>;

/** Whether the state began the game with no tax on wages. */
export function beganWithoutWageIncomeTax(stateKey: string): boolean {
  return WAGE_TAX[stateKey]?.wageIncomeTax === "none";
}

const PEERS = Object.entries(WAGE_TAX)
  .filter(([, place]) => place.wageIncomeTax !== "none")
  .map(([key]) => ({
    key,
    people: PLACES[key]?.population2024 ?? 0,
    perResident: PLACES[key]?.state?.revenue.individualIncomeTax ?? null,
    earnings: EARNINGS[key] ?? null,
  }))
  .filter(
    (peer) =>
      peer.people > 0 && peer.perResident !== null && peer.earnings !== null,
  );

// Each state is one example, as the estimated rates in
// `state-income-tax-law.ts` are the plain average of the states' schedules.
const AVERAGE_PER_RESIDENT =
  PEERS.reduce((total, peer) => total + peer.perResident!, 0) / PEERS.length;
const AVERAGE_EARNINGS =
  PEERS.reduce((total, peer) => total + peer.earnings!, 0) / PEERS.length;

export const ADOPTED_INCOME_TAX_BASIS = `ESTIMATED FROM AVERAGE: the ${PEERS.length} states that tax wages collected an average of $${Math.round(AVERAGE_PER_RESIDENT)} of individual income tax per resident in 2022 (Census Bureau state government finances over BEA 2024 population), moved by the state's median earnings against their average ($${Math.round(AVERAGE_EARNINGS)}, Census Bureau 2024 American Community Survey), times the budget calibration factor.`;

/**
 * A year of the adopted tax for a state of `population` residents, in the
 * opening year's dollars; null for a place that began taxing wages or whose
 * earnings are not read.
 */
export function adoptedIncomeTaxPerYear(
  stateKey: string,
  population: number,
): number | null {
  if (!beganWithoutWageIncomeTax(stateKey)) return null;
  const earnings = EARNINGS[stateKey];
  if (earnings === undefined || population <= 0) return null;
  return (
    AVERAGE_PER_RESIDENT *
    (earnings / AVERAGE_EARNINGS) *
    population *
    BUDGET_CALIBRATION
  );
}
