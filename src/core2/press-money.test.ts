/**
 * Pool item gov-press-outlet-revenue. A local paper earns from its readers'
 * subscriptions, each paid from a reader household's own living cost (the
 * counted households by the same rule, times their readers), and from the ads
 * the town's businesses buy out of their own costs; the standing outside
 * payment is gone. A one-year played world in a place drawn from all 56; set
 * GOLDEN_PATH_SEED to reproduce the draw.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import stopgaps from "./data/stopgaps.json" with { type: "json" };
import { addDays, makeIsoDate } from "./kernel/dates";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import {
  followersOf,
  outletsHere,
  pressParameter,
  PRESS_MODULE_ID,
} from "./modules/press";
import { residentsRuntime } from "./modules/residents";
import type { AdBuyRow, OutletRevenueMonthRow } from "./press-money";
import { coreAPI } from "./state";
import type { CashJournalReceipt } from "./journal-state";
import type { CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const YEAR_DAYS = 365;

it(`a paper's revenue is its readers' subscriptions and local businesses' ads, and follows its audience (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "press-money");
    const where = `${place.name} (${place.key}), seed ${place.seed}, base ${seed}:${draw}`;
    const { core: world } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world as CoreState;
    const api = coreAPI(core);
    const rt = residentsRuntime(core);
    // A town with a local paper and a full household that reads it.
    const paper = outletsHere(api).find(
      (o) => o.tier === "local" && o.kind === "newspaper",
    );
    const reader = paper
      ? followersOf(api, paper.id)
          .map((id) => core.people.get(id))
          .find(
            (p) =>
              p?.householdId &&
              rt?.flows.get(`residents:outside-living:${p.householdId}`),
          )
      : undefined;
    if (!paper || !reader) {
      tried.push(`${where}: no local paper with a full reader household`);
      continue;
    }
    // The standing outside payment is gone.
    expect(
      [...(rt?.flows.keys() ?? [])].filter((id) =>
        id.startsWith("outside-sales:press:"),
      ),
      where,
    ).toEqual([]);
    const home = core.households.get(reader.householdId!)!;
    const living = rt!.flows.get(`residents:outside-living:${home.id}`)!;
    // Keep the journal's receipts for the reader household's payer.
    core.focusPersonIds.add(living.payerId);
    advanceCore(core, addDays(makeIsoDate(core.date), YEAR_DAYS));
    const months = (
      api
        .moduleState(PRESS_MODULE_ID)
        .table("revenueMonths")
        .query("byOutlet", [paper.id]) as unknown as OutletRevenueMonthRow[]
    )
      .slice()
      .sort((a, b) => a.month.localeCompare(b.month));
    const subs = (m: OutletRevenueMonthRow) =>
      m.subscriptionsFullMinor + m.subscriptionsCountedMinor;
    // A paper that closed in the year is paid by no one after: it cannot
    // show a year's money or the next ad, so another place is drawn.
    const closed = core.finance.businesses
      .get(paper.organizationId)
      ?.closedAt?.slice(0, 7);
    if (closed) {
      for (const m of months.filter((row) => row.month > closed))
        expect(
          subs(m) + m.adsMinor,
          `${where}: ${m.month}, after it closed`,
        ).toBe(0);
      tried.push(`${where}: the paper closed in ${closed}`);
      continue;
    }
    const open = months.filter((m) => m.month > months[0]!.month);
    for (const m of open)
      expect(subs(m), `${where}: ${m.month}'s subscriptions`).toBeGreaterThan(
        0,
      );
    const paid = open;
    // Subscriptions are the readers times the price, at most, over the year:
    // a household short of cash pays its living cost, and its subscription,
    // in part, and the rest in a later month.
    const price =
      (pressParameter("newspaperRevenuePerFollowerYear") *
        pressParameter("newspaperCirculationShare")) /
      pressParameter("monthsPerYear");
    const subsYear = paid.reduce((n, m) => n + subs(m), 0);
    const readerMonths = paid.reduce((n, m) => n + m.readers, 0);
    expect(
      subsYear / readerMonths,
      `${where}: per reader-month`,
    ).toBeLessThanOrEqual(price * 1.01);
    const steps = paid.slice(1).map((m, i) => ({
      month: m.month,
      readers: Math.sign(m.readers - paid[i]!.readers),
      revenue: Math.sign(subs(m) - subs(paid[i]!)),
    }));
    if (
      !steps.some((s) => s.readers > 0) ||
      !steps.some((s) => s.readers < 0)
    ) {
      tried.push(`${where}: the paper's readers did not both rise and fall`);
      continue;
    }
    // Its revenue rose in a month its readers rose, and fell in one they fell.
    const trail = steps
      .map((s) => `${s.month} ${s.readers}/${s.revenue}`)
      .join(" ");
    expect(
      steps.some((s) => s.readers > 0 && s.revenue > 0),
      `${where}: ${trail}`,
    ).toBe(true);
    expect(
      steps.some((s) => s.readers < 0 && s.revenue < 0),
      `${where}: ${trail}`,
    ).toBe(true);
    // The named reader household paid the paper from its own cash.
    const receipt = [
      ...(core.cashJournal.detailedByOwner.get(living.payerId) ?? []),
    ]
      .map((id) => core.cashJournal.detailedReceipts.get(id))
      .find(
        (r) =>
          r?.sourceRef.id.startsWith(`${living.id}@`) &&
          r.owners.get(paper.organizationId) !== undefined,
      );
    expect(
      receipt,
      `${where}: ${home.id}'s subscription to ${paper.organizationId}`,
    ).toBeDefined();
    const own = receipt!.owners.get(living.payerId)!;
    const to = receipt!.owners.get(paper.organizationId)!;
    expect(own.afterMinor, receipt!.id).toBeLessThan(own.beforeMinor);
    expect(to.afterMinor, receipt!.id).toBeGreaterThan(to.beforeMinor);
    // A named local business bought an ad from its own costs. Receipts are
    // kept for people only, so with the year's money already checked the
    // world keeps every receipt for the days until the next ad is bought: a
    // month's ads are bought with its first cost payments, which a business
    // makes weekly or, in a large city, a few weeks apart.
    const adsOf = () =>
      api
        .moduleState(PRESS_MODULE_ID)
        .table("adBuys")
        .query("byOutlet", [paper.id]) as unknown as AdBuyRow[];
    expect(
      adsOf().length,
      `${where}: ads bought from ${paper.id} in the year`,
    ).toBeGreaterThan(0);
    const journal = core.cashJournal;
    core.observer = true;
    let found: { ad: AdBuyRow; receipt: CashJournalReceipt } | undefined;
    for (let day = 0; day < 62 && !found; day += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      for (const ad of adsOf().filter((row) => row.date === core.date)) {
        const receipt = [
          ...(journal.detailedByOwner.get(ad.advertiserId) ?? []),
        ]
          .map((id) => journal.detailedReceipts.get(id))
          .find((r) => r?.sourceRef.id === ad.transferId);
        if (receipt && (!found || ad.amountMinor > found.ad.amountMinor))
          found = { ad, receipt };
      }
    }
    core.observer = false;
    expect(
      found,
      `${where}: an ad payment on the journal (the paper's last ads: ${adsOf()
        .map((row) => row.date)
        .slice(-6)
        .join(", ")})`,
    ).toBeDefined();
    const { ad, receipt: adReceipt } = found!;
    const buyer = adReceipt.owners.get(ad.advertiserId)!;
    const seller = adReceipt.owners.get(paper.organizationId)!;
    expect(buyer.afterMinor, adReceipt.id).toBeLessThan(buyer.beforeMinor);
    expect(seller.afterMinor - seller.beforeMinor, adReceipt.id).toBe(
      ad.amountMinor,
    );
    expect(
      core.organizations.get(ad.advertiserId)?.placeId,
      `${where}: ${ad.advertiserId} is a town business`,
    ).toBe(paper.placeId);
    // The stopgap is closed.
    expect(
      stopgaps.find((row) => row.id === "SG-PEOPLE-press-outlet-revenue")
        ?.status,
    ).toBe("resolved");
    const year = months.map(
      (m) =>
        `${m.month}: readers ${m.readers.toFixed(1)}, subscriptions ${subs(m)} (${m.subscriberPayments} full payments), ads ${m.adsMinor} (${m.adPayments}), wider audience ${m.shortfallMinor}`,
    );
    process.stdout.write(
      `PRESS MONEY ${where}: ${paper.organizationId}\n  ${year.join("\n  ")}\n  reader ${reader.id} of ${home.id} paid in ${receipt!.id} (${receipt!.sourceRef.id}: ${own.beforeMinor - own.afterMinor} from ${living.payerId}, ${to.afterMinor - to.beforeMinor} to the paper)\n  ad ${ad.id}: ${ad.advertiserId} paid ${ad.amountMinor} in ${ad.transferId} in ${adReceipt.id} (its cash ${buyer.beforeMinor} to ${buyer.afterMinor}; the paper's ${seller.beforeMinor} to ${seller.afterMinor})\n`,
    );
    return;
  }
  throw new Error(
    `no drawn place showed the paper's money: ${tried.join("; ")}`,
  );
}, 1_800_000);
