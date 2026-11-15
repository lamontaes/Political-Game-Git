/**
 * Who a law the outcome web carries into prices reached (tariffs, a bottle
 * deposit): when a business's price review ends a period, each link in the
 * factor its price carried over that period whose cause is a law writes a
 * law-reach row on that business. It reports only: prices, sales and every
 * other record are what they would be without it.
 *
 * The factor the price carried is the one its last review set, read from the
 * web's month row that review stood on (the newest row written by then whose
 * factor is the one the business keeps), so a link that starts or stops in
 * between is credited only for the periods it was in the price. The dollars
 * are the part of the period's sales that factor added, split among its
 * links by each one's share of the factor's logarithm, so the parts add up
 * to the whole whatever the order the links are read in. The law is the row
 * in force the link's lag before that month's row was written, the day the
 * web read it. Links with no law behind them (roads) keep their share
 * unrecorded.
 */
import { lawApplied } from "./applied";
import { lawInForce, LAWS_MODULE_ID } from "../modules/laws";
import { webDayCache, webReachInMonth } from "../outcome-web-reach";
import { WEB_LINKS } from "../outcome-web-model";
import type { CoreAPI } from "../types";

/** The same day `months` earlier (days past the 28th read as the 28th), as the web reads a cause a lag back. */
function dateMonthsBefore(date: string, months: number): string {
  const index =
    Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1 - months;
  const day = date.slice(8, 10);
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-${day > "28" ? "28" : day}`;
}

/** The engine a web-carried price row is recorded under. */
export const WEB_PRICE_ENGINE = "business-prices";
/** What the row records: the extra buyers paid this business because of the law. */
export const WEB_PRICE_WHAT = "price-raised-by-law";

const LAW_OF_LINK: ReadonlyMap<
  string,
  { readonly question: string; readonly lagMonths: number }
> = new Map(
  WEB_LINKS.filter((link) => link.from.startsWith("law:")).map((link) => [
    link.key,
    { question: link.from.slice("law:".length), lagMonths: link.lagMonths },
  ]),
);

/** Two factors that are the same product of the same links (floating error only). */
const SAME_FACTOR = 1e-12;

/** The month row a price set on `reviewedOn` stood on: that month's, or the one before when it was written later that month. */
function periodReach(
  api: CoreAPI,
  placeId: string,
  reviewedOn: string,
  factor: number,
) {
  const month = reviewedOn.slice(0, "YYYY-MM".length);
  const before = dateMonthsBefore(reviewedOn, 1).slice(0, "YYYY-MM".length);
  for (const key of [month, before]) {
    const read = webReachInMonth(api, placeId, key, "household.prices");
    if (
      read &&
      read.date <= reviewedOn &&
      Math.abs(read.reach.factor / factor - 1) < SAME_FACTOR
    )
      return read;
  }
  return null;
}

export function traceWebPriceLaws(
  api: CoreAPI,
  input: {
    readonly organizationId: string;
    readonly placeId: string;
    /** What buyers spent at the business over the review period, at its price. */
    readonly periodSalesMinor: number;
    /** The web's factor on household prices its price carried over the period (its last review's). */
    readonly periodFactor: number;
    /** The day of its last review, when that factor was set. */
    readonly lastReviewedAt: string;
  },
): void {
  if (!api.state.modules.has(LAWS_MODULE_ID)) return;
  if (!(input.periodSalesMinor > 0)) return;
  if (!(input.periodFactor > 0) || input.periodFactor === 1) return;
  const period = periodReach(
    api,
    input.placeId,
    input.lastReviewedAt,
    input.periodFactor,
  );
  if (!period) return;
  const total = Math.log(input.periodFactor);
  // The share of the period's sales the factor added (negative where it cut).
  const added = input.periodSalesMinor * (1 - 1 / input.periodFactor);
  const laws = webDayCache<string | null>(api, "web-price-law");
  for (const part of period.reach.parts) {
    const link = LAW_OF_LINK.get(part.link);
    if (!link) continue;
    const own = Math.log(1 + part.effect * part.weight);
    if (!Number.isFinite(own) || own === 0) continue;
    const readOn = dateMonthsBefore(period.date, link.lagMonths);
    const cached = `${link.question}|${readOn}`;
    let lawId = laws.get(cached);
    if (lawId === undefined) {
      lawId = lawInForce(api, link.question, readOn).governing?.id ?? null;
      laws.set(cached, lawId);
    }
    if (!lawId) continue;
    const today = `${link.question}|today`;
    let inForce = laws.get(today);
    if (inForce === undefined) {
      inForce = lawInForce(api, link.question).governing?.id ?? null;
      laws.set(today, inForce);
    }
    lawApplied(api, {
      lingering: inForce !== lawId,
      key: link.question,
      lawId,
      targetId: input.organizationId,
      target: "organization",
      engine: WEB_PRICE_ENGINE,
      what: WEB_PRICE_WHAT,
      amountMinor: (added * own) / total,
    });
  }
}
