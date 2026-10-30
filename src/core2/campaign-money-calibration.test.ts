/**
 * Campaign money against local campaign finance (governing lead, Oct 30): a
 * town candidate's raise-money evenings, each asking the people the campaign
 * can reach, each of whom decides from their own reasons, ties and money
 * (`donationAnswer`), add up to what local call time yields. Checked on
 * totals across places drawn from all 56, never on one donor:
 *
 * - dollars per call hour inside $75 to $720 (callTimeDollarsPerHourLocal:
 *   Call Time 101's 10 contacts and 3 to 5 gifts an hour,
 *   https://irp.cdn-website.com/022fb584/files/uploaded/Call_Time_101.pdf);
 * - the mean gift near $144 (localContributionMeanUsd, Worcester council
 *   races: https://thisweekinworcester.com/worcester-council-candidates-raise-400000/),
 *   held to half to twice that, as the row is one city;
 * - the median gift near $50 (localContributionMedianUsd, $35 to $100:
 *   https://www.opb.org/article/2021/08/09/portland-elections-oregon-politics-city-hall-small-donors-campaign-funding/),
 *   widened by a quarter at each end for the spread between drawn towns (at
 *   the fitted donationShareOfMonthPerWarmth, eleven drawn eight-place pools
 *   ran medians of $57 to $113).
 *
 * The world is the opening population (`buildPopulation`), as in
 * campaigns.test.ts: its retirees hold no recorded income award, so they
 * give only from savings beyond their cushion. Payroll withholding is
 * installed (`openBudgets`), so a donor's month is their pay after taxes.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import type { CoreState } from "./types";
import { lawChain, openLaws } from "./modules/laws";
import { openBudgets } from "./modules/budgets";
import { openOffices } from "./modules/offices";
import { openRecord } from "./modules/record";
import {
  fileCandidacy,
  openContests,
  openElections,
  type FilingRow,
} from "./modules/elections";
import { campaignFor, openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openPress } from "./modules/press";
import { viewsModule } from "./modules/views";
import { campaignDayChoices, takeCampaignDayChoice } from "./campaign-day";

const START = "2026-01-05";
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`campaign-money:${Date.now()}`).digest("hex");
const PLACES = Number(process.env.CAMPAIGN_MONEY_PLACES ?? 8);
/** Weeks of campaigning: one evening of doors and one of donor calls each. */
const WEEKS = 10;

interface PlaceRun {
  readonly where: string;
  readonly hours: number;
  readonly asked: number;
  readonly gifts: readonly number[];
  readonly why: Readonly<Record<string, number>>;
}

