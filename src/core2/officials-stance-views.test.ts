/**
 * A state or federal official's position reads the views engine (pool item
 * gov-officials-positions-from-views): in a random place from all 56, an
 * official's stance on a question is their opening position until something
 * they hear moves it, then moves by the views engine's weight, as a
 * resident's view does.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { PLATFORM_QUESTIONS } from "./campaign-views";
import { OFFICIALS_MODULE_ID, officialStance } from "./modules/officials";
import { VIEWS_DATA, VIEWS_MODULE_ID } from "./modules/views";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("moves an official's stance by what they have heard, by the views weight", () => {
  setBookkeeping(false);
  const draw = drawPlace(seed, "officials-stance-views");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const api = coreAPI(core);
  expect(core.modules.has(VIEWS_MODULE_ID), where).toBe(true);
  const officials = api
    .moduleState(OFFICIALS_MODULE_ID)
    .table("officials")
    .rows() as unknown as { id: string; personId?: string }[];
  const question = PLATFORM_QUESTIONS[0]!;
  const official = officials.find((row) => {
    const key = row.personId ?? row.id;
    const stance = officialStance(api, key, question);
    return stance !== null && Math.abs(stance) < 0.5;
  });
  expect(official, where).toBeTruthy();
  const key = official!.personId ?? official!.id;
  const before = officialStance(api, key, question)!;
  // A case made to them, as the views engine records one.
  const weight = VIEWS_DATA.parameters.stanceViewWeight!.value;
  api
    .moduleState(VIEWS_MODULE_ID)
    .table("stances")
    .put({
      id: `${key}:${question}`,
      personId: key,
      topic: question,
      desiredChange: "enact",
      strength: 0.05,
      causes: [],
    } as never);
  const after = officialStance(api, key, question)!;
  expect(after - before, `${where} ${key}`).toBeCloseTo(weight * 0.05, 9);
  expect(after, where).toBeGreaterThan(before);
}, 900_000);
