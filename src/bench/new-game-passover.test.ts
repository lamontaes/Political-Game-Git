/**
 * A new game's drawn place where no player can be picked (every adult lives in
 * group quarters) is passed over before the player is chosen, and the draw is
 * taken again without it: the same state's next place by the same ranking, no
 * new draw. Dev mode's "How this world opened" names the place passed over and
 * why. A place asked for by key still throws. Pinned: the draw "passover-152"
 * lands on Evergreen Colony, South Dakota (4620208), where all 51 adults live
 * in group quarters (src/bench/world.ts `passOver`).
 */
import { createHash, randomBytes } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { expect, it, vi } from "vitest";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { corePlaceStateIdentities } from "../core2/place-lookup";
import { handleDev } from "./dev-api";
import type { OpeningView } from "./dev-views/opening";
import { selectBenchPlace } from "./place-selection.mjs";
import { realLocalities } from "../core2/places";
import {
  placeGroupQuarters,
  publishedPlaceReferencePopulation,
} from "../core2/gov-rules/place-population";
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

// The golden-path runner draws one place per spec from every locality and
// hands its key to the command (tests/golden-path/place.ts). That key is a
// draw, not an ask, so a build at it passes a place with no player over too.
// The red this fixes: M1-11 threw at Spink Colony, South Dakota (4660180),
// drawn for a pull request that did not touch it.
const drawSeed =
  process.env.NEW_GAME_PASSOVER_SEED ?? randomBytes(8).toString("hex");

it(`a build at the golden-path runner's drawn key passes over a place with no player and opens in the same state's next place (seed ${drawSeed})`, () => {
  setBookkeeping(false);
  // The case is rare: places whose Census count in group quarters is their
  // whole published population. Start at a drawn one and take the first
  // where a build by key refuses a player; name each one passed by.
  const candidates = realLocalities()
    .filter((row) => {
      const published = row.sourceGeoid
        ? publishedPlaceReferencePopulation(row.sourceGeoid)?.value
        : undefined;
      const quarters = placeGroupQuarters(row.key)?.total ?? 0;
      return published !== undefined && published > 0 && quarters >= published;
    })
    .sort((a, b) => a.key.localeCompare(b.key));
  expect(candidates.length, "places wholly in group quarters").toBeGreaterThan(
    0,
  );
  const start =
    parseInt(
      createHash("sha256").update(drawSeed).digest("hex").slice(0, 8),
      16,
    ) % candidates.length;
  const hasPlayer: string[] = [];
  let place: (typeof candidates)[number] | undefined;
  let refusal = "";
  for (let step = 0; step < 6 && !place; step++) {
    const row = candidates[(start + step) % candidates.length]!;
    try {
      buildBenchWorld(drawSeed, gameStartDate(), {
        twoLevel: true,
        placeKey: row.key,
      });
      hasPlayer.push(`${row.displayName} (${row.key})`);
    } catch (error) {
      // Asked for by key outside the runner, the place still refuses.
      if (!(error instanceof NoPlayerHereError)) throw error;
      place = row;
      refusal = error.message;
    }
  }
  expect(
    place,
    `no place without a player in six draws, seed ${drawSeed}; a player lives at: ${hasPlayer.join("; ")}`,
  ).toBeDefined();
  const where = `${place!.displayName} (${place!.key}), seed ${drawSeed}`;
  vi.stubEnv("GOLDEN_PATH_PLACE_KEY", place!.key);
  try {
    const world = buildBenchWorld(drawSeed, gameStartDate(), {
      twoLevel: true,
      placeKey: place!.key,
    });
    expect(world.place.key, where).not.toBe(place!.key);
    expect(world.place.stateJurisdictionKey, where).toBe(
      place!.stateJurisdictionKey,
    );
    expect(world.playerId, where).toBeTruthy();
    const passed = JSON.parse(
      world.core.placeMetadata.openingPassedOver ?? "[]",
    ) as { key: string; reason: string }[];
    expect(passed[0], where).toEqual({ key: place!.key, reason: refusal });
    process.stdout.write(
      `runner's drawn key: passed over ${where} (${refusal}); opened at ${world.place.displayName} (${world.place.key}); also passed over: ${
        passed
          .slice(1)
          .map((row) => row.key)
          .join(", ") || "none"
      }; drawn first with a player: ${hasPlayer.join("; ") || "none"}\n`,
    );
  } finally {
    vi.unstubAllEnvs();
  }
}, 300_000);
