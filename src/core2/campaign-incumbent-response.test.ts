/**
 * The incumbent comes home to campaign when a challenger gains (owner, Oct
 * 29: "her campaign gained steam, and then it caused [the incumbent] to try
 * to go back to New York to campaign"; pool item campaign-like-real-races),
 * in a place drawn from all 56 on a seed nobody chose (GOLDEN_PATH_SEED pins
 * one).
 *
 * A world candidate who holds the seat reads where the race stands from what
 * they know, never from true support: here their own campaign's poll, taken
 * after the challenger has walked the town's doors. With the challenger ahead
 * in it, the incumbent's campaign day puts in more hours and more doors than
 * the same day without the poll; living elsewhere, they come home to the
 * town's doors; and their turn keeps the reading once, naming the poll, with
 * an event a scene can name by the row.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { takeCampaignDayChoice } from "./campaign-day";
import type { CoreAPI, CoreState } from "./types";
import type { ModuleRow } from "./module-data";
import { openLaws } from "./modules/laws";
import {
  OFFICES_MODULE_ID,
  openOffices,
  type TermRow,
} from "./modules/offices";
import { openRecord } from "./modules/record";
import {
  fileCandidacy,
  openContests,
  openElections,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  CAMPAIGN_STEPPED_UP_EVENT,
  askForDonation,
  campaignFor,
  campaignTurn,
  commissionPoll,
  openCampaigns,
  raceReading,
  rivalDay,
  steppedUpOf,
  type PollRow,
} from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openPress } from "./modules/press";
import { viewsModule } from "./modules/views";

const START = "2026-01-05";
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256")
    .update(`campaign-incumbent-response:${Date.now()}`)
    .digest("hex");

/** A played-world slice: views, laws, offices, elections, campaigns, parties, the record and the press. */
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
  openOffices(core, place.seed);
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

/**
 * The first open contest whose serving incumbent is a living person who can
 * file again, filed with a challenger: the richest adult the contest's rules
 * let on the ballot. A reason (read from the world's records) where none.
 */
function incumbentRace(
  api: CoreAPI,
  core: CoreState,
):
  | { contest: ContestRow; incumbent: FilingRow; challenger: FilingRow }
  | string {
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
    )
    .sort((a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id));
  const file = (personId: string, contestId: string) => {
    const result = fileCandidacy(api, { personId, contestId, platform: [] });
    return result.status !== "refused" &&
      ["petitioning", "on-ballot"].includes(result.filing.status ?? "")
      ? result.filing
      : null;
  };
  const seen: string[] = [];
  for (const contest of openContests(api)) {
    if (!contest.incumbentTermId) continue;
    const term = api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .get(contest.incumbentTermId) as unknown as TermRow | undefined;
    const holder = term?.personId ? core.people.get(term.personId) : undefined;
    if (term?.status !== "serving" || !holder?.alive) continue;
    const incumbent = file(holder.id, contest.id);
    if (!incumbent) {
      seen.push(`${contest.id}: the incumbent could not file`);
      continue;
    }
    for (const adult of adults) {
      if (adult.id === holder.id) continue;
      const challenger = file(adult.id, contest.id);
      if (challenger) return { contest, incumbent, challenger };
    }
    seen.push(`${contest.id}: no challenger could file`);
  }
  return `no open contest with a serving incumbent who can run again (${seen.join("; ") || "none held"})`;
}

/**
 * A drawn world where the incumbent's own poll, taken after the challenger
 * has walked the town's doors, shows the challenger ahead, and the town's
 * doors are on offer to the incumbent. Up to eight places are drawn; each
 * passed over is named with why.
 */
function threatenedIncumbent() {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const w = world(`incumbent-response:${attempt}`);
    const race = incumbentRace(w.api, w.core);
    if (typeof race === "string") {
      tried.push(`${w.where}: ${race}`);
      continue;
    }
    const { api, core } = w;
    const holder = core.people.get(race.incumbent.personId)!;
    // The challenger's campaign gains steam: weeks of doors in town.
    takeCampaignDayChoice(api, race.challenger.id, "canvass", {
      world: true,
      hours: 400,
    });
    // Nothing else tells the incumbent how the race stands yet.
    if (raceReading(api, race.incumbent.id, holder, holder.placeId)) {
      tried.push(`${w.where}: the incumbent already had a reading`);
      continue;
    }
    // The incumbent's campaign raises what a poll costs from the people it
    // can ask, then commissions one.
    for (const id of [...core.people.keys()].sort())
      askForDonation(api, race.incumbent.id, id);
    const poll = commissionPoll(api, {
      filingId: race.incumbent.id,
      sampleSize: 100,
    });
    const reading = raceReading(api, race.incumbent.id, holder, holder.placeId);
    if (!poll.contacted || !reading || reading.threat <= 0) {
      tried.push(
        `${w.where}: the incumbent's poll (${poll.contacted} answered, ${JSON.stringify(poll.answers)}) does not show the challenger ahead`,
      );
      continue;
    }
    const calm = (town: string) => {
      const polls = api.moduleState(CAMPAIGNS_MODULE_ID).table("polls");
      polls.remove(poll.id);
      const day = rivalDay(api, race.incumbent.id, holder, town);
      polls.put(poll as unknown as ModuleRow);
      return day;
    };
    // The town's doors on offer to them (a town with no door left to knock
    // offers none).
    const home = calm(holder.placeId);
    if (home.doorHours <= 0) {
      tried.push(`${w.where}: the incumbent's day has no doors on offer`);
      continue;
    }
    return { ...w, race, holder, poll, reading, calm };
  }
  throw new Error(
    `no drawn place had a threatened incumbent in 8 draws (run seed ${runSeed}): ${tried.join("; ")}`,
  );
}

