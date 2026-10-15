/**
 * Election day's polling places (owner, Oct 14, 2026: election day is a
 * scene): the town's precincts are sized from the national count of voters
 * per voting location, every named adult has one, and who works it on a day
 * is the precinct's named adults whose own duty and free time rank them first.
 * In a random place.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { createLifeCore } from "./life";
import { coreAPI } from "./state";
import { collapseToTwoLevels } from "./residents";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import {
  openVoting,
  pollingPlaceOf,
  pollingPlaces,
  VOTING_MODULE_ID,
} from "./modules/voting";
import { drawPlace } from "../../scripts/core2-year/place";

const START = "2026-10-20";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`polling:${Date.now()}`).digest("hex");

describe(`polling places (seed ${seed})`, () => {
  it("sizes precincts, places every named adult and reads who works each without writing", () => {
    const place = drawPlace(seed, "polling-places");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    const full = buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: START,
      minimumPeople: 300,
    });
    const player = [...full.people]
      .filter((p) => 2026 - Number(p.birthDate.slice(0, 4)) >= 18)
      .sort((a, b) => a.id.localeCompare(b.id))[0]!;
    const core = createLifeCore(
      collapseToTwoLevels({ ...full, playerId: player.id }),
    );
    openLaws(core);
    openOffices(core, place.seed);
    openElections(core);
    openCampaigns(core);
    openParties(core);
    openVoting(core);
    const api = coreAPI(core);
    const places = pollingPlaces(api);
    expect(places.length, where).toBeGreaterThan(0);
    expect(new Set(places.map((p) => p.id)).size, where).toBe(places.length);
    const rows = () =>
      JSON.stringify(
        api.moduleState(VOTING_MODULE_ID).table("pollingPlaces").rows(),
      );
    const before = rows();
    const adults = [...core.people.values()].filter(
      (p) =>
        p.alive &&
        p.placeId === places[0]!.placeId &&
        2026 - Number(p.birthDate.slice(0, 4)) >= 18,
    );
    for (const adult of adults) {
      const at = pollingPlaceOf(api, adult.id, "2026-11-03");
      expect(at, `${where}: ${adult.id}`).not.toBeNull();
      expect(places.map((p) => p.id)).toContain(at!.id);
      expect(at!.pollWorkers!.ids.length, where).toBeGreaterThan(0);
      // Asked twice, the same reading.
      expect(pollingPlaceOf(api, adult.id, "2026-11-03")).toEqual(at);
    }
    // A reading writes nothing.
    expect(rows(), where).toBe(before);
  }, 300_000);
});
