/**
 * Campaign money comes from the race's own actors (owner, Nov 17, 2026:
 * "Everything comes from the simulation. Stop pegging things to real
 * numbers"). In a place drawn from all 56, named with its seed:
 *
 * - an ad's reach is bought at the town outlet's own price, a week of its
 *   costs over its followers, never a published cost per thousand;
 * - a donor's means are weighed against their own month of bills, never a
 *   typical $50 gift;
 * - a candidate's spending is weighed against what reaching the race's
 *   voters costs in this world, never a published dollars-per-vote table;
 * - a campaign's money follows what a dollar reaches in this town today and
 *   what the campaign does not know, never fixed shares;
 * - what goes on a rival's record follows that record and the campaign's
 *   own poll, never a fixed share;
 * - donors outside the town give as the campaign's own people in town give,
 *   never a fixed 2% at a published donor's balance.
 *
 * Each case fails on the code before the change: the old constants gave one
 * answer in every world. Set GOLDEN_PATH_SEED to reproduce a run.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { advanceToFilingOpen } from "./gov-test-clock";
import { coreAPI } from "./state";
import type { CoreAPI, CoreState } from "./types";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openRecord } from "./modules/record";
import {
  fileCandidacy,
  openContests,
  openElections,
  type FilingRow,
} from "./modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  adAudience,
  adContactPrice,
  attackCase,
  campaignFor,
  channelWeights,
  commissionPoll,
  contributeOwnMoney,
  openCampaigns,
  spareAgainstGift,
  townGivingSample,
  voterContactPriceMinor,
} from "./modules/campaigns";
import { openParties } from "./modules/parties";
import {
  countedFollowers,
  followersOf,
  openPress,
  outletMonthlyCostMinor,
  outletsHere,
  pressParameter,
} from "./modules/press";
import { viewsModule } from "./modules/views";
import {
  candidateReasons,
  electorateParameter,
  type CandidateInputs,
  type RaceConditions,
} from "./electorate-inputs";
import { campaignParameter } from "./campaign-data";
import { townResidentsByCash } from "./resident-adults-test-kit";

const START = "2026-01-05";
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256")
    .update(`campaign-money-own-actors:${Date.now()}`)
    .digest("hex");

function world(salt: string) {
  const place = drawPlace(runSeed, salt);
  const core = createLifeCore(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: START,
      minimumPeople: 300,
    }),
    { modules: [viewsModule] },
  );
  openLaws(core);
  openOffices(core, place.seed, core.date);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openRecord(core);
  openPress(core);
  return {
    core,
    api: coreAPI(core),
    where: `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`,
  };
}

/** Two residents with money filed in the first contest both qualify for, on the first day a race files here. */
function twoCandidates(
  api: CoreAPI,
  core: CoreState,
): { you: FilingRow; rival: FilingRow } | null {
  advanceToFilingOpen(core);
  const town = (
    api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("town")
      .get("town") as unknown as { townPlaceId: string }
  ).townPlaceId;
  const adults = townResidentsByCash(core, api).filter(
    (p) =>
      p.alive &&
      p.placeId === town &&
      Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
  );
  for (const contest of openContests(api)) {
    const filed: FilingRow[] = [];
    for (const adult of adults) {
      const result = fileCandidacy(api, {
        personId: adult.id,
        contestId: contest.id,
        platform: [],
      });
      if (
        result.status === "refused" ||
        !["petitioning", "on-ballot"].includes(result.filing.status ?? "")
      )
        continue;
      filed.push(result.filing);
      if (filed.length === 2) return { you: filed[0]!, rival: filed[1]! };
    }
  }
  return null;
}

/** A drawn world with a local outlet that sells ad time and two candidates in one race; each place passed over is named. */
function drawn() {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const w = world(`own-actors:${attempt}`);
    if (adContactPrice(w.api) <= 0) {
      tried.push(`${w.where}: no local outlet sells ad time`);
      continue;
    }
    const pair = twoCandidates(w.api, w.core);
    if (!pair) {
      tried.push(`${w.where}: no two candidates for the first contest`);
      continue;
    }
    return { ...w, pair };
  }
  throw new Error(
    `no drawn place suited the case in 8 draws (run seed ${runSeed}): ${tried.join("; ")}`,
  );
}

const found = drawn();
const { api, core, where, pair } = found;
console.log(`campaign-money-own-actors: ${where}`);

