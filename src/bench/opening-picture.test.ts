/**
 * The opening's picture matches the address (pool item
 * play-state-of-union-picture): in a random place from all 56, a State of the
 * Union opens on the House chamber and an inaugural opens on the White House.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { openingFrames } from "./opening";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("opens a State of the Union on the House floor and an inaugural at the White House", () => {
  setBookkeeping(false);
  const draw = drawPlace(seed, "opening-picture");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const world = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const story = world.director.ledger.opening;
  expect(story, where).toBeTruthy();
  const firstPresidentPlace = (
    speechKind: "state-of-the-union" | "inaugural",
  ) =>
    openingFrames(world.core, world.playerId!, {
      ...story!,
      speechKind,
    }).frames.find((frame) => frame.stage === "president")?.place;
  const union = firstPresidentPlace("state-of-the-union");
  const inaugural = firstPresidentPlace("inaugural");
  expect(union, where).toBe("us-house-floor");
  expect(inaugural, where).toBe("white-house-exterior");
}, 600_000);
