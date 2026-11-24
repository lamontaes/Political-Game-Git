/**
 * A governor's cabinet is drawn from the state's people where they live
 * (executive-cabinet-drawn-from-the-state). Before, every secretary was a
 * household copied from the played town's counted people and moved into it,
 * so a small town far from the capital had its own transportation secretary
 * and adjutant general knocking about. Now a secretary lives where the state's
 * people put them: in the played town only when it is the state's seat, or
 * when the draw by who lives where lands there.
 *
 * Pinned: Edgar, Wisconsin (5522550), seed edgar-petition-1, a small town that
 * is not the seat; Pierre, South Dakota (4649600), seed pierre-cabinet-1, the
 * seat, where the cabinet lives in town.
 */
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { corePlaceByJurisdictionId } from "./place-lookup";
import { coreAPI } from "./state";
import { appointmentsIn } from "./modules/executive";
import { lawChain } from "./modules/laws";

function cabinetAt(placeKey: string, seed: string) {
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey,
  });
  const api = coreAPI(core);
  const { stateKey, townPlaceId } = lawChain(api);
  const holders = appointmentsIn(api, stateKey).map((row) => {
    const person = core.people.get(row.holderId)!;
    const home = corePlaceByJurisdictionId(person.placeId as never);
    return {
      post: row.post,
      inTown: person.placeId === townPlaceId,
      homeState: home?.stateJurisdictionKey ?? home?.key,
      paid: Boolean(person.jobId && core.jobs.get(person.jobId)),
    };
  });
  return { stateKey, holders };
}

describe("a state's cabinet lives where the state's people put them", () => {
  it("Edgar, Wisconsin (5522550), seed edgar-petition-1: no secretary lives in a small town that is not the seat", () => {
    const { stateKey, holders } = cabinetAt("5522550", "edgar-petition-1");
    expect(holders.length).toBeGreaterThan(0);
    expect(holders.filter((h) => h.inTown)).toEqual([]);
    for (const holder of holders) {
      expect(holder.homeState).toBe(stateKey);
      expect(holder.paid).toBe(true);
    }
  }, 90_000);

  it("Pierre, South Dakota (4649600), seed pierre-cabinet-1: at the seat the cabinet lives in town", () => {
    const { holders } = cabinetAt("4649600", "pierre-cabinet-1");
    expect(holders.length).toBeGreaterThan(0);
    expect(holders.every((h) => h.inTown && h.paid)).toBe(true);
  }, 90_000);
});
