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
const PLACES = 4;
const WEEKS = 160;

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

it(
  "a later filing is the live campaign once the earlier race is over",
  () => {
    const tried: string[] = [];
    for (let n = 0; n < PLACES; n++) {
      const place = drawPlace(runSeed, `campaign-refiling:${n}`);
      const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
      process.stdout.write(`campaign-refiling: ${where}\n`);
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
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
      if (!candidate) {
        tried.push(`${where}: no adult candidate`);
        continue;
      }
      core.playerId = candidate.id;
      const skip = new Set<string>();
      let first: FilingRow | null = null;
      let weeks = 0;
      while (!first && weeks++ < WEEKS) {
        first = fileFor(core, candidate.id, skip);
        if (!first) advanceCore(core, addDays(makeIsoDate(core.date), 7));
      }
      if (!first) {
        tried.push(`${where}: no race took a filing in ${WEEKS} weeks`);
        continue;
      }
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
      ).toEqual([first.id]);
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
      if (!second) {
        tried.push(`${where}: no later race took her filing`);
        continue;
      }
      const note = `${where}; first ${first.id} (${over}), second ${second.id}`;
      const seen = campaignView(core, candidate.id).campaigns.map(
        (c) => c.filing.id,
      );
      expect(seen, `only the race still ahead is a campaign: ${note}`).toEqual([
        second.id,
      ]);
      const view = campaignView(core, candidate.id).campaigns[0]!;
      expect(
        view.outings.find((o) => o.outing === "doors")?.available,
        `the doors are open: ${note}`,
      ).toBe(true);
      // The clerk counts the new petition's signatures, collected at doors.
      const held = petitionOf(api, second.id);
      expect(held, `the new filing has a petition: ${note}`).toBeTruthy();
      expect(
        filedHere(core, candidate.id, second.filedWith)?.id,
        `the counter knows the new filing: ${note}`,
      ).toBe(second.id);
      campaignDay(core, candidate.id, { filingId: second.id, kind: "canvass" });
      gatherSignatures(core, second.id);
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
      return;
    }
    throw new Error(
      `no place gave a second race in ${PLACES}: ${tried.join(" | ")}`,
    );
  },
  PLACES * 300_000,
);
