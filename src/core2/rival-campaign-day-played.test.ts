/**
 * A rival's campaign day in a played world (pool item
 * gov-rival-campaign-day-shared-choices): in a place drawn from all 56 on a
 * seed nobody chose (RIVAL_DAY_SEED pins one), a world candidate who is on a
 * ballot is offered the same campaign-day acts the player has, and the day
 * they take leans on their money and standing: a poorer or less known
 * candidate on calls and doors, a richer or better known one on an event.
 * The acts run through `takeCampaignDayChoice` and are read back by the
 * campaign records they wrote.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { campaignDayChoices, takeCampaignDayChoice } from "./campaign-day";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  ELECTIONS_MODULE_ID,
  standing,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import {
  campaignFor,
  campaignRecognition,
  campaignTurn,
  doorsKnockedOf,
  rivalDay,
} from "./modules/campaigns";
import { coreAPI } from "./state";
import type { CoreAPI } from "./types";

const electionOfFiling = (api: CoreAPI, filing: FilingRow) =>
  (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .get(filing.contestId) as unknown as ContestRow
  ).electionDate;

const seed = process.env.RIVAL_DAY_SEED ?? randomBytes(8).toString("hex");

function attemptPlace(attempt: number): { proven: string } | { tried: string } {
  {
    const place = drawPlace(`${seed}:${attempt}`, "rival-day-played");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    // Play on until a world candidate is on a ballot with an event and an
    // interview on offer.
    const rivalFilings = () =>
      (
        api
          .moduleState(ELECTIONS_MODULE_ID)
          .table("filings")
          .rows() as unknown as FilingRow[]
      ).filter((f) => {
        if (!standing(f) || f.personId === core.playerId) return false;
        const offered = campaignDayChoices(api, f.id, true);
        return (
          core.people.get(f.personId)?.alive === true &&
          offered.some((c) => c.kind === "event" && c.available) &&
          offered.some((c) => c.kind === "interview" && c.available)
        );
      });
    let filings = rivalFilings();
    for (let month = 0; !filings.length && month < 15; month += 1) {
      advanceCore(core, addDays(makeIsoDate(core.date), 30));
      filings = rivalFilings();
    }
    if (!filings.length)
      return {
        tried: `${where}: no world candidate with an event and an interview on offer`,
      };
    // Each world candidate's day, poor and rich: the contrast the item asks
    // for is a candidate whose poor day holds no event and whose rich day
    // does. A candidate the interview suits better (holding the seat, well
    // known) builds either day on that, so the place needs one that shows it.
    const seen: string[] = [];
    let shown = "";
    for (const filing of filings) {
      const campaign = campaignFor(api, filing.id);
      const candidate = core.people.get(campaign.candidateId)!;
      const bank = core.organizations.get(campaign.organizationId)!;
      const town = candidate.placeId;
      const day = () => rivalDay(api, filing.id, candidate, town);
      bank.liquidMinor = 0;
      const poor = day();
      bank.liquidMinor = 50_000_000_00;
      const rich = day();
      seen.push(`${filing.id}: poor ${poor.act}, rich ${rich.act}`);
      if (poor.act === "event" || rich.act !== "event") continue;
      expect(poor.callHours + poor.doorHours, where).toBeGreaterThan(0);
      // Richer: the rival's own turn takes the event through the shared choice.
      const turn = campaignTurn(api, filing.id, electionOfFiling(api, filing));
      expect(turn.dayAct, `${where}: the rich turn holds the event`).toBe(
        "event",
      );
      const event = takeCampaignDayChoice(api, filing.id, "event", {
        world: true,
      });
      expect(event.eventMoneyId, where).toMatch(/^event:/);
      expect(
        event.causeIds.length,
        `${where}: the event reached people`,
      ).toBeGreaterThan(0);
      // Poorer: the day is on calls and doors.
      bank.liquidMinor = 0;
      const calls = takeCampaignDayChoice(api, filing.id, "raise-money", {
        world: true,
        hours: poor.callHours,
      });
      // An interview is on offer and runs through the same choice.
      const interview = takeCampaignDayChoice(api, filing.id, "interview", {
        world: true,
      }).interview;
      expect(interview?.id, `${where}: the interview record`).toBeTruthy();
      shown = `filing ${filing.id} (${candidate.id}) of ${filings.length} on offer; poor day act ${poor.act}, calls ${poor.callHours.toFixed(2)} h, doors ${poor.doorHours.toFixed(2)} h; rich day act ${rich.act} (turn took ${turn.dayAct}); records: event ${event.eventMoneyId} reached ${event.causeIds.length} (first ${event.causeIds[0]}); calls asked ${calls.asked}; interview ${interview?.id}`;
      break;
    }
    // Less known, more of the day on doors; better known, fewer. A candidate
    // already known to the whole town has nothing to show, so one who is not.
    let known = "";
    for (const filing of filings) {
      const campaign = campaignFor(api, filing.id);
      const candidate = core.people.get(campaign.candidateId)!;
      const bank = core.organizations.get(campaign.organizationId)!;
      const share = () => {
        const d = rivalDay(api, filing.id, candidate, candidate.placeId);
        return d.doorHours / (d.callHours + d.doorHours);
      };
      bank.liquidMinor = 0;
      const before = campaignRecognition(api, filing.id);
      if (before >= 0.9) continue;
      const lessKnown = share();
      const doorsBefore = doorsKnockedOf(api, campaign.id).length;
      const peopleBefore = core.people.size;
      const countedBefore = campaignFor(api, filing.id).countedReached ?? 0;
      const doors = takeCampaignDayChoice(api, filing.id, "canvass", {
        world: true,
        hours: 400,
      });
      expect(
        doorsKnockedOf(api, campaign.id).length,
        `${where}: doors knocked`,
      ).toBeGreaterThan(doorsBefore);
      // A world candidate's doors reach the wider population as a count: no
      // counted resident who opened was filled in as a full person.
      expect(
        core.people.size,
        `${where}: a rival's doors filled in no counted resident`,
      ).toBe(peopleBefore);
      // Recognition grows only from someone reached: a heard-of impression or
      // a counted household. A day that reached neither (nobody home) has no
      // recognition to show, so the next candidate is tried.
      const countedReach =
        (campaignFor(api, filing.id).countedReached ?? 0) - countedBefore;
      if (doors.causeIds.length + countedReach === 0) {
        seen.push(`${filing.id}: 400 h of doors reached no one`);
        continue;
      }
      const after = campaignRecognition(api, filing.id);
      expect(after, `${where}: doors made them known`).toBeGreaterThan(before);
      bank.liquidMinor = 0;
      expect(share(), `${where}: better known, fewer doors`).toBeLessThan(
        lessKnown,
      );
      known = `filing ${filing.id}: recognition ${before.toFixed(4)} to ${after.toFixed(4)}, door share ${lessKnown.toFixed(3)} to ${share().toFixed(3)}, doors record ${doors.causeIds[0]}, full people ${peopleBefore} before and after, counted households reached ${countedReach}`;
      break;
    }
    if (shown && known) {
      return { proven: `${where}: ${shown}; ${known}` };
    }
    return {
      tried: `${where}: event contrast ${shown ? "shown" : "not shown"}, recognition contrast ${known ? "shown" : "not shown"} (${seen.join("; ")})`,
    };
  }
}

const proven: string[] = [];
const tried: string[] = [];

// One draw per test, so a long run yields between places; the last test
// fails, naming every place tried, when no draw showed the contrast.
const DRAWS = 5;
for (let attempt = 0; attempt < DRAWS; attempt += 1)
  it(`draw ${attempt}: a played world's rival is offered the player's day acts and leans on them by money and standing`, () => {
    if (proven.length) return;
    const result = attemptPlace(attempt);
    process.stdout.write(`DRAW ${attempt}: ${JSON.stringify(result)}\n`);
    if ("proven" in result) proven.push(result.proven);
    else tried.push(result.tried);
  }, 900_000);

it("some drawn place showed the rival's day leaning on money and standing, with its records", () => {
  expect(
    proven.length,
    `no drawn place showed it in ${DRAWS} draws (seed ${seed}): ${tried.join("; ")}`,
  ).toBeGreaterThan(0);
  process.stdout.write(`PROVEN seed ${seed}: ${proven[0]}\n`);
});
