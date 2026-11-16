/**
 * A new game's drawn place where no player can be picked (every adult lives in
 * group quarters) is passed over before the player is chosen, and the draw is
 * taken again without it: the same state's next place by the same ranking, no
 * new draw. Dev mode's "How this world opened" names the place passed over and
 * why. A place asked for by key still throws. Pinned: the draw "passover-152"
 * lands on Evergreen Colony, South Dakota (4620208), where all 51 adults live
 * in group quarters (src/bench/world.ts `passOver`).
 */
import type { IncomingMessage } from "node:http";
import { expect, it } from "vitest";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { corePlaceStateIdentities } from "../core2/place-lookup";
import { handleDev } from "./dev-api";
import type { OpeningView } from "./dev-views/opening";
import { selectBenchPlace } from "./place-selection.mjs";
import { realLocalities } from "../core2/places";
import { buildBenchWorld, NoPlayerHereError } from "./world";

const SEED = "passover-152";
const PASSED = "4620208";

it(`a new game at draw ${SEED} passes over Evergreen Colony, SD (${PASSED}), opens in the same state, and dev mode says why`, async () => {
  setBookkeeping(false);
  // The draw lands on the place with no household adults.
  expect(
    selectBenchPlace(SEED, corePlaceStateIdentities(), realLocalities()).key,
  ).toBe(PASSED);
  const world = buildBenchWorld(SEED, gameStartDate(), { twoLevel: true });
  expect(world.place.key).not.toBe(PASSED);
  expect(world.place.key.slice(0, 2), world.place.key).toBe(PASSED.slice(0, 2));
  expect(world.playerId).toBeTruthy();
  const passed = JSON.parse(
    world.core.placeMetadata.openingPassedOver ?? "[]",
  ) as { key: string; reason: string }[];
  expect(passed.map((p) => p.key)).toEqual([PASSED]);
  expect(passed[0]!.reason).toMatch(/adults live in group quarters/);

  let answer: { status: number; value: unknown } | undefined;
  await handleDev(
    { method: "GET" } as unknown as IncomingMessage,
    new URL("http://bench/api/dev/opening?subject=town"),
    (status, value) => (answer = { status, value }),
    () => ({
      core: world.core,
      director: world.director,
      placeId: world.placeId,
    }),
  );
  expect(answer?.status).toBe(200);
  const row = (answer!.value as OpeningView).rows.find((r) =>
    r.label.startsWith("Passed over first: "),
  );
  expect(row?.label).toBe("Passed over first: Evergreen Colony, South Dakota");
  expect(String(row?.value)).toMatch(/all \d+ adults live in group quarters/);

  // Asked for by key, the place still refuses a player.
  expect(() =>
    buildBenchWorld(SEED, gameStartDate(), {
      twoLevel: true,
      placeKey: PASSED,
    }),
  ).toThrow(NoPlayerHereError);
}, 90_000);
