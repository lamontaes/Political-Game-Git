/**
 * A door touches the counted group (two-level population, owner Oct 11; a
 * short scene at one or two doors, owner Oct 27), in the world the owner
 * plays, in a place and seed nobody chose: an evening of the player's own
 * doors fills in at most `playerDoorFillIns` counted residents, the ones a
 * porch scene could cast; every other counted resident who opens stays
 * counted, is reached as a count, and answers the ask for the vote by the
 * same rule from their record.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import { campaignParameter, PLATFORM_QUESTIONS } from "./campaign-views";
import {
  CAMPAIGNS_MODULE_ID,
  campaignFor,
  knockDoors,
  type PledgeRow,
} from "./modules/campaigns";
import {
  fileCandidacy,
  openContests,
  petitionCirculating,
} from "./modules/elections";
import { drawPlace } from "../../scripts/core2-year/place";

const seed =
  process.env.GOLDEN_PATH_SEED ||
  process.env.DOOR_FILL_SEED ||
  randomBytes(8).toString("hex");

it("an evening of the player's doors fills in only the residents a porch scene could cast", () => {
  for (let draw = 0; draw < 6; draw += 1) {
    const place = process.env.GOLDEN_PATH_PLACE_KEY
      ? { key: process.env.GOLDEN_PATH_PLACE_KEY, name: "", seed }
      : drawPlace(`${seed}:${draw}`, "door-fill-in");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const adult = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0];
    if (!adult) continue;
    let filingId: string | null = null;
    for (const contest of openContests(api)) {
      const result = fileCandidacy(api, {
        personId: adult.id,
        contestId: contest.id,
        platform: [`${PLATFORM_QUESTIONS[0]}=1`],
      });
      if (result.status !== "refused") {
        filingId = result.filing.id;
        break;
      }
    }
    if (!filingId) continue;
    const limit = campaignParameter("playerDoorFillIns");
    const before = new Set(core.people.keys());
    knockDoors(api, {
      filingId,
      canvasserId: adult.id,
      hours: 3,
      fillCounted: limit,
    });
    // A filled-in resident comes with their household: the limit is on the
    // households the evening's doors filled in.
    const filled = new Set(
      [...core.people.values()]
        .filter((p) => !before.has(p.id))
        .map((p) => p.householdId),
    ).size;
    expect(filled, `${where}: households filled in`).toBeLessThanOrEqual(limit);
    const reached = campaignFor(api, filingId).countedReached ?? 0;
    // A town with counted residents: the rest of the evening's counted
    // openers were reached as a count, and their answers are kept.
    if (reached === 0) {
      console.log(`door fill-in: ${where}; no counted resident opened`);
      continue;
    }
    // While a petition circulates the door asks for a signature, not the
    // vote; otherwise every counted resident's answer is kept, counted.
    const asksForVote = !petitionCirculating(api, filingId);
    const countedPledges = (
      api
        .moduleState(CAMPAIGNS_MODULE_ID)
        .table("pledges")
        .query("byCandidate", [adult.id]) as unknown as PledgeRow[]
    ).filter((p) => p.causeId === null);
    for (const p of countedPledges)
      expect(core.people.has(p.voterId), `${where}: ${p.id}`).toBe(false);
    if (!asksForVote) expect(countedPledges).toHaveLength(0);
    console.log(
      `door fill-in: ${where}; ${filled} filled in (limit ${limit}), ${reached} counted reached, ${countedPledges.length} counted yes`,
    );
    return;
  }
  throw new Error(
    `seed ${seed}: no drawn place had counted residents at a door`,
  );
}, 600_000);
