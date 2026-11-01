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
 *
 * With no poll at all, word does it: the challenger's evening of doors is a
 * message the people met can pass on, and once someone who knows both is in
 * touch with the incumbent in the days that follow (the campaigns engine's
 * own day), the incumbent reads the race from the yeses people have told
 * them (someone they know in touch since a yes, a resident at their own
 * campaign's door, counted or full) and steps up where more told them of a
 * yes to the challenger than to them; the same day with those yeses taken
 * away does not.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { addDays, makeIsoDate } from "./kernel/dates";
import { coreAPI } from "./state";
import { campaignDayChoices, takeCampaignDayChoice } from "./campaign-day";
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
  ballot,
  fileCandidacy,
  openContests,
  openElections,
  petitionCirculating,
  petitionOf,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  CAMPAIGN_STEPPED_UP_EVENT,
  CANVASS_MESSAGE_KIND,
  askForDonation,
  campaignFor,
  campaignTurn,
  commissionPoll,
  openCampaigns,
  raceReading,
  rivalDay,
  steppedUpOf,
  type PledgeRow,
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

interface MessageLike {
  readonly id: string;
  readonly kind?: string;
  readonly candidateId: string;
  readonly date: string;
  readonly witnessIds: readonly string[];
}
interface WordLike {
  readonly id: string;
  readonly candidateId: string;
  readonly date: string;
  readonly contestId?: string;
  readonly rivalId?: string;
  readonly messageId?: string;
  readonly tellerId?: string;
}
interface DoorLike {
  readonly id: string;
  readonly campaignId: string;
  readonly householdId: string;
  readonly date: string;
  readonly lastDate?: string;
  readonly told?: Readonly<Record<string, string | null>>;
}

/**
 * The yeses a candidate has been told, recounted from the records the
 * reading names: each yes to a candidate on the ballot held by someone they
 * know in town whose relationship with them was last in touch after that
 * word was first given (pledge row id to the candidate it is for), each yes
 * a resident still in town named at their latest answer at their own
 * campaign's doors and still holds, and everyone those people are.
 */
function toldFromRecords(
  api: CoreAPI,
  core: CoreState,
  candidateId: string,
  town: string,
  contestId: string,
  campaignId: string,
) {
  const campaigns = api.moduleState(CAMPAIGNS_MODULE_ID);
  const pledges = campaigns.table("pledges");
  const candidate = core.people.get(candidateId)!;
  const onBallot = new Set(ballot(api, contestId).map((f) => f.personId));
  onBallot.add(candidateId);
  const store = residentsRuntime(core)?.store;
  const covered = new Set<string>();
  const told = new Map<string, string>();
  for (const id of candidate.knownIds) {
    const person = core.people.get(id);
    if (!person?.alive || person.placeId !== town) continue;
    covered.add(id);
    const [a, b] = [id, candidateId].sort();
    const last = core.relationships.get(`${a}:${b}`)?.lastContactDate;
    for (const pledge of pledges.query("byVoter", [
      id,
    ]) as unknown as PledgeRow[])
      if (
        pledge.contestId === contestId &&
        onBallot.has(pledge.candidateId) &&
        last !== undefined &&
        last > (pledge.firstDate ?? pledge.date)
      )
        told.set(pledge.id, pledge.candidateId);
  }
  const doors = campaigns
    .table("doors")
    .query("byCampaign", [campaignId]) as unknown as DoorLike[];
  const latest = new Map<string, { at: string; yes: string | null }>();
  for (const row of doors)
    for (const [voterId, yes] of Object.entries(row.told ?? {})) {
      const at = row.lastDate ?? row.date;
      if (!latest.has(voterId) || at > latest.get(voterId)!.at)
        latest.set(voterId, { at, yes });
    }
  for (const [voterId, { yes }] of latest) {
    const person = core.people.get(voterId as never);
    const here = person
      ? person.alive && person.placeId === town
      : store?.countedMember(voterId as never) !== undefined;
    if (!here) continue;
    covered.add(voterId);
    const id = `${voterId}|${contestId}|${yes}`;
    if (yes && onBallot.has(yes) && pledges.get(id)) told.set(id, yes);
  }
  const toldTo = (id: string) =>
    [...told].filter(([, c]) => c === id).map(([pledgeId]) => pledgeId);
  return { covered, told, toldTo, doors };
}

/**
 * The rival a reading names is the one told most: no rival on the ballot was
 * told of more yeses (ties by id), and none is named where no rival was told
 * of any.
 */
function expectBestRival(
  api: CoreAPI,
  reading: { readonly rivalId: string | null },
  records: ReturnType<typeof toldFromRecords>,
  candidateId: string,
  contestId: string,
  where: string,
) {
  const rivals = ballot(api, contestId)
    .map((f) => f.personId)
    .filter((id) => id !== candidateId)
    .map((id) => [id, records.toldTo(id).length] as const)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const best = rivals[0];
  expect(reading.rivalId, `${where}: the best rival is named`).toBe(
    best && best[1] > 0 ? best[0] : null,
  );
}

/**
 * A drawn world where the challenger's evening of doors met people the
 * incumbent knows and, in the days that follow, one of them passed word of
 * it on to the incumbent, who has no poll of their own: the word is what
 * they read the race from. Many places pass it over for a reason the world
 * gives (no seat held, no one met who knows the incumbent, or an incumbent
 * their own circle is warmer to), so up to 24 are drawn; each passed over is
 * named with why.
 */
function wordOfDoors() {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const w = world(`incumbent-word:${attempt}`);
    const race = incumbentRace(w.api, w.core);
    if (typeof race === "string") {
      tried.push(`${w.where}: ${race}`);
      continue;
    }
    const { api, core } = w;
    const campaigns = api.moduleState(CAMPAIGNS_MODULE_ID);
    const town = (
      campaigns.table("town").get("town") as unknown as { townPlaceId: string }
    ).townPlaceId;
    // The challenger's campaign gains steam at the doors, an evening of them
    // every day, while the days pass in the world. The campaigns engine's
    // own day passes word of an evening on once someone met at a door who
    // knows the incumbent has been in touch with them since.
    const canvassed = () =>
      new Map(
        (
          campaigns
            .table("messages")
            .query("byContest", [race.contest.id]) as unknown as MessageLike[]
        )
          .filter(
            (m) =>
              m.kind === CANVASS_MESSAGE_KIND &&
              m.candidateId === race.challenger.personId,
          )
          .map((m) => [m.id, m]),
      );
    const wordOf = () => {
      const messages = canvassed();
      return (
        campaigns
          .table("rivalWord")
          .query("byCandidate", [
            race.incumbent.personId,
          ]) as unknown as WordLike[]
      ).find((r) => !!r.messageId && messages.has(r.messageId));
    };
    let word: WordLike | undefined;
    for (let day = 0; day < 60 && !word; day += 1) {
      if (
        campaignDayChoices(api, race.challenger.id, true).find(
          (c) => c.kind === "canvass",
        )?.available
      )
        takeCampaignDayChoice(api, race.challenger.id, "canvass", {
          world: true,
        });
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      word = wordOf();
    }
    if (!word) {
      const holderNow = core.people.get(race.incumbent.personId)!;
      const met = new Set(
        [...canvassed().values()].flatMap((m) =>
          m.witnessIds.filter((id) => holderNow.knownIds.has(id as never)),
        ),
      );
      tried.push(
        `${w.where}: in sixty days of doors (${canvassed().size} evenings kept), word did not reach the incumbent from the ${met.size} met who know them`,
      );
      continue;
    }
    const filingId = race.incumbent.id;
    const polls = (
      campaigns
        .table("polls")
        .query("byContest", [race.contest.id]) as unknown as PollRow[]
    ).filter((p) => p.campaignId === campaignFor(api, filingId).id);
    if (polls.length) {
      tried.push(`${w.where}: the incumbent's campaign took a poll meanwhile`);
      continue;
    }
    const holder = core.people.get(race.incumbent.personId)!;
    const reading = raceReading(api, filingId, holder, town);
    if (!reading || reading.sourceRecordId !== word.id || reading.threat <= 0) {
      tried.push(
        `${w.where}: the word does not show the challenger ahead among the incumbent's circle (${JSON.stringify(reading)})`,
      );
      continue;
    }
    // The same day with no word of any rival.
    const unheard = () => {
      const table = campaigns.table("rivalWord");
      const rows = (
        table.query("byCandidate", [holder.id]) as unknown as WordLike[]
      ).slice();
      for (const row of rows) table.remove(row.id);
      const day = rivalDay(api, filingId, holder, town);
      for (const row of rows) table.put(row as unknown as ModuleRow);
      return day;
    };
    const calm = unheard();
    if (calm.doorHours <= 0 && holder.placeId === town) {
      tried.push(`${w.where}: the incumbent's day has no doors on offer`);
      continue;
    }
    if (
      !campaignDayChoices(api, filingId, true).find((c) => c.kind === "canvass")
        ?.available
    ) {
      tried.push(
        `${w.where}: the town offers the incumbent's canvass no doors`,
      );
      continue;
    }
    const message = canvassed().get(word.messageId!)!;
    return { ...w, race, holder, town, message, word, reading, calm };
  }
  throw new Error(
    `no drawn place passed word of the challenger's doors to the incumbent with more people telling them of a yes to the challenger than to them, in 24 draws (run seed ${runSeed}): ${tried.join("; ")}`,
  );
}