/** A town candidate's weeks of doors and donor calls, or null where none could file. */
function runPlace(attempt: number): PlaceRun | null {
  const place = drawPlace(runSeed, `campaign-money:${attempt}`);
  const core = createLifeCore(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: START,
      minimumPeople: 300,
    }),
    { modules: [viewsModule] },
  ) as CoreState;
  openLaws(core);
  // Payroll withholds the law in force from every paycheck, as in play, so
  // what a donor has to give from is their pay after those taxes.
  openBudgets(core);
  openOffices(core, place.seed);
  openElections(core);
  openCampaigns(core);
  openParties(core);
  openRecord(core);
  openPress(core);
  const api = coreAPI(core);
  const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
  const town = lawChain(api).townPlaceId;
  // The candidate: a town adult with a wide circle, as a first-time local
  // candidate's money starts with the people they know.
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town &&
        Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 30,
    )
    .sort(
      (a, b) => b.knownIds.size - a.knownIds.size || a.id.localeCompare(b.id),
    );
  // A town seat first (council, mayor), then a county one.
  const contests = [...openContests(api)]
    .filter((c) => c.family === "municipalOffice" || c.level === "county")
    .sort(
      (a, b) =>
        Number(b.family === "municipalOffice") -
          Number(a.family === "municipalOffice") || a.id.localeCompare(b.id),
    );
  let filing: FilingRow | null = null;
  for (const candidate of adults.slice(0, 10)) {
    core.playerId = candidate.id;
    for (const contest of contests) {
      const filed = fileCandidacy(api, {
        personId: candidate.id,
        contestId: contest.id,
        platform: [],
      });
      if (
        filed.status !== "refused" &&
        ["petitioning", "on-ballot"].includes(filed.filing.status ?? "")
      ) {
        filing = filed.filing;
        break;
      }
    }
    if (filing) break;
  }
  if (!filing) return null;
  const id = filing.id;
  const gifts: number[] = [];
  const why: Record<string, number> = {};
  let hours = 0;
  let asked = 0;
  let raisedMinor = 0;
  const offered = (kind: string) =>
    campaignDayChoices(api, id).find((c) => c.kind === kind)?.available;
  for (let week = 0; week < WEEKS; week += 1) {
    if (offered("canvass")) takeCampaignDayChoice(api, id, "canvass");
    if (!offered("raise-money")) continue;
    const got = takeCampaignDayChoice(api, id, "raise-money");
    hours += got.hours;
    asked += got.asked;
    raisedMinor += got.raisedMinor;
    for (const answer of got.answers) {
      why[answer.why] = (why[answer.why] ?? 0) + 1;
      if (answer.givenMinor > 0) gifts.push(answer.givenMinor / 100);
    }
  }
  // Every dollar the evenings raised is on the campaign's books.
  expect(campaignFor(api, id).raisedMinor, `raised: ${where}`).toBe(
    raisedMinor,
  );
  return { where, hours, asked, gifts, why };
}

const median = (list: readonly number[]) => {
  const sorted = [...list].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

describe("campaign money matches local campaign finance", () => {
  it("call-time dollars per hour, the mean gift and the median gift land in the field bands across drawn places", () => {
    const runs: PlaceRun[] = [];
    for (
      let attempt = 0;
      runs.length < PLACES && attempt < PLACES * 3;
      attempt += 1
    ) {
      const run = runPlace(attempt);
      if (run && run.hours > 0) runs.push(run);
    }
    expect(runs.length, `places with a town race, run seed ${runSeed}`).toBe(
      PLACES,
    );
    const rows = runs.map((run) => {
      const raised = run.gifts.reduce((a, b) => a + b, 0);
      return {
        where: run.where,
        hours: run.hours,
        asked: run.asked,
        gifts: run.gifts.length,
        raised: Math.round(raised),
        perHour: Math.round(raised / run.hours),
        mean: run.gifts.length ? Math.round(raised / run.gifts.length) : 0,
        median: run.gifts.length ? median(run.gifts) : 0,
        why: run.why,
      };
    });
    const all = runs.flatMap((r) => r.gifts);
    const hours = runs.reduce((a, r) => a + r.hours, 0);
    const total = all.reduce((a, b) => a + b, 0);
    const summary = {
      runSeed,
      perHour: Math.round(total / hours),
      mean: Math.round(total / Math.max(1, all.length)),
      median: all.length ? median(all) : 0,
      gifts: all.length,
      places: rows,
    };
    govReport("campaign-money-calibration", JSON.stringify(summary));
    const where = rows
      .map((r) => `${r.where}: $${r.perHour}/h, ${r.gifts} gifts`)
      .join("; ");
    // Every place's evenings bring in money from its own people.
    for (const row of rows)
      expect(row.gifts, `gifts: ${row.where}`).toBeGreaterThan(0);
    expect(
      summary.perHour,
      `dollars per call hour: ${where}`,
    ).toBeGreaterThanOrEqual(75);
    expect(
      summary.perHour,
      `dollars per call hour: ${where}`,
    ).toBeLessThanOrEqual(720);
    expect(summary.mean, `mean gift: ${where}`).toBeGreaterThanOrEqual(72);
    expect(summary.mean, `mean gift: ${where}`).toBeLessThanOrEqual(288);
    expect(summary.median, `median gift: ${where}`).toBeGreaterThanOrEqual(26);
    expect(summary.median, `median gift: ${where}`).toBeLessThanOrEqual(125);
  });
});
