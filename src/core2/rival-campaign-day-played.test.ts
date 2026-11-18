/**
 * A rival's campaign day in a played world (pool item
 * gov-rival-campaign-day-shared-choices): a world candidate who is on a
 * ballot is offered the same campaign-day acts the player has, and the day
 * they take leans on their money and standing: a poorer or less known
 * candidate on calls and doors, a richer or better known one on an event.
 * The acts run through `takeCampaignDayChoice` and are read back by the
 * campaign records they wrote.
 *
 * Pinned (pinned-tests): each case names its place, seed, contest and the
 * day its world starts, so a rival is on a ballot within a few days and no
 * place is drawn or passed over. A case whose premise is not true fails
 * naming the place, the seed and the contest.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { campaignDayChoices, takeCampaignDayChoice } from "./campaign-day";
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
  townDoorCount,
  townShareOfRace,
} from "./modules/campaigns";
import { coreAPI } from "./state";
import type { CoreAPI } from "./types";

interface Pin {
  readonly name: string;
  readonly key: string;
  readonly seed: string;
  /** The day the world starts: inside the pinned contest's filing window. */
  readonly start: string;
  readonly contestId: string;
}

/** A town race (the town is the whole electorate), in a council with rivals filed by June. */
const FLUSHING: Pin = {
  name: "Flushing, Michigan",
  key: "2629200",
  seed: "2d52cc38e0d07e243741fa1f37ad5c3eefb14a63af2cb23c360d0dd8a0f742f7",
  start: "2025-06-19",
  contestId: "contest:seat:gus2025:106328:council:0:2025-11-04",
};
/** A statewide special (filed by early May; the world starts at game start): the town holds 0.0002 of the race's voters. */
const KIRBY: Pin = {
  name: "Kirby, Wyoming",
  key: "5642730",
  seed: "e2c89bdf506a144e1bc3624d1a5dbedb86f7911e4a6df969adb7e1f0c28e73a8",
  start: "2025-01-20",
  contestId: "contest:seat:US-WY:secretary-of-state:2025-08-02:special",
};
/** A town council race where the pinned rival can walk every door the town has. */
const CAPAC: Pin = {
  name: "Capac, Michigan",
  key: "2613140",
  seed: "a3cbd278d04af1450584269dfd85eef98b032266e1701011510a7cd1f7db8003",
  start: "2025-06-19",
  contestId: "contest:seat:gus2025:204671:council:0:2025-11-04",
};

const electionOfFiling = (api: CoreAPI, filing: FilingRow) =>
  (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .get(filing.contestId) as unknown as ContestRow
  ).electionDate;

/**
 * The pinned world, played day by day until a world candidate stands in the
 * pinned contest with an event on offer; fails naming the place if none does
 * within `maxDays` days.
 */
function rivalIn(pin: Pin, maxDays = 20) {
  const where = `${pin.name} (${pin.key}), seed ${pin.seed}, contest ${pin.contestId}, from ${pin.start}`;
  const { core } = buildBenchWorld(pin.seed, pin.start, {
    twoLevel: true,
    placeKey: pin.key,
  });
  const api = coreAPI(core);
  const rivals = () =>
    (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("filings")
        .rows() as unknown as FilingRow[]
    ).filter(
      (f) =>
        f.contestId === pin.contestId &&
        standing(f) &&
        f.personId !== core.playerId &&
        core.people.get(f.personId)?.alive === true &&
        campaignDayChoices(api, f.id, true).some(
          (c) => c.kind === "event" && c.available,
        ),
    );
  for (let day = 0; day < maxDays && !rivals().length; day += 1)
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const filing = rivals()[0];
  if (!filing)
    throw new Error(
      `no world candidate on the ballot with an event on offer within ${maxDays} days: ${where}`,
    );
  const campaign = campaignFor(api, filing.id);
  const candidate = core.people.get(campaign.candidateId)!;
  const bank = core.organizations.get(campaign.organizationId)!;
  return { core, api, filing, campaign, candidate, bank, where };
}