describe("word of a challenger's doors reaches the incumbent", () => {
  it("with no poll, word sets the incumbent reading the yeses people told them; more told for the challenger makes them walk more doors, the turn keeps it by the word's id, and the same day without those yeses does not", () => {
    const {
      core,
      api,
      where,
      race,
      holder,
      town,
      message,
      word,
      reading,
      calm,
    } = wordOfDoors();
    const filingId = race.incumbent.id;
    // The word names the challenger's evening of doors and who passed it on.
    expect(word.rivalId, where).toBe(race.challenger.personId);
    expect(word.contestId, where).toBe(race.contest.id);
    expect(message.witnessIds, where).toContain(word.tellerId);
    expect(holder.knownIds.has(word.tellerId as never), where).toBe(true);
    expect(reading.sourceKind, where).toBe("word");
    expect(reading.rivalId, where).toBe(race.challenger.personId);
    expect(reading.rivalShare, where).toBeGreaterThan(reading.ownShare);
    // The shares are the yeses people told the incumbent, recounted from
    // the pledges, the relationships and the incumbent's own doors rows.
    const campaignId = campaignFor(api, filingId).id;
    const records = toldFromRecords(
      api,
      core,
      holder.id,
      town,
      race.contest.id,
      campaignId,
    );
    const toChallenger = records.toldTo(race.challenger.personId);
    const toIncumbent = records.toldTo(holder.id);
    expect(toChallenger.length, where).toBeGreaterThan(0);
    expect(reading.toldPledgeIds, where).toEqual(
      [...records.told.keys()].sort(),
    );
    expect(reading.rivalShare, where).toBe(
      toChallenger.length / records.covered.size,
    );
    expect(reading.ownShare, where).toBe(
      toIncumbent.length / records.covered.size,
    );
    expect(reading.covered, where).toBe(records.covered.size);
    expectBestRival(api, reading, records, holder.id, race.contest.id, where);
    // The same incumbent on the same day, with and without the word.
    const pressed = rivalDay(api, filingId, holder, town);
    expect(calm.steppedUp, where).toBeNull();
    expect(pressed.steppedUp?.reading.sourceRecordId, where).toBe(word.id);
    expect(pressed.doorHours, `${where}: more doors`).toBeGreaterThan(
      calm.doorHours,
    );
    // The twin: the same day, the same word, with the yeses to the
    // challenger that were told taken away (each a pledge someone in touch
    // since, or someone at the incumbent's doors, still held). The threat
    // is gone, and the day steps up nothing, so the turn keeps no row.
    const pledges = api.moduleState(CAMPAIGNS_MODULE_ID).table("pledges");
    const heldRows = toChallenger.map((id) => pledges.get(id)!);
    expect(
      heldRows.every((row) => row !== undefined),
      where,
    ).toBe(true);
    for (const row of heldRows) pledges.remove(row.id);
    const untold = raceReading(api, filingId, holder, town);
    const untoldDay = rivalDay(api, filingId, holder, town);
    for (const row of heldRows) pledges.put(row);
    expect(untold?.sourceRecordId, where).toBe(word.id);
    expect(
      untold?.toldPledgeIds?.filter((id) => toChallenger.includes(id)),
      where,
    ).toEqual([]);
    expect(
      untold!.threat,
      `${where}: no yeses told, no threat`,
    ).toBeLessThanOrEqual(0);
    expect(untoldDay.steppedUp, `${where}: no stepped-up row`).toBeNull();
    expect(raceReading(api, filingId, holder, town), where).toEqual(reading);
    // The turn keeps the reading, naming the word, and tells it as an event.
    campaignTurn(api, filingId, race.contest.electionDate);
    const row = steppedUpOf(api, filingId).find(
      (r) => r.sourceRecordId === word.id,
    );
    expect(row, `${where}: the turn kept the word`).toBeDefined();
    expect(row!.sourceKind).toBe("word");
    expect(row!.rivalId).toBe(race.challenger.personId);
    expect(
      core.eventIds.has(`${CAMPAIGN_STEPPED_UP_EVENT}:${row!.id}`),
      `${where}: the event names the row`,
    ).toBe(true);
    // An evening of the incumbent's own doors: everyone who answers tells
    // the campaign the yeses they hold, kept on the home's doors row, and
    // the reading counts each told yes from those rows as it does the
    // circle's.
    takeCampaignDayChoice(api, filingId, "canvass", {
      world: true,
      hours: 400,
    });
    const after = toldFromRecords(
      api,
      core,
      holder.id,
      town,
      race.contest.id,
      campaignId,
    );
    const doorTold = after.doors.flatMap((door) =>
      Object.entries(door.told ?? {}),
    );
    expect(doorTold.length, `${where}: residents answered`).toBeGreaterThan(0);
    const readingAfter = raceReading(api, filingId, holder, town)!;
    expect(readingAfter.toldPledgeIds, where).toEqual(
      [...after.told.keys()].sort(),
    );
    expect(readingAfter.rivalShare, where).toBe(
      after.toldTo(readingAfter.rivalId!).length / after.covered.size,
    );
    expect(readingAfter.ownShare, where).toBe(
      after.toldTo(holder.id).length / after.covered.size,
    );
    expectBestRival(
      api,
      readingAfter,
      after,
      holder.id,
      race.contest.id,
      where,
    );
    process.stdout.write(
      `${JSON.stringify({
        where,
        contest: race.contest.id,
        message: { id: message.id, met: message.witnessIds.length },
        word,
        reading: { ...reading, toldPledgeIds: undefined },
        covered: records.covered.size,
        toldToChallenger: toChallenger,
        toldToIncumbent: toIncumbent.length,
        untold: { ...untold, toldPledgeIds: undefined },
        calm: { ...calm, steppedUp: undefined },
        pressed: { ...pressed, steppedUp: undefined },
        steppedUp: row,
        afterCanvass: {
          answered: doorTold.length,
          covered: after.covered.size,
          toldToChallenger: after.toldTo(race.challenger.personId).length,
          toldToIncumbent: after.toldTo(holder.id).length,
          threat: readingAfter.threat,
        },
      })}\n`,
    );
  }, 900_000);
});

