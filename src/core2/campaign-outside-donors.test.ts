/**
 * A campaign for a seat wider than the town draws on the donors outside it
 * (pool item gov-campaign-statewide-money-town-only): in a place drawn from
 * all 56, a resident files for a governor, Senate, House or legislative seat
 * and the campaign's turns raise money from the adults of its district or
 * state, one record per place group, each donor's gift under the individual
 * limit, the dollars balanced on the journal. Once it has raised enough it
 * buys a poll of real residents. Set GOLDEN_PATH_SEED to reproduce a run.
 * The filing is made through the engine's own fileCandidacy: the played
 * world's wider races file in windows that open after the first year in most
 * places, so each drawn world is played forward to its first state or federal
 * filing window (within two years of the opening) before anyone files, and a
 * place with none is passed over by name.
 */
import { randomBytes } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  CAMPAIGNS_MODULE_ID,
  campaignFor,
  campaignTurn,
  contributionLimit,
  type GiftRow,
  type PollRow,
} from "./modules/campaigns";
import {
  ELECTIONS_MODULE_ID,
  fileCandidacy,
  openContests,
  type ContestRow,
} from "./modules/elections";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const before = setBookkeeping(false);
afterAll(() => {
  setBookkeeping(before);
});

it("a wider race raises from donors outside the town, under the limit, and buys a poll", () => {
  const tried: string[] = [];
  const wide = (c: ContestRow) => c.level === "federal" || c.level === "state";
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "outside-donors");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(world.core);
    // The first state or federal filing window within two years of the
    // opening: the world is played to the day it opens, as a player waits.
    const opening = world.core.date;
    const horizon = addDays(makeIsoDate(opening), 730);
    const opensOn = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    )
      .filter(
        (c) =>
          wide(c) &&
          c.filingDeadline >= opening &&
          (c.filingOpens ?? opening) <= horizon,
      )
      .map((c) => c.filingOpens ?? opening)
      .sort()[0];
    if (!opensOn) {
      tried.push(`${where}: no state or federal filing window by ${horizon}`);
      continue;
    }
    if (opensOn > world.core.date)
      advanceCore(world.core, makeIsoDate(opensOn));
    const adults = [...world.core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          Number(world.core.date.slice(0, 4)) -
            Number(p.birthDate.slice(0, 4)) >=
            35,
      )
      .sort(
        (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
      );
    const wider = openContests(api)
      .filter(wide)
      .sort((a, b) => b.electionDate.localeCompare(a.electionDate));
    let filed: { id: string; contestId: string; personId: string } | undefined;
    const refused = new Set<string>();
    for (const contest of wider) {
      for (const person of adults.slice(0, 6)) {
        const result = fileCandidacy(api, {
          personId: person.id,
          contestId: contest.id,
          platform: [],
        });
        if (result.status === "refused")
          for (const unmet of result.unmet) refused.add(unmet.rule);
        else if (
          ["petitioning", "on-ballot"].includes(result.filing.status ?? "")
        ) {
          filed = result.filing;
          break;
        } else refused.add(`filing ${String(result.filing.status)}`);
      }
      if (filed) break;
    }
    if (!filed) {
      tried.push(
        `${where}: ${wider.length} wider contests open on ${world.core.date}, every filing refused (${[...refused].join(", ") || "none tried"})`,
      );
      continue;
    }
    const filedOn = world.core.date;
    const contest = wider.find((c) => c.id === filed!.contestId)!;
    // This campaign's own polls and gifts, not every campaign's in the world.
    const campaignId = campaignFor(api, filed.id).id;
    const polls = new Map<string, PollRow>();
    for (let turn = 0; turn < 120; turn += 1) {
      advanceCore(world.core, addDays(makeIsoDate(world.core.date), 3));
      campaignTurn(api, filed.id, contest.electionDate);
      for (const row of api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("polls")
        .rows() as unknown as PollRow[])
        if (row.campaignId === campaignId) polls.set(row.id, row);
    }
    const campaign = campaignFor(api, filed.id);
    const gifts = (
      api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("gifts")
        .rows() as unknown as GiftRow[]
    ).filter(
      (g) => g.campaignId === campaignId && g.donorId.startsWith("outside:"),
    );
    process.stderr.write(
      `outside-donors ${where}: filed ${filed.id} on ${filedOn} for ${contest.title}, ${gifts.length} outside gifts, raised ${campaign.raisedMinor}, ${polls.size} polls (${[...polls.keys()].slice(0, 3).join(", ")})\n`,
    );
    if (!gifts.length) {
      tried.push(
        `${where}: filed for ${contest.title} on ${filedOn}, no outside gifts`,
      );
      continue;
    }
    const limit = contributionLimit(api, contest.id).minor;
    expect(limit === null || limit > 0, where).toBe(true);
    // An outside place's row stands for its donors: a whole count of at least
    // one, and the limit read per person, the row's total over its donors.
    for (const gift of gifts) {
      expect(Number.isInteger(gift.donors), `${where}: ${gift.donorId}`).toBe(
        true,
      );
      expect(gift.donors!, `${where}: ${gift.donorId}`).toBeGreaterThan(0);
      if (limit !== null)
        expect(
          gift.totalMinor / gift.donors!,
          `${where}: ${gift.donorId} per person`,
        ).toBeLessThanOrEqual(limit);
    }
    expect(
      campaign.raisedMinor,
      `${where}: a wider race raises past a town's gifts`,
    ).toBeGreaterThan(10_000_000);
    for (const poll of polls.values()) {
      const total = Object.values(poll.answers).reduce((a, b) => a + b, 0);
      expect(total, `${where}: ${poll.id}`).toBe(poll.contacted);
      expect(poll.marginOfError, `${where}: ${poll.id}`).not.toBeNull();
    }
    expect(polls.size, `${where}: a funded campaign polls`).toBeGreaterThan(0);
    if (tried.length)
      process.stderr.write(`outside-donors passed over: ${tried.join("; ")}\n`);
    return;
  }
  throw new Error(
    `no wider race with outside gifts in 6 places (base ${seed}); ${tried.join("; ")}`,
  );
}, 3_600_000);
