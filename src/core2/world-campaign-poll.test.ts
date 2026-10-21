/**
 * A world campaign (a candidate who is not the controlled person) buys a poll
 * in the played world, and the poll is read from real residents' records: its
 * answers add up to the people contacted, each respondent is a record in the
 * world, and it carries a margin of error. Places drawn from all 56; the
 * place, seed and poll ids print.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { CAMPAIGNS_MODULE_ID, type PollRow } from "./modules/campaigns";
import { residentPerson } from "./modules/residents";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const MOST_PLACES = 5;

it(`a world campaign buys a poll of real residents in the played world, seed ${seed}`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let attempt = 0; attempt < MOST_PLACES; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "world-campaign-poll");
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    advanceCore(core, addDays(makeIsoDate(core.date), 420));
    const campaigns = api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("campaigns")
      .rows() as unknown as { id: string; candidateId: string }[];
    const polls = (
      api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("polls")
        .rows() as unknown as PollRow[]
    ).filter(
      (poll) =>
        campaigns.find((c) => c.id === poll.campaignId)?.candidateId !==
        core.playerId,
    );
    const where = `${place.name} [${place.key}] seed ${place.seed}`;
    tried.push(`${where}: ${polls.length} world polls`);
    if (!polls.length) continue;
    const poll = polls.find((row) => row.contacted > 0) ?? polls[0]!;
    const total = Object.values(poll.answers).reduce((a, b) => a + b, 0);
    expect(total, `${where}: ${poll.id} answers add up`).toBe(poll.contacted);
    expect(poll.respondentIds.length, where).toBe(poll.contacted);
    for (const id of poll.respondentIds)
      expect(
        core.people.has(id) || residentPerson(core, id) !== undefined,
        `${where}: respondent ${id} is a record`,
      ).toBe(true);
    if (poll.contacted > 0)
      expect(poll.marginOfError, where).toBeGreaterThan(0);
    console.log(
      `world-campaign-poll: ${where}: poll ${poll.id} (campaign ${poll.campaignId}, ${poll.date}) contacted ${poll.contacted}, margin ${poll.marginOfError}`,
    );
    return;
  }
  throw new Error(
    `no drawn place had a world campaign poll in 420 days (seed ${seed}): ${tried.join("; ")}`,
  );
}, 3_000_000);
