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
 * places, so a played-year proof of the same turns waits on the calendar.
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
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "outside-donors");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    tried.push(where);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(world.core);
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
      .filter((c: ContestRow) => c.level === "federal" || c.level === "state")
      .sort((a, b) => b.electionDate.localeCompare(a.electionDate));
    let filed: { id: string; contestId: string; personId: string } | undefined;
    for (const contest of wider) {
      for (const person of adults.slice(0, 6)) {
        const result = fileCandidacy(api, {
          personId: person.id,
          contestId: contest.id,
          platform: [],
        });
        if (
          result.status !== "refused" &&
          result.filing.status === "on-ballot"
        ) {
          filed = result.filing;
          break;
        }
      }
      if (filed) break;
    }
    if (!filed) continue;
    const contest = wider.find((c) => c.id === filed!.contestId)!;
    const polls = new Map<string, PollRow>();
    for (let turn = 0; turn < 120; turn += 1) {
      advanceCore(world.core, addDays(makeIsoDate(world.core.date), 3));
      campaignTurn(api, filed.id, contest.electionDate);
      for (const row of api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("polls")
        .rows() as unknown as PollRow[])
        polls.set(row.id, row);
    }
    const campaign = campaignFor(api, filed.id);
    const gifts = (
      api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("gifts")
        .rows() as unknown as GiftRow[]
    ).filter((g) => g.donorId.startsWith("outside:"));
    console.log(
      `outside-donors ${where}: ${contest.title}, ${gifts.length} outside gifts, raised ${campaign.raisedMinor}, ${polls.size} polls`,
    );
    if (!gifts.length) continue;
    const limit = contributionLimit(api, contest.id).minor;
    expect(limit === null || limit > 0, where).toBe(true);
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
    return;
  }
  throw new Error(
    `no wider race with outside gifts in 6 places; ${tried.join("; ")}`,
  );
}, 3_600_000);
