/**
 * A person filled in far from the played town holds the work their home
 * town's counts show (workFromHome), whoever fills them in: a cabinet pick of
 * the state drawn at the opening, as a running mate offered and a person met
 * on a trip already did. Before, the cabinet fill-in gave them no work at all,
 * so everyone drawn from another town read as jobless.
 *
 * Pinned: Edgar, Wisconsin (5522550), seed edgar-petition-1, a small town
 * that is not the state's seat, so its cabinet lives elsewhere in the state.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { workFromHome } from "./coarse-place";
import { gameStartDate } from "./game-start";
import { appointmentsIn } from "./modules/executive";
import { lawChain } from "./modules/laws";
import { corePlaceByJurisdictionId } from "./place-lookup";
import { workHeld } from "./person-work";
import { coreAPI } from "./state";

const PLACE = "5522550";
const SEED = "edgar-petition-1";
const where = `Edgar, Wisconsin (${PLACE}), seed ${SEED}`;

it(`${where}: the state's cabinet, drawn from other towns, holds the work their towns show`, () => {
  const previous = setBookkeeping(false);
  try {
    const { core } = buildBenchWorld(SEED, gameStartDate(), {
      twoLevel: true,
      placeKey: PLACE,
    });
    const api = coreAPI(core);
    const { stateKey, townPlaceId } = lawChain(api);
    const elsewhere = appointmentsIn(api, stateKey)
      .map((row) => core.people.get(row.holderId as never)!)
      .filter((person) => person.placeId !== townPlaceId);
    expect(
      elsewhere.length,
      `${where}: cabinet living elsewhere`,
    ).toBeGreaterThan(2);
    for (const person of elsewhere) {
      const home = corePlaceByJurisdictionId(person.placeId as never);
      const drawn = workFromHome(core.seed, home!.key, person.id);
      expect(drawn, `${where}: ${person.id} has counts`).toBeTruthy();
      const kept = person.pastFacts?.find((f) => f.kind === "identity:work");
      expect(kept?.facts?.title, `${where}: ${person.id}`).toBe(drawn!.title);
      expect(kept?.facts?.workplace, where).toBe(drawn!.workplace);
      // Seated, the post is the work they hold now.
      expect(workHeld(core, person.id)?.jobId, where).toBe(person.jobId);
    }
  } finally {
    setBookkeeping(previous);
  }
}, 120_000);