describe("the incumbent comes home to campaign when a challenger gains", () => {
  it("an incumbent whose own poll shows the challenger ahead puts in more hours and doors, and keeps the reading once by the poll's id", () => {
    const { core, api, where, race, holder, poll, reading, calm } =
      threatenedIncumbent();
    const filingId = race.incumbent.id;
    // The reading is the poll's: what its respondents said, the challenger ahead.
    expect(reading.sourceKind, where).toBe("poll");
    expect(reading.sourceRecordId, where).toBe(poll.id);
    expect(reading.rivalId, where).toBe(race.challenger.personId);
    expect(reading.rivalShare, where).toBeGreaterThan(reading.ownShare);
    // The same incumbent on the same day, with and without the poll.
    const unthreatened = calm(holder.placeId);
    const threatened = rivalDay(api, filingId, holder, holder.placeId);
    expect(unthreatened.steppedUp, where).toBeNull();
    expect(threatened.steppedUp, where).not.toBeNull();
    const total = (d: typeof threatened) =>
      d.callHours + d.doorHours + d.actHours;
    expect(total(threatened), `${where}: more hours`).toBeGreaterThan(
      total(unthreatened),
    );
    expect(threatened.doorHours, `${where}: more doors`).toBeGreaterThan(
      unthreatened.doorHours,
    );
    expect(threatened.steppedUp!.extraHours, where).toBeCloseTo(
      total(threatened) - total(unthreatened),
    );
    // Living elsewhere, the threat brings them home to the town's doors: a
    // candidate whose day had no doors there now walks them, and one whose
    // short petition already brought them walks more.
    const away = "place:elsewhere";
    const awayCalm = calm(away);
    const awayPressed = rivalDay(api, filingId, holder, away);
    expect(awayPressed.doorHours, `${where}: comes home`).toBeGreaterThan(
      awayCalm.doorHours,
    );
    expect(awayPressed.steppedUp?.cameHome, where).toBe(
      awayCalm.doorHours === 0,
    );
    // The turn keeps the reading, naming the poll, and tells it as an event.
    const electionDate = race.contest.electionDate;
    campaignTurn(api, filingId, electionDate);
    const rows = steppedUpOf(api, filingId);
    const row = rows.find((r) => r.sourceRecordId === poll.id);
    expect(row, `${where}: the turn kept the reading`).toBeDefined();
    expect(row!.sourceKind).toBe("poll");
    expect(row!.rivalId).toBe(race.challenger.personId);
    expect(row!.candidateId).toBe(holder.id);
    expect(row!.threat).toBeCloseTo(reading.threat);
    expect(row!.extraHours, where).toBeGreaterThan(0);
    expect(
      core.eventIds.has(`${CAMPAIGN_STEPPED_UP_EVENT}:${row!.id}`),
      `${where}: the event names the row`,
    ).toBe(true);
    // Once a reading, not once a turn: the same poll is not kept again.
    campaignTurn(api, filingId, electionDate);
    const again = steppedUpOf(api, filingId);
    expect(again.filter((r) => r.sourceRecordId === poll.id).length).toBe(1);
    const polls = (
      api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("polls")
        .query("byContest", [race.contest.id]) as unknown as PollRow[]
    ).filter((p) => p.campaignId === campaignFor(api, filingId).id);
    expect(again.length).toBeLessThanOrEqual(polls.length);
    process.stdout.write(
      `${JSON.stringify({
        where,
        contest: race.contest.id,
        poll: { id: poll.id, contacted: poll.contacted, answers: poll.answers },
        reading,
        unthreatened,
        threatened: { ...threatened, steppedUp: undefined },
        steppedUp: threatened.steppedUp,
        away: { calm: awayCalm.doorHours, pressed: awayPressed.doorHours },
        rows: again.map((r) => r.id),
      })}\n`,
    );
  }, 300_000);
});
