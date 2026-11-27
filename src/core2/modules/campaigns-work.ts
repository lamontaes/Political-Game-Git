/**
 * What a campaign's hours and purchases cost: sellers, unit prices and a day's work.
 *
 * Split out of campaigns.ts by scripts/elections/split-module.ts (structure only);
 * campaigns.ts re-exports every export of this file by name.
 */
import unitPrices from "../../../data/research/campaign-reality/campaign-unit-prices.json" with { type: "json" };
import type { CoreAPI, CoreState } from "../types";
import { worldLevel } from "../world-draw";
import { outsideMarketAccount, townOutsideOf, townRow } from "./campaigns-base";
import { sellerCache } from "./campaigns-constants";

/**
 * The kinds of business that sell what a campaign buys, by the census
 * industry they're recorded under: polling is NAICS 541910 (marketing
 * research and public opinion polling) and mail is 541860 (direct mail
 * advertising), both professional services, or a printer (NAICS 323,
 * manufacturing); an evening's venue is a hall, lodge or restaurant room.
 * A town's campaign-staff firm (political consulting) is the first seller of
 * polls and mail: campaigns are its customers.
 */
const SELLER_KINDS: Readonly<Record<Purchase, readonly string[]>> = {
  poll: ["enterprise:political-consulting", "enterprise:professional-services"],
  mail: [
    "enterprise:political-consulting",
    "enterprise:professional-services",
    "enterprise:manufacturing",
  ],
  event: [
    "enterprise:recreation",
    "enterprise:lodging",
    "enterprise:food-service",
    "enterprise:restaurant",
  ],
};
export type Purchase = "poll" | "mail" | "event";

/**
 * Who sells a campaign what it buys: a business in town of a fitting kind
 * (the first of the first fitting kind, in the order they're recorded), else
 * the town's outside market, where the region's pollsters, printers and halls
 * are paid from the town's outside account like every other purchase the town
 * makes beyond its edge (opening-outside-market.ts). The dollars leave the
 * town as outside money; nothing is made up in town to take them.
 */
export function seller(api: CoreAPI, purchase: Purchase): string {
  const core = api.state as CoreState;
  const town = townRow(api).townPlaceId;
  const cache = sellerCache.get(core) ?? new Map<string, string | null>();
  sellerCache.set(core, cache);
  const employers = core.organizationsByPlaceKind.get(`${town}:employer`);
  const key = `${purchase}|${employers?.size ?? 0}`;
  let found = cache.get(key);
  if (found === undefined) {
    found = null;
    const ids = [...(employers ?? [])].sort();
    for (const kind of SELLER_KINDS[purchase]) {
      found =
        ids.find((id) => core.organizations.get(id)?.classification === kind) ??
        null;
      if (found) break;
    }
    cache.set(key, found);
  }
  return found ?? outsideSeller(api);
}

/**
 * The town's outside account, where a campaign buys what no business in town
 * sells (the postage always: the Postal Service is not in town). A town whose
 * households and firms have bought nothing beyond its edge yet has none; the
 * campaign's purchase opens the place's one outside account
 * (`outsideMarketAccount`), the same account every other purchase from
 * outside the town is paid to.
 */
export function outsideSeller(api: CoreAPI): string {
  const town = townRow(api).townPlaceId;
  const outside = townOutsideOf(api.state.organizations.values(), town);
  if (outside) return outside.id;
  const account = outsideMarketAccount(town, api.state.date);
  api.addOrganization(account);
  return account.id;
}

function priceRow(kind: string) {
  const row = (
    unitPrices as unknown as {
      prices: Record<string, { priceMinorUnits: number; setByLaw?: boolean }>;
    }
  ).prices[kind];
  if (!row) throw new Error(`No campaign unit price: ${kind}`);
  return row;
}

/** A unit price as the campaign price research published it, in minor units: calibration for the world's draw and its checks, never read by play. */
export function publishedUnitPrice(kind: string): number {
  return priceRow(kind).priceMinorUnits;
}

/**
 * A unit price in this world, in minor units: the published market price
 * moved by the world's own draw (owner, Oct 27: realistic, not real), never
 * below one cent. A price the Postal Service or a law sets (postage, a
 * filing fee) stays as published.
 */
export function unitPrice(api: CoreAPI, kind: string): number {
  const row = priceRow(kind);
  return row.setByLaw
    ? row.priceMinorUnits
    : Math.max(
        1,
        Math.round(
          worldLevel(
            row.priceMinorUnits,
            api.state.seed,
            `campaign-world:price:${kind}`,
            "campaignWorldUnitPriceSpreadShare",
          ),
        ),
      );
}

type WorkSchedule = Readonly<{
  anchorDate: string;
  periodDays: number;
  slots: readonly {
    offsetDays: number;
    startMinute: number;
    minutes: number;
  }[];
  startsAt: string;
  endsAt?: string;
}>;

/** Which day of its repeating schedule a work commitment is on, or null on a day it is not in force. */
function scheduleDay(commitment: WorkSchedule, date: string): number | null {
  if (commitment.startsAt > date) return null;
  if (commitment.endsAt !== undefined && commitment.endsAt <= date) return null;
  const days = Math.round(
    (Date.parse(`${date}T00:00:00Z`) -
      Date.parse(`${commitment.anchorDate}T00:00:00Z`)) /
      86_400_000,
  );
  return (
    ((days % commitment.periodDays) + commitment.periodDays) %
    commitment.periodDays
  );
}

/** Whether a work commitment has its holder at a shift at this minute of this day. */
export function atWork(
  commitment: WorkSchedule,
  date: string,
  minute: number,
): boolean {
  const day = scheduleDay(commitment, date);
  return (
    day !== null &&
    commitment.slots.some(
      (slot) =>
        slot.offsetDays === day &&
        minute >= slot.startMinute &&
        minute < slot.startMinute + slot.minutes,
    )
  );
}

/** How many minutes of a work commitment's shifts on this day fall between two minutes of it. */
export function minutesAtWork(
  commitment: WorkSchedule,
  date: string,
  from: number,
  to: number,
): number {
  const day = scheduleDay(commitment, date);
  if (day === null) return 0;
  let minutes = 0;
  for (const slot of commitment.slots)
    if (slot.offsetDays === day)
      minutes += Math.max(
        0,
        Math.min(to, slot.startMinute + slot.minutes) -
          Math.max(from, slot.startMinute),
      );
  return minutes;
}