it("a rival with doors left leans on money and standing, over days of their own hours", () => {
  const { core, api, filing, campaign, candidate, bank, where } =
    rivalIn(FLUSHING);
  expect(townShareOfRace(api, filing.contestId), `town race: ${where}`).toBe(1);
  const doorsLeft = () =>
    townDoorCount(api) - doorsKnockedOf(api, campaign.id).length;
  expect(doorsLeft(), `doors left: ${where}`).toBeGreaterThan(0);
  const day = () => rivalDay(api, filing.id, candidate, candidate.placeId);

  // Poor, the day is on calls and doors; rich, it holds an event.
  bank.liquidMinor = 0;
  const poor = day();
  bank.liquidMinor = 50_000_000_00;
  const rich = day();
  expect(poor.act, `the poor day holds no event: ${where}`).not.toBe("event");
  expect(rich.act, `the rich day holds the event: ${where}`).toBe("event");
  expect(poor.callHours + poor.doorHours, where).toBeGreaterThan(0);
  const turn = campaignTurn(api, filing.id, electionOfFiling(api, filing));
  expect(turn.dayAct, `the rich turn holds the event: ${where}`).toBe("event");
  const event = takeCampaignDayChoice(api, filing.id, "event", { world: true });
  expect(event.eventMoneyId, where).toMatch(/^event:/);
  expect(
    event.causeIds.length,
    `the event reached people: ${where}`,
  ).toBeGreaterThan(0);

  // Poorer: a day of calls, then an interview through the same choice.
  bank.liquidMinor = 0;
  takeCampaignDayChoice(api, filing.id, "raise-money", {
    world: true,
    hours: poor.callHours,
  });
  const interview = takeCampaignDayChoice(api, filing.id, "interview", {
    world: true,
  }).interview;
  expect(interview?.id, `the interview record: ${where}`).toBeTruthy();

  // Doors: the days' own hours, one day at a time as play does. Each day's
  // doors add to the households reached, reach the wider population as a
  // count (no counted resident filled in as a full person), and make the
  // rival better known; a better known rival gives doors a smaller share of
  // the day.
  const share = () => {
    bank.liquidMinor = 0;
    const d = day();
    return d.doorHours / (d.callHours + d.doorHours);
  };
  const doorsBefore = doorsKnockedOf(api, campaign.id).length;
  const peopleBefore = core.people.size;
  const knownBefore = campaignRecognition(api, filing.id);
  const shareBefore = share();
  const DAYS = 7;
  for (let n = 0; n < DAYS; n += 1) {
    bank.liquidMinor = 0;
    const hours = day().doorHours;
    takeCampaignDayChoice(api, filing.id, "canvass", { world: true, hours });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  }
  expect(
    doorsKnockedOf(api, campaign.id).length,
    `doors knocked over ${DAYS} days: ${where}`,
  ).toBeGreaterThan(doorsBefore);
  expect(core.people.size, `no counted resident filled in: ${where}`).toBe(
    peopleBefore,
  );
  const knownAfter = campaignRecognition(api, filing.id);
  expect(knownAfter, `doors made them known: ${where}`).toBeGreaterThan(
    knownBefore,
  );
  expect(share(), `better known, fewer doors: ${where}`).toBeLessThan(
    shareBefore,
  );
}, 110_000);

it("a candidate for a statewide race holds no town event from the town's share of its voters", () => {
  const { api, filing, bank, where } = rivalIn(KIRBY, 120);
  const share = townShareOfRace(api, filing.contestId);
  expect(share, `the town's share of the race: ${where}`).toBeLessThan(0.01);
  bank.liquidMinor = 50_000_000_00;
  // One turn owes the town its share of an event, far short of one.
  const turn = campaignTurn(api, filing.id, electionOfFiling(api, filing));
  expect(
    turn.dayAct,
    `no town event from a share of ${share}: ${where}`,
  ).toBeNull();
}, 75_000);

it("a rival whose town's doors are all knocked adds none", () => {
  const { api, filing, campaign, candidate, bank, where } = rivalIn(CAPAC);
  expect(townShareOfRace(api, filing.contestId), `town race: ${where}`).toBe(1);
  bank.liquidMinor = 0;
  const walkAll = () =>
    takeCampaignDayChoice(api, filing.id, "canvass", {
      world: true,
      hours: 100_000,
    });
  walkAll();
  expect(
    doorsKnockedOf(api, campaign.id).length,
    `every door of ${candidate.placeId} knocked: ${where}`,
  ).toBe(townDoorCount(api));
  const knocked = doorsKnockedOf(api, campaign.id).length;
  walkAll();
  expect(
    doorsKnockedOf(api, campaign.id).length,
    `another day adds no door: ${where}`,
  ).toBe(knocked);
}, 35_000);
