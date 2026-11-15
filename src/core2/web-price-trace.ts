/**
 * Who a law the outcome web carries into prices reached (tariffs, a bottle
 * deposit): when a business's price review applies the web's factor on
 * household prices, each running link whose cause is a law in force writes a
 * law-reach row on that business. It reports only: prices, sales and every
 * other record are what they would be without it.
 *
 * The dollars are the part of the business's sales over the review period
 * that the web's factor in its price then added (the factor its last review
 * applied), split among the links running now by each one's share of the
 * factor's logarithm, so the parts add up to the whole whatever the order
 * the links are read in. The split is exact while the same links run from
 * one review to the next; in the month a link starts or stops, the period's
 * total is split by the links running at the review. Links with no law
 * behind them (roads) keep their share unrecorded.
 */
import { lawApplied } from "./law-reach/applied";
import { lawInForce, LAWS_MODULE_ID } from "./modules/laws";
import { webReach } from "./outcome-web-reach";
import { WEB_LINKS } from "./outcome-web-model";
import type { CoreAPI } from "./types";

/** The engine a web-carried price row is recorded under. */
export const WEB_PRICE_ENGINE = "business-prices";
/** What the row records: the extra buyers paid this business because of the law. */
export const WEB_PRICE_WHAT = "price-raised-by-law";

const LAW_OF_LINK: ReadonlyMap<string, string> = new Map(
  WEB_LINKS.filter((link) => link.from.startsWith("law:")).map((link) => [
    link.key,
    link.from.slice("law:".length),
  ]),
);

export function traceWebPriceLaws(
  api: CoreAPI,
  input: {
    readonly organizationId: string;
    readonly placeId: string;
    /** What buyers spent at the business over the review period, at its price. */
    readonly periodSalesMinor: number;
    /** The web's factor on household prices its price carried over the period (its last review's). */
    readonly periodFactor: number;
  },
): void {
  if (!api.state.modules.has(LAWS_MODULE_ID)) return;
  if (!(input.periodSalesMinor > 0)) return;
  if (!(input.periodFactor > 0) || input.periodFactor === 1) return;
  const reach = webReach(api, input.placeId, "household.prices");
  const total = Math.log(reach.factor);
  if (!Number.isFinite(total) || total === 0) return;
  // The share of the period's sales the factor added (negative where it cut).
  const added = input.periodSalesMinor * (1 - 1 / input.periodFactor);
  for (const part of reach.parts) {
    const question = LAW_OF_LINK.get(part.link);
    if (!question) continue;
    const own = Math.log(1 + part.effect * part.weight);
    if (!Number.isFinite(own) || own === 0) continue;
    const law = lawInForce(api, question);
    if (!law.governing) continue;
    lawApplied(api, {
      key: question,
      lawId: law.governing.id,
      targetId: input.organizationId,
      target: "organization",
      engine: WEB_PRICE_ENGINE,
      what: WEB_PRICE_WHAT,
      amountMinor: (added * own) / total,
    });
  }
}
