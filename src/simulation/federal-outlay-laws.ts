/**
 * Federal laws that change what the federal government spends: a law that
 * makes Congress cut spending before it raises the debt limit, and a law that
 * spends more on foreign aid.
 *
 * - Debt limit: a yes cuts federal outlays each year by what the one deal on
 *   record that paired a debt-limit rise with cuts took out, the Fiscal
 *   Responsibility Act of 2023 (CBO: $1.5 trillion less deficit over ten
 *   years, 2.1% of fiscal year 2025 outlays a year). The cut reaches states,
 *   counties and cities as a cut in federal aid of the same share, the part of
 *   their revenue that comes from Washington (`public-budgets/month.ts`);
 *   ESTIMATED FROM AVERAGE, since the game's federal aid is one line and the
 *   deal's cuts fell on discretionary programs.
 * - Foreign aid: a yes raises International Affairs outlays by the median
 *   yearly rise in the years they rose (6.7%, Treasury Monthly Treasury
 *   Statement), on their fiscal year 2025 level. Research 1 finds no measured
 *   effect of aid on U.S. places, so it moves the deficit and nothing else.
 *
 * Both change the federal deficit, and a deficit moves what states pay to
 * borrow: about 25 basis points on long-term rates for each point of GDP
 * (Laubach 2009). The outcome web reads the deficit change as the cause
 * `federal.deficit-change-pct-of-gdp` (`outcome-web/index.ts`). A law
 * answering no ends the change the day it takes effect.
 */
import terms from "../../data/research/federal/federal-outlay-terms-fy2025.json" with { type: "json" };
import { lawInForce } from "./governing/law-in-force";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import type { IsoDate, World } from "./types";

export const DEBT_LIMIT_CUTS_QUESTION =
  "us-federal-positions:budget.pay-for-a-higher-debt-limit";
export const INCREASE_FOREIGN_AID_QUESTION =
  "us-federal-positions:foreign-affairs.increase-foreign-aid";

/** The share of federal outlays a debt-limit deal that pays for itself cuts each year. */
export const DEBT_LIMIT_CUT_SHARE = terms.debtLimitCut.share;

/** Dollars a year that a law to spend more on foreign aid adds. */
export const FOREIGN_AID_RISE_DOLLARS = terms.foreignAid.yearlyDollars;

function enactedYes(
  world: World,
  questionKey: string,
  onDate: IsoDate,
): string | null {
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find((definition) => definition.stableKey === questionKey);
  if (!proposition) return null;
  const law = lawInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    proposition.id,
    onDate,
    "enacted-only",
  );
  return law && law.origin === "enacted" && law.answer === "yes"
    ? law.measureId
    : null;
}

/** What the laws in force change in federal outlays a year, and the laws that did. */
export function federalOutlayChangeAt(
  world: World,
  onDate: IsoDate,
): {
  readonly cutDollars: number;
  readonly aidDollars: number;
  readonly lawMeasureIds: readonly string[];
} {
  const cut = enactedYes(world, DEBT_LIMIT_CUTS_QUESTION, onDate);
  const aid = enactedYes(world, INCREASE_FOREIGN_AID_QUESTION, onDate);
  return {
    cutDollars: cut ? terms.debtLimitCut.yearlyDollars : 0,
    aidDollars: aid ? FOREIGN_AID_RISE_DOLLARS : 0,
    lawMeasureIds: [cut, aid].filter((id): id is string => id !== null),
  };
}

/** The change in the federal deficit the laws make, in percent of GDP. */
export function federalDeficitChangePctOfGdp(
  world: World,
  onDate: IsoDate,
): number {
  const { cutDollars, aidDollars } = federalOutlayChangeAt(world, onDate);
  return ((aidDollars - cutDollars) / terms.nationalGdp2025) * 100;
}

/** The share of its federal aid a government still gets under the laws in force. */
export function federalAidFactor(world: World, onDate: IsoDate): number {
  return enactedYes(world, DEBT_LIMIT_CUTS_QUESTION, onDate)
    ? 1 - DEBT_LIMIT_CUT_SHARE
    : 1;
}