describe(`campaign money comes from the race's own actors (${where})`, () => {
  it("an ad buys reach at the town outlet's own price, from its books and followers", () => {
    const local = outletsHere(api).filter((o) => o.tier !== "national");
    const seller = local
      .map((o) => ({
        outlet: o,
        full: followersOf(api, o.id).length,
      }))
      .sort((a, b) => b.full - a.full)[0]!;
    const followers = seller.full + countedFollowers(api, seller.outlet.id);
    const weekOfCosts =
      (outletMonthlyCostMinor(api, seller.outlet) *
        api.parameter("daysPerWeek") *
        pressParameter("monthsPerYear")) /
      pressParameter("daysPerYear");
    expect(weekOfCosts, `${where}: the outlet's costs`).toBeGreaterThan(0);
    // A week of the outlet's costs buys every follower once; half of it,
    // half of them. A published cost per thousand would reach the same
    // number in every town for the same dollars.
    const whole = adAudience(api, Math.ceil(weekOfCosts))!;
    expect(whole.viewers.length + whole.countedViewers).toBe(followers);
    const half = adAudience(api, Math.floor(weekOfCosts / 2))!;
    const reached = half.viewers.length + half.countedViewers;
    expect(reached).toBeGreaterThanOrEqual(Math.floor(followers / 2) - 1);
    expect(reached).toBeLessThanOrEqual(Math.ceil(followers / 2) + 1);
  });

  it("a donor's spare money is weighed against their own bills", () => {
    const spare = { discretionaryMinor: 40_000, savingsMinor: 160_000 };
    const frugal = spareAgainstGift({ ...spare, ownMonthLivingMinor: 90_000 });
    const costly = spareAgainstGift({ ...spare, ownMonthLivingMinor: 600_000 });
    // The same dollars are a reason to give for someone who lives on
    // little and a reason to keep them for someone whose bills are large.
    expect(frugal).toBeGreaterThan(0);
    expect(costly).toBeLessThan(0);
    // At the even span of their own months it pushes neither way.
    const even = campaignParameter("donorSpareMonthsAtEven") * 250_000;
    expect(
      spareAgainstGift({
        discretionaryMinor: even,
        savingsMinor: 0,
        ownMonthLivingMinor: 250_000,
      }),
    ).toBe(0);
    expect(
      spareAgainstGift({
        discretionaryMinor: 0,
        savingsMinor: 0,
        ownMonthLivingMinor: 0,
      }),
    ).toBe(-1);
  });

  it("a candidate's spending is weighed against what reaching the race's voters costs here", () => {
    const candidate: CandidateInputs = {
      id: "fixture:candidate",
      party: null,
      side: 1,
      incumbent: false,
      experienced: false,
      spentMinor: 2_000_000,
      record: 0,
      presidentsParty: false,
      seatPartyHolder: false,
    };
    const conditions = (contactPriceMinor: number): RaceConditions => ({
      cycle: "midterm",
      federal: false,
      contactPriceMinor,
      raceVotes: 10_000,
      approvalGapPoints: 0,
      town: null,
    });
    const price = voterContactPriceMinor(api);
    expect(price, `${where}: the price of a contact`).toBeGreaterThan(0);
    const here = candidateReasons(candidate, conditions(price)).spending;
    const dearer = candidateReasons(candidate, conditions(price * 4)).spending;
    // The same dollars go a shorter way where a contact costs four times
    // as much: by the strength times the log of four.
    expect(here - dearer).toBeCloseTo(
      electorateParameter("spendingSharePerLogUnit") * Math.log(4),
      10,
    );
    // Where the world runs no campaign for the race, no books are read.
    expect(
      candidateReasons({ ...candidate, spentMinor: null }, conditions(price))
        .spending,
    ).toBe(0);
  });

  it("a campaign's money follows this town's prices and what the campaign does not know", () => {
    const campaign = campaignFor(api, pair.you.id);
    const before = channelWeights(api, campaign, 200);
    // Each kind of reach is worth how far it moves a person over its price
    // in this town.
    expect(before.ad).toBeCloseTo(
      campaignParameter("adWarmthWeight") / adContactPrice(api),
      12,
    );
    expect(before.mail).toBeGreaterThan(0);
    // With no poll of its own the campaign knows nothing of where it
    // stands: a poll is worth the mean of what its reach is worth.
    const worth = [before.ad, before.mail, before.event].filter((v) => v > 0);
    expect(before.poll).toBeCloseTo(
      worth.reduce((a, b) => a + b, 0) / worth.length,
      12,
    );
    // It polls; that day a second poll would tell it nothing new, and its
    // worth grows back as the days pass toward election day.
    contributeOwnMoney(api, pair.you.id, 2_000_000);
    const poll = commissionPoll(api, {
      filingId: pair.you.id,
      sampleSize: campaignParameter("pollMinimumInterviews"),
    });
    expect(poll.contacted, `${where}: the poll's interviews`).toBeGreaterThan(
      0,
    );
    const after = channelWeights(api, campaignFor(api, pair.you.id), 200);
    expect(after.poll).toBe(0);
    expect(after.ad).toBe(before.ad);
  });

  it("a rival with no record in office gives an attack nothing to show", () => {
    expect(
      attackCase(
        api,
        campaignFor(api, pair.you.id),
        campaignFor(api, pair.rival.id),
      ),
    ).toBe(0);
  });

  it("the outside donors' rule reads the campaign's own people in town", () => {
    const sample = townGivingSample(api, pair.you.id);
    expect(
      sample.asked,
      `${where}: adults the campaign reaches`,
    ).toBeGreaterThan(0);
    expect(sample.givers).toBeLessThanOrEqual(sample.asked);
    // The mean gift is whole money the givers hold, and the same month
    // reads the same sample.
    if (sample.givers) expect(sample.eachMinor).toBeGreaterThan(0);
    else expect(sample.eachMinor).toBe(0);
    expect(townGivingSample(api, pair.you.id)).toBe(sample);
    void core;
  });
});