/**
 * The played world (`buildBenchWorld`, every module, the two-level
 * population) in a drawn place, where the challenger's canvass, which
 * reaches counted residents as a count, took yeses from some, and the
 * incumbent's own canvass then walked the town's doors the same day, once
 * both petitions are in; then the days pass in the world until word of a
 * rival reaches the incumbent, and the reading it sets them on is read.
 * Up to six places are drawn; each passed over is named with why (no seat
 * held, a petition out past eight months, no counted resident who said yes
 * opening the incumbent's door, no word within 150 days, or no counted
 * resident's yes left told by then).
 */
function countedAtTheDoor() {
  const tried: string[] = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const place = drawPlace(runSeed, `incumbent-counted:${attempt}`);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const w = {
      core,
      api,
      where: `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`,
    };
    const race = incumbentRace(api, core);
    if (typeof race === "string") {
      tried.push(`${w.where}: ${race}`);
      continue;
    }
    const campaigns = api.moduleState(CAMPAIGNS_MODULE_ID);
    // A circulating petition's doors ask for signatures, not the vote: the
    // days pass in the world until both petitions are in, if that is within
    // eight months (the soonest contest's, `openContests`).
    const filingIds = [race.challenger.id, race.incumbent.id];
    const circulating = () =>
      filingIds.some((id) => petitionCirculating(api, id));
    const due = filingIds
      .map((id) => petitionOf(api, id)?.due ?? "")
      .sort()
      .at(-1)!;
    const limit = addDays(makeIsoDate(core.date), 240);
    if (circulating() && due > limit) {
      tried.push(`${w.where}: a petition circulates until ${due}`);
      continue;
    }
    if (circulating()) advanceCore(core, addDays(makeIsoDate(due), 1));
    while (circulating() && core.date <= limit)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const canvasses = (filingId: string) =>
      campaignDayChoices(api, filingId, true).find((c) => c.kind === "canvass")
        ?.available;
    if (!canvasses(race.challenger.id) || !canvasses(race.incumbent.id)) {
      tried.push(
        `${w.where}: a canvass has no doors on offer on ${core.date} (petitions circulating: ${circulating()})`,
      );
      continue;
    }
    takeCampaignDayChoice(api, race.challenger.id, "canvass", {
      world: true,
      hours: 400,
    });
    const countedYeses = (
      campaigns
        .table("pledges")
        .query("byCandidate", [
          race.challenger.personId,
        ]) as unknown as PledgeRow[]
    ).filter(
      (p) =>
        p.contestId === race.contest.id && !core.people.has(p.voterId as never),
    );
    if (!countedYeses.length) {
      tried.push(
        `${w.where}: no counted resident said yes at the challenger's doors by ${core.date}`,
      );
      continue;
    }
    const campaignId = campaignFor(api, race.incumbent.id).id;
    const toldAt = () =>
      (
        campaigns
          .table("doors")
          .query("byCampaign", [campaignId]) as unknown as DoorLike[]
      ).flatMap((door) =>
        Object.entries(door.told ?? {}).map(([voterId, yes]) => ({
          door,
          voterId,
          yes,
          counted: !core.people.has(voterId as never),
          pledgeId: `${voterId}|${race.contest.id}|${race.challenger.personId}`,
        })),
      );
    // What the incumbent's doors were told before this evening.
    const before = new Map(
      toldAt().map((t) => [`${t.door.id}|${t.voterId}`, t.yes]),
    );
    takeCampaignDayChoice(api, race.incumbent.id, "canvass", {
      world: true,
      hours: 400,
    });
    const told = toldAt();
    const doors = new Set(told.map((t) => t.door.id));
    // Told this evening: an answer the doors rows did not hold before.
    const fresh = told.filter(
      (t) => before.get(`${t.door.id}|${t.voterId}`) !== t.yes,
    );
    const pledges = campaigns.table("pledges");
    const counted = told.filter(
      (t) =>
        t.counted &&
        t.yes === race.challenger.personId &&
        pledges.get(t.pledgeId) !== undefined,
    );
    if (!counted.length) {
      tried.push(
        `${w.where}: of ${countedYeses.length} counted residents who said yes to the challenger, none opened the incumbent's door (${told.length} answered it)`,
      );
      continue;
    }
    // What each who answered this evening holds now, before the days pass.
    const heldNow = (voterId: string) =>
      (pledges.query("byVoter", [voterId]) as unknown as PledgeRow[]).find(
        (p) => p.contestId === race.contest.id,
      )?.candidateId ?? null;
    const answeredThisEvening = fresh.map((t) => ({
      ...t,
      held: heldNow(t.voterId),
    }));
    const firstHeld = heldNow(counted[0]!.voterId);
    const firstPledge = pledges.get(counted[0]!.pledgeId) as unknown as
      PledgeRow | undefined;
    // The days pass in the world (both campaigns' own turns, word passing
    // as the campaigns engine passes it) until word of a rival sets the
    // incumbent reading the race, or 150 days, or the eve of the election.
    const holder = core.people.get(race.incumbent.personId)!;
    const town = (
      campaigns.table("town").get("town") as unknown as { townPlaceId: string }
    ).townPlaceId;
    const eve = addDays(makeIsoDate(race.contest.electionDate), -1);
    const waitUntil = [addDays(makeIsoDate(core.date), 150), eve].sort()[0]!;
    let reading: ReturnType<typeof raceReading> = null;
    while (core.date < waitUntil && reading?.sourceKind !== "word") {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      reading = holder.alive
        ? raceReading(api, race.incumbent.id, holder, town)
        : null;
    }
    if (reading?.sourceKind !== "word") {
      tried.push(
        `${w.where}: no word of a rival set the incumbent reading the race by ${core.date}`,
      );
      continue;
    }
    const records = toldFromRecords(
      api,
      core,
      holder.id,
      town,
      race.contest.id,
      campaignId,
    );
    // A counted resident is never someone the incumbent knows: their told
    // yes came through the incumbent's own doors.
    const countedTold = records
      .toldTo(race.challenger.personId)
      .filter((id) => !core.people.has(id.split("|")[0] as never));
    if (!countedTold.length) {
      tried.push(
        `${w.where}: word came on ${core.date}, by when no counted resident still held a yes to the challenger they told the incumbent's doors`,
      );
      continue;
    }
    return {
      ...w,
      race,
      campaignId,
      doors,
      told,
      answeredThisEvening,
      counted,
      countedYeses,
      firstHeld,
      firstPledge,
      holder,
      town,
      reading,
      records,
      countedTold,
    };
  }
  throw new Error(
    `no drawn place had a counted resident who said yes to the challenger open the incumbent's door and still tell it when word reached the incumbent, in 6 draws (run seed ${runSeed}): ${tried.join("; ")}`,
  );
}

