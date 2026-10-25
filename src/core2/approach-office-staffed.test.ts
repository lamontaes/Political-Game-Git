/**
 * A plan to approach an office lapses when the office has no staff left by
 * the day it is carried out, rather than stopping the world. In Long Hollow,
 * South Dakota, on the seed the paired performance check drew, a resident
 * planned an approach to an office whose last staff member had gone by
 * February 20, 2025, and the approach threw.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

const SEED = "5da89cbd151c955ac0720c2296a9156c17fbdb7025128c169387a27ff8f7aeff";
const LONG_HOLLOW = "4638760";

it("a planned approach to an office with no staff left lapses", () => {
  const { core } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: LONG_HOLLOW,
  });
  let day = makeIsoDate(core.date);
  const end = "2025-03-01";
  expect(() => {
    while (day < end) {
      day = addDays(day, 1);
      advanceCore(core, day);
    }
  }).not.toThrow();
  expect(day).toBe(end);
}, 600_000);
