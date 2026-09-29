import moneyBail from "../../../data/research/justice/money-bail-2026.json" with { type: "json" };
import { lawInForce } from "../governing/law-in-force";
import { resourcePositionAt } from "../resource-queries";
import { money } from "../resources";
import { ensureStartingPersonalMoney } from "../starting-money";
import type { EntityId, World } from "../types";

/**
 * Before trial: what the law in force says about money bail, what bail the
 * court sets, and whether the defendant has the money to pay it.
 *
 * The question "Should release before trial be decided without money bail?"
 * is answered for every place by the starting law
 * (`data/research/laws/starting-law-2026.json`), and an enacted law changes
 * the answer from its effective date. Where the answer is no, the court sets
 * money bail and the defendant goes home only if they can pay. Where it is
 * yes, nobody is held for want of money; a judge may hold a defendant only
 * where the law allows it (see `evaluateDetention`).
 */

export const PRETRIAL_VERSION = "justice-pretrial-v1";

const END_CASH_BAIL_QUESTION = "justice-public-safety.end-cash-bail";

/**
 * The bail schedule, the dollar conversion and what a defendant pays to go
 * home are data (`data/research/justice/money-bail-2026.json`) with their
 * sources: the median bail for the charge (Bureau of Justice Statistics, NCJ
 * 243777, table 16) in 2025 dollars, and a tenth of it to go home, ESTIMATED
 * FROM AVERAGE from Illinois' old deposit rule and Florida's regulated bond
 * premium until each place's own rule is read.
 */
const BAIL_2009_DOLLARS: Readonly<Record<string, number>> =
  moneyBail.bail2009Dollars;
const CPI_2009 = moneyBail.cpiU["2009"];
const CPI_2025 = moneyBail.cpiU["2025"];

/** The bail the court sets for an offense, in cents of 2025 dollars. */
export function bailMinorUnits(offenseKey: string): number {
  const dollars2009 =
    BAIL_2009_DOLLARS[offenseKey] ?? BAIL_2009_DOLLARS.default!;
  return Math.round((dollars2009 * CPI_2025) / CPI_2009) * 100;
}

/** What a defendant has to pay to go home on that bail, in cents. */
export function bailDueMinorUnits(offenseKey: string): number {
  return Math.round(
    bailMinorUnits(offenseKey) * moneyBail.toGoHome.shareOfBail,
  );
}

/** The catalog's proposition whose stable key ends with `suffix`. */
export function propositionIdByKey(
  world: World,
  suffix: string,
): EntityId | null {
  for (const [id, proposition] of Object.entries(
    world.policyCatalog.propositions,
  ))
    if (proposition.stableKey.endsWith(suffix)) return id as EntityId;
  return null;
}

/**
 * How the law in force where the case is tried answers the cash bail
 * question: "money-bail" where the court sets bail, "no-money-bail" where
 * release is decided without it, or null where no law answers it.
 */
export function pretrialLawAt(
  world: World,
  venueJurisdictionId: EntityId | null,
): "money-bail" | "no-money-bail" | null {
  if (!venueJurisdictionId) return null;
  const propositionId = propositionIdByKey(world, END_CASH_BAIL_QUESTION);
  if (!propositionId) return null;
  const law = lawInForce(world, venueJurisdictionId, propositionId);
  if (!law) return null;
  return law.answer === "yes" ? "no-money-bail" : "money-bail";
}

/**
 * The money a person has on hand today, in cents, read without changing the
 * saved world. A life whose money the game does not track has none it can
 * spend, the same as a candidate's own money reads.
 */
export function moneyOnHandMinorUnits(
  world: World,
  personId: EntityId,
): number {
  const opened = ensureStartingPersonalMoney(world, personId).world;
  const currency = money(0, "USD").currency;
  return (
    resourcePositionAt(opened, { kind: "person", personId }, currency)
      ?.liquidBalance.minorUnits ?? 0
  );
}