describe("counted residents tell the incumbent's canvass by the same rule", () => {
  it("a counted resident who holds a yes to the challenger and opens the incumbent's door is kept on the home's doors row, as a full person is, and the reading word sets the incumbent on counts it", () => {
    // Bookkeeping is a debug switch, off in the played world.
    const was = setBookkeeping(false);
    let drawn: ReturnType<typeof countedAtTheDoor>;
    try {
      drawn = countedAtTheDoor();
    } finally {
      setBookkeeping(was);
    }
    const {
      api,
      core,
      where,
      race,
      campaignId,
      doors,
      told,
      answeredThisEvening,
      counted,
      countedYeses,
      firstHeld,
      firstPledge,
      holder,
      reading,
      records,
      countedTold,
    } = drawn;
    // One rule for both tiers: whoever answered that evening, full or
    // counted, told the campaign whom they had given their word to in the
    // contest (nothing had changed it since, so what they told is what
    // they held).
    expect(
      answeredThisEvening.length,
      `${where}: residents answered`,
    ).toBeGreaterThan(0);
    for (const t of answeredThisEvening)
      expect(t.yes, `${where}: ${t.voterId}`).toBe(t.held);
    // The counted resident's yes to the challenger was a pledge row they
    // held, kept on the incumbent's own doors row for their home.
    const first = counted[0]!;
    expect(firstPledge?.id, where).toBe(first.pledgeId);
    expect(firstHeld, where).toBe(race.challenger.personId);
    expect(first.door.campaignId, where).toBe(campaignId);
    expect(first.door.id, where).toBe(
      `${campaignId}|${first.door.householdId}`,
    );
    // Word of a rival set the incumbent reading the race: the rival's share
    // is the people they know in touch since a yes to the challenger plus
    // the residents who told their own canvass of one, by pledge id,
    // counted residents among them, over everyone it heard from.
    expect(reading!.sourceKind, where).toBe("word");
    expect(reading!.toldPledgeIds, where).toEqual(
      [...records.told.keys()].sort(),
    );
    for (const id of countedTold)
      expect(reading!.toldPledgeIds, where).toContain(id);
    expect(reading!.covered, where).toBe(records.covered.size);
    expect(reading!.ownShare, where).toBe(
      records.toldTo(holder.id).length / records.covered.size,
    );
    expectBestRival(api, reading!, records, holder.id, race.contest.id, where);
    expect(reading!.rivalShare, where).toBe(
      reading!.rivalId
        ? records.toldTo(reading!.rivalId).length / records.covered.size
        : 0,
    );
    process.stdout.write(
      `${JSON.stringify({
        where,
        contest: race.contest.id,
        countedYesesToChallenger: countedYeses.length,
        incumbentDoors: doors.size,
        answered: told.length,
        answeredThatEvening: {
          full: answeredThisEvening.filter((t) => !t.counted).length,
          counted: answeredThisEvening.filter((t) => t.counted).length,
        },
        countedAnswered: told.filter((t) => t.counted).length,
        countedToldChallenger: counted.length,
        first: { door: first.door.id, pledgeId: first.pledgeId },
        reading: {
          date: core.date,
          ...reading,
          toldPledgeIds: undefined,
          toldToChallenger: records.toldTo(race.challenger.personId).length,
          toldToIncumbent: records.toldTo(holder.id).length,
          countedToldToChallenger: countedTold.length,
          firstCountedPledgeIds: countedTold.slice(0, 3),
        },
      })}\n`,
    );
  }, 1_200_000);
});
