/**
 * A player who filed once and files for a later election campaigns in the
 * later race (play-campaign-shows-last-years-finished-race): the campaign
 * view, the day's choices, the petition and the clerk's counter all read the
 * race that is still ahead, never the finished one, which kept the status
 * "on-ballot" and was first in the list. A random place drawn from all 56.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "./world";
import { buildPopulation } from "../core2/population";
import { createLifeCore } from "../core2/life";
import { openOffices } from "../core2/modules/offices";
import { corePlaceByKey } from "../core2/place-lookup";
import { publishedPlacePopulation } from "../core2/gov-rules/place-population";
import { gameStartDate } from "../core2/game-start";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import { coreAPI } from "../core2/state";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import type { CoreState } from "../core2/types";
import { lawChain } from "../core2/modules/laws";
import {
  ELECTIONS_MODULE_ID,
  type ContestRow,
  fileCandidacy,
  openContests,
  openElections,
  petitionOf,
  type FilingRow,
} from "../core2/modules/elections";
import { resultOf } from "../core2/modules/voting";
import { campaignDayChoices } from "../core2/campaign-day";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { campaignDay, campaignView } from "./campaign";
import { filedHere } from "./filing";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`campaign-refiling:${Date.now()}`).digest("hex");
/** Draws tried (under a second each, about one in thirty qualifies) before the test says no place qualified. */
const DRAWS = 300;
/** A town this size or smaller plays a year quickly. */
const SMALL_TOWN = 25_000;
/** The first race may be this far out, and the later one must open within this many days of the first's election. */
const FIRST_WITHIN_DAYS = 130;
const SECOND_OPENS_WITHIN_DAYS = 60;
const WEEKS = 40;
/** The world opens in September, so the first race is weeks away, not a year (a played year costs minutes). */
const START = `${gameStartDate().slice(0, 4)}-09-01`;

const days = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

/**
 * The place is chosen before anything is simulated, from its own contest
 * calendar (the contests table every world opens with): a small town with a
 * local race and a later local race whose filing window opens soon after the
 * first is decided. "No second filing" then means the code failed, not that
 * the draw was slow.
 */
function qualifies(placeKey: string, seed: string, start: string) {
  const geoid = corePlaceByKey(placeKey)?.sourceGeoid;
  const people = geoid ? publishedPlacePopulation(geoid) : null;
  if (people === null || people > SMALL_TOWN) return null;
  const core = createLifeCore(
    buildPopulation({ seed, placeKey, startedAt: start, minimumPeople: 300 }),
  );
  openOffices(core, seed);
  openElections(core);
  const local = (
    coreAPI(core)
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  ).filter(
    (c) =>
      c.level !== "federal" &&
      c.level !== "state" &&
      c.filingDeadline >= start &&
      c.filingOpens !== null,
  );
  // The first race is the one the weekly walk below files for: the first open by its deadline.
  const first = local
    .filter((c) => days(start, c.filingOpens!) <= 30)
    .sort((a, b) => a.filingDeadline.localeCompare(b.filingDeadline))[0];
  if (!first || days(start, first.electionDate) > FIRST_WITHIN_DAYS)
    return null;
  const second = local.find(
    (c) =>
      c.electionDate > first.electionDate &&
      c.filingDeadline > first.electionDate &&
      days(first.electionDate, c.filingOpens!) <= SECOND_OPENS_WITHIN_DAYS,
  );
  return second ? { people, first, second } : null;
}

function fileFor(
  core: CoreState,
  personId: string,
  skip: ReadonlySet<string>,
): FilingRow | null {
  const api = coreAPI(core);
  for (const contest of openContests(api)) {
    if (contest.level === "federal" || contest.level === "state") continue;
    if (skip.has(contest.id)) continue;
    const filed = fileCandidacy(api, {
      personId,
      contestId: contest.id,
      platform: [`${PLATFORM_QUESTIONS[0]}=1`],
    });
    if (filed.status !== "refused") return filed.filing;
  }
  return null;
}

