import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { applyChosenPerson } from "./creator";
import { buildBenchWorld } from "./world";

// The New game creator sets the player's name, birth date and looks through
// the core's identity call, which only the controlled player takes, and only
// before the first day passes.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "creator-identity");

it(`gives the player the chosen identity through the core call in ${place.name}, seed ${place.seed}`, () => {
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core } = world;
  const id = world.playerId!;
  applyChosenPerson(core, id, {
    givenName: "Avery",
    familyName: "Stone",
    gender: "female",
    birthYear: 1990,
    birthMonth: 3,
    birthDay: 14,
  });
  const player = core.people.get(id)!;
  expect(player.givenName).toBe("Avery");
  expect(player.familyName).toBe("Stone");
  expect(player.birthDate).toBe("1990-03-14");
  expect(player.looks?.gender).toBe("female");
  // Anyone else's identity is not the creator's to set.
  const other = [...core.people.keys()].find((key) => key !== id)!;
  expect(() =>
    coreAPI(core).chooseIdentityV1(other, {
      givenName: "A",
      familyName: "B",
      birthDate: makeIsoDate("1980-01-01"),
      looks: {},
    }),
  ).toThrow(/controlled player/);
  // Nor after the world has started to run.
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  expect(() =>
    coreAPI(core).chooseIdentityV1(id, {
      givenName: "A",
      familyName: "B",
      birthDate: makeIsoDate("1980-01-01"),
      looks: {},
    }),
  ).toThrow(/first day/);
}, 600_000);
