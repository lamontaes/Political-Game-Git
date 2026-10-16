/**
 * A custom world's party strength reaches the voters (pool item
 * gov-custom-party-strength): in a random place from all 56, a world opened
 * with one party's strength doubled gives that party's label twice the pull
 * in every voter's appeal, and leaves the other party and a default world
 * alone. Read where the appeal is built (electorate.ts countedAppeal).
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { countedAppeal, partyStrength } from "./electorate";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("scales a party's pull on voters by the setting, and only that party's", () => {
  setBookkeeping(false);
  const draw = drawPlace(seed, "party-strength");
  const where = `${draw.name} [${draw.key}], seed ${draw.seed}`;
  const open = (partyStrengthSetting?: Record<string, number>) =>
    buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
      ...(partyStrengthSetting
        ? { settings: { politics: { partyStrength: partyStrengthSetting } } }
        : {}),
    }).core;
  const plain = open();
  const doubled = open({ Democratic: 2 });
  // The setting is read by name, with or without the word "Party".
  expect(partyStrength(plain, "Democratic Party"), where).toBe(1);
  expect(partyStrength(doubled, "Democratic Party"), where).toBe(2);
  expect(partyStrength(doubled, "Democratic"), where).toBe(2);
  expect(partyStrength(doubled, "Republican Party"), where).toBe(1);
  expect(partyStrength(doubled, null), where).toBe(1);
  // In the appeal every voter weighs, the label's pull scales with it.
  const field = (side: number) => [
    {
      id: "candidate",
      side,
      isIncumbent: false,
      standing: 0,
      localStanding: 0,
      recognition: 0,
      platform: [],
    },
  ];
  const where2 = { inTown: false, local: false, incumbentLean: 0 };
  const lean = 0.4;
  const base = countedAppeal(lean, field(1), where2).candidate!.party;
  const stronger = countedAppeal(
    lean,
    field(1 * partyStrength(doubled, "Democratic Party")),
    where2,
  ).candidate!.party;
  expect(stronger, where).toBeCloseTo(2 * base, 9);
}, 900_000);
