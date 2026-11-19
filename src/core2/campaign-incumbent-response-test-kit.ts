/**
 * Shared setup for the incumbent-response tests (split across files so a shard runs them in parallel): the drawn places, the played world, the race finders and the readers of the records.
 */
import { randomBytes } from "node:crypto";
import { expect } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { advanceCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { addDays, makeIsoDate } from "./kernel/dates";
import { coreAPI } from "./state";
import { campaignDayChoices, takeCampaignDayChoice } from "./campaign-day";
import type { CoreAPI, CoreState } from "./types";
import type { ModuleRow } from "./module-data";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { holderOf } from "./modules/officials";
import {
  ballot,
  fileCandidacy,
  openContests,
  petitionCirculating,
  petitionOf,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import {
  CAMPAIGNS_MODULE_ID,
  CANVASS_MESSAGE_KIND,
  askForDonation,
  campaignFor,
  commissionPoll,
  raceReading,
  rivalDay,
  type PledgeRow,
  type PollRow,
} from "./modules/campaigns";
import { advanceToFilingOpen } from "./gov-test-clock";
import { townResidentsByCash } from "./resident-adults-test-kit";

export const START = "2026-01-05";

/**
 * Each case draws its places (owner, Nov 17: "be random with it"): a case that
 * needs a particular situation (an open race with a serving incumbent who can
 * run again and a poll showing the challenger ahead; a challenger's evening of
 * doors whose word reaches the incumbent; a counted resident who says yes and
 * opens the incumbent's door) takes the first drawn place where it holds, and
 * names every place it passed over and why. GOLDEN_PATH_SEED replays a draw.
 */
export interface DrawnPlace {
  readonly name: string;
  readonly state: string;
  readonly key: string;
  readonly seed: string;
}

export const seed =
  process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

export function* drawnPlaces(
  purpose: string,
  count: number,
): Generator<DrawnPlace> {
  for (let at = 0; at < count; at += 1) {
    const drawn = drawPlace(seed, `incumbent-response:${purpose}:${at}`);
    yield {
      name: drawn.name,
      state: drawn.state,
      key: drawn.key,
      seed: drawn.seed,
    };
  }
}

/**
 * A drawn place where one case found its race is tried first by the cases
 * after it: each case's needs (an open race with a serving incumbent who can
 * run again and a challenger who can file) are the same ones, and a place
 * that lacks them costs a world and several filing openings to find out. The
 * place was still drawn; the later cases then go on drawing their own.
 */
export const goodPlaces: DrawnPlace[] = [];

export function* placesFor(
  purpose: string,
  count: number,
): Generator<DrawnPlace> {
  for (const place of [...goodPlaces]) yield place;
  for (const place of drawnPlaces(purpose, count))
    if (!goodPlaces.some((g) => g.key === place.key)) yield place;
}

export function rememberGood(place: DrawnPlace) {
  if (!goodPlaces.some((g) => g.key === place.key)) goodPlaces.push(place);
}

export const THREATENED_PLACES = () => placesFor("threatened", 8);

export const WORD_PLACES = () => placesFor("word", 24);

export const COUNTED_PLACES = () => placesFor("counted", 8);

/** The played world (`buildBenchWorld`, every module, the two-level population) in a drawn place: town seats are held by residents with their own circles, as in play. */
export function world(place: DrawnPlace) {
  process.stdout.write(
    `incumbent-response: looking at ${place.name}, ${place.state} (${place.key}), place seed ${place.seed}\n`,
  );
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  return {
    core,
    api: coreAPI(core),
    where: `${place.name}, ${place.state} (${place.key}), place seed ${place.seed}`,
  };
}

/**
 * The first open contest whose serving incumbent is a living person who can
 * file again, filed with a challenger: the richest adult the contest's rules
 * let on the ballot. A reason (read from the world's records) where none.
 */
export function incumbentRace(
  api: CoreAPI,
  core: CoreState,
):
  | { contest: ContestRow; incumbent: FilingRow; challenger: FilingRow }
  | string {
  const adults = townResidentsByCash(core, coreAPI(core)).filter(
    (p) =>
      p.alive &&
      Number(START.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
  );
  const file = (personId: string, contestId: string) => {
    const result = fileCandidacy(api, { personId, contestId, platform: [] });
    // An incumbent who is running again has filed already, as in play (the
    // world files them): their filing stands, it is not a refusal.
    if (
      result.status === "refused" &&
      result.unmet.some((u) => u.rule === "already-filed")
    )
      return (
        ballot(api, contestId).find((f) => f.personId === personId) ?? null
      );
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
    if (term?.status !== "serving") continue;
    // A seat's holder is a named official until someone meets them; the
    // engine's own path makes them a person (holderOf), as a race does.
    const holderId = holderOf(api, term).personId;
    const holder = holderId ? core.people.get(holderId) : undefined;
    if (!holder?.alive) continue;
    const incumbent = file(holder.id, contest.id);
    if (!incumbent) {
      seen.push(`${contest.id}: the incumbent could not file`);
      continue;
    }
    for (const adult of adults) {
      if (adult.id === holder.id) continue;
      const challenger = file(adult.id, contest.id);
      if (!challenger) continue;
      // The case is a two-way race: a poll names the one rival. A contest
      // already holding other candidates (a ticket's running mate, a third
      // party) names whoever leads, which is a different premise.
      const others = ballot(api, contest.id).filter(
        (f) => f.id !== incumbent.id && f.id !== challenger.id,
      );
      if (others.length) {
        seen.push(
          `${contest.id}: ${others.length} other candidate(s) on the ballot`,
        );
        break;
      }
      return { contest, incumbent, challenger };
    }
    seen.push(`${contest.id}: no challenger could file`);
  }
  return `no open contest with a serving incumbent who can run again (${seen.join("; ") || "none held"})`;
}

/**
 * The race the case needs, waited for: a place's town elections open their
 * filing on the place's own calendar, so a world looked at on one day holds no
 * open contest in most places. The world is played to the next day a filing
 * opens (`advanceToFilingOpen`), a few openings at most, until a contest with
 * a serving incumbent who can run again and a challenger who can file is
 * open; the reason of the last look, and the day reached, is returned where
 * none opens.
 */
export function raceInPlace(w: { api: CoreAPI; core: CoreState }) {
  let reason = "";
  for (let opening = 0; opening < 6; opening += 1) {
    const race = incumbentRace(w.api, w.core);
    if (typeof race !== "string") return race;
    reason = race;
    const before = w.core.date;
    if (openContests(w.api).length) {
      // Open, but not one that holds the case: the next opening may.
      advanceCore(w.core, addDays(makeIsoDate(w.core.date), 1));
      advanceToFilingOpen(w.core);
    } else advanceToFilingOpen(w.core);
    if (w.core.date === before) break;
  }
  return `${reason} (looked at each filing opening to ${w.core.date})`;
}

/**
 * A drawn world where the incumbent's own poll, taken after the challenger
 * has walked the town's doors, shows the challenger ahead, and the town's
 * doors are on offer to the incumbent. Up to eight places are drawn; each
 * passed over is named with why.
 */
export function threatenedIncumbent() {
  const tried: string[] = [];
  for (const place of THREATENED_PLACES()) {
    const w = world(place);
    const race = raceInPlace(w);
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
    process.stdout.write(
      `incumbent-response (threatened): used ${w.where}; passed over ${tried.length}: ${tried.join("; ") || "none"}\n`,
    );
    rememberGood(place);
    return { ...w, race, holder, poll, reading, calm };
  }
  throw new Error(
    `no drawn place had a threatened incumbent (seed ${seed}): ${tried.join("; ")}`,
  );
}

export interface MessageLike {
  readonly id: string;
  readonly kind?: string;
  readonly candidateId: string;
  readonly date: string;
  readonly witnessIds: readonly string[];
}

export interface WordLike {
  readonly id: string;
  readonly candidateId: string;
  readonly date: string;
  readonly contestId?: string;
  readonly rivalId?: string;
  readonly messageId?: string;
  readonly tellerId?: string;
}

export interface DoorLike {
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
export function toldFromRecords(
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
export function expectBestRival(
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
export function wordOfDoors() {
  const tried: string[] = [];
  for (const place of WORD_PLACES()) {
    const w = world(place);
    const race = raceInPlace(w);
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
    // The challenger's campaign has gained steam before the days begin: weeks
    // of doors in town (as in the threatened case), so their yeses can outnumber
    // the incumbent's among those who tell the incumbent. A world incumbent
    // usually leads the yeses people tell, so a race where the challenger leads
    // is the one this case reads.
    takeCampaignDayChoice(api, race.challenger.id, "canvass", {
      world: true,
      hours: 400,
    });
    let word: WordLike | undefined;
    // Every evening of the sixty, gathered day by day: the engine keeps a
    // message only while word of it can still pass on (`foldRivalWord`).
    const evenings = new Map<string, MessageLike>();
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
      for (const [id, message] of canvassed()) evenings.set(id, message);
      word = wordOf();
    }
    if (!word) {
      const holderNow = core.people.get(race.incumbent.personId)!;
      const met = new Set(
        [...evenings.values()].flatMap((m) =>
          m.witnessIds.filter((id) => holderNow.knownIds.has(id as never)),
        ),
      );
      tried.push(
        `${w.where}: in sixty days of doors (${evenings.size} evenings), word did not reach the incumbent from the ${met.size} met who know them`,
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
    process.stdout.write(
      `incumbent-response (word): used ${w.where}; passed over ${tried.length}: ${tried.join("; ") || "none"}\n`,
    );
    rememberGood(place);
    return { ...w, race, holder, town, message, word, reading, calm };
  }
  throw new Error(
    `no drawn place passed word of the challenger's doors to the incumbent with more people telling them of a yes to the challenger than to them, in the drawn places (seed ${seed}): ${tried.join("; ")}`,
  );
}

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
export function countedAtTheDoor() {
  const tried: string[] = [];
  for (const place of COUNTED_PLACES()) {
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const w = {
      core,
      api,
      where: `${place.name}, ${place.state} (${place.key}), place seed ${place.seed}`,
    };
    const race = raceInPlace(w);
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
    process.stdout.write(
      `incumbent-response (counted): used ${w.where}; passed over ${tried.length}: ${tried.join("; ") || "none"}\n`,
    );
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
    `no drawn place had a counted resident who said yes to the challenger open the incumbent's door and still tell it when word reached the incumbent, in the drawn places (seed ${seed}): ${tried.join("; ")}`,
  );
}

/**
 * A candidate's evenings of doors, each the day's own hours (the game's
 * canvass choice, no hours given), one a day for `evenings` days; the clock
 * stands on the last evening's day.
 */
export function walkEvenings(
  api: CoreAPI,
  core: CoreState,
  filingId: string,
  evenings: number,
): void {
  for (let i = 0; i < evenings; i += 1) {
    if (
      campaignDayChoices(api, filingId, true).find((c) => c.kind === "canvass")
        ?.available
    )
      takeCampaignDayChoice(api, filingId, "canvass", { world: true });
    if (i < evenings - 1) advanceCore(core, addDays(makeIsoDate(core.date), 1));
  }
}