it("a later filing is the live campaign once the earlier race is over", () => {
  const start = START;
  let drawn: ReturnType<typeof drawPlace> | null = null;
  let plan: NonNullable<ReturnType<typeof qualifies>> | null = null;
  let draws = 0;
  while (!plan && draws < DRAWS) {
    const place = drawPlace(runSeed, `campaign-refiling:${draws++}`);
    plan = qualifies(place.key, place.seed, start);
    if (plan) drawn = place;
  }
  if (!drawn || !plan)
    throw new Error(`no small town with two local races in ${DRAWS} draws`);
  const place = drawn;
  const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}, ${plan.people} people, draw ${draws}; planned first ${plan.first.id} (${plan.first.electionDate}), later ${plan.second.id} (${plan.second.electionDate})`;
  process.stdout.write(`campaign-refiling: ${where}\n`);
  const started = Date.now();
  {
    const { core } = buildBenchWorld(place.seed, start, {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const startYear = Number(core.date.slice(0, 4));
    const candidate = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.placeId === lawChain(api).townPlaceId &&
          startYear - Number(p.birthDate.slice(0, 4)) >= 35,
      )
      .sort(
        (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
      )[0];
    if (!candidate) throw new Error(`no adult candidate: ${where}`);
    core.playerId = candidate.id;
    const skip = new Set<string>();
    let first: FilingRow | null = null;
    let weeks = 0;
    while (!first && weeks++ < WEEKS) {
      first = fileFor(core, candidate.id, skip);
      if (!first) advanceCore(core, addDays(makeIsoDate(core.date), 7));
    }
    if (!first)
      throw new Error(`no race took a filing in ${WEEKS} weeks: ${where}`);
    gatherSignatures(core, first.id);
    const over = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .get(first.contestId) as unknown as ContestRow
    ).electionDate;
    skip.add(first.contestId);
    // The world runs past that election day, then to the next race that takes her filing.
    // The day before, and until the count, the race is the live campaign.
    advanceCore(core, addDays(makeIsoDate(over), -1));
    expect(
      campaignView(core, candidate.id).campaigns.map((c) => c.filing.id),
      `the race is live before its count: ${where}`,
    ).toContain(first.id);
    // The evening of election day, once the count is recorded.
    advanceCore(core, makeIsoDate(over));
    const counted = resultOf(api, first.contestId);
    const evening = campaignView(core, candidate.id).campaigns.find(
      (c) => c.filing.id === first.id,
    );
    expect(counted, `the count is recorded: ${where}`).toBeTruthy();
    expect(evening, `a counted race is not live: ${where}`).toBeUndefined();
    expect(
      campaignDayChoices(api, first.id),
      `a counted race offers no campaign actions: ${where}`,
    ).toEqual([]);
    while (core.date <= over)
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
    let second: FilingRow | null = null;
    weeks = 0;
    while (!second && weeks++ < WEEKS) {
      second = fileFor(core, candidate.id, skip);
      if (!second) advanceCore(core, addDays(makeIsoDate(core.date), 7));
    }
    if (!second)
      throw new Error(
        `no later race took her filing in ${WEEKS} weeks: ${where}`,
      );
    const note = `${where}; first ${first.id} (${over}), second ${second.id}`;
    const seen = campaignView(core, candidate.id).campaigns.map(
      (c) => c.filing.id,
    );
    expect(seen, `the race still ahead is a campaign: ${note}`).toContain(
      second.id,
    );
    expect(seen, `the finished race is not: ${note}`).not.toContain(first.id);
    const view = campaignView(core, candidate.id).campaigns.find(
      (c) => c.filing.id === second.id,
    )!;
    expect(
      view.outings.find((o) => o.outing === "doors")?.available,
      `the doors are open: ${note}`,
    ).toBe(true);
    // The clerk counts the new petition's signatures, collected at doors.
    const held = petitionOf(api, second.id);
    expect(held, `the new filing has a petition: ${note}`).toBeTruthy();
    // The counter holds a filing still ahead (she may stand for two seats there), never the finished one.
    const held_ = filedHere(core, candidate.id, second.filedWith);
    expect(held_, `the counter holds a filing: ${note}`).toBeTruthy();
    expect(seen, `the counter's filing is a live race: ${note}`).toContain(
      held_!.id,
    );
    campaignDay(core, candidate.id, { filingId: second.id, kind: "canvass" });
    gatherSignatures(core, second.id);
    // A place whose law asks no signatures has nothing to count.
    if (held!.needed > 0)
      expect(
        petitionOf(api, second.id)!.signed,
        `signatures counted: ${note}`,
      ).toBeGreaterThan(0);
    expect(
      (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("filings")
          .get(second.id) as unknown as FilingRow
      ).status,
      `on the ballot: ${note}`,
    ).toBe("on-ballot");
    process.stdout.write(
      `campaign-refiling: second filing reached in ${Math.round((Date.now() - started) / 1000)} s\n`,
    );
  }
}, 600_000);
