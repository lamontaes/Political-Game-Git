import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { applyChosenPerson } from "./creator";
import { buildBenchWorld, OPENING_WARMUP_DAYS } from "./world";

// The New game creator sets the player's name, birth date and looks through
// the core's identity call, which only the controlled player takes, and only
// before the first day passes.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
const place = drawPlace(seed, "creator-identity");

it(`gives the player the chosen identity through the core call in ${place.name}, seed ${place.seed}`, () => {
  setBookkeeping(false);
  // As New game builds it (handler.ts, /api/newlife): the world is drawn with a resident of the
  // chosen age, and the identity call moves the birthday only within that age (`applyChosenPerson`).
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
    playerBirthDate: "1990-03-14",
    playerGender: "female",
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

// The warm-up (src/core2/player-warm-up.ts) builds the world 31 days before the start date and runs it
// forward, so the world is on the start date, not its build date, when the New game route has built it.
// The creator's choice (POST /api/newlife with a person) was refused as "An identity is chosen before the
// first day passes" until it was made part of the build, before the weeks run (BuildOptions.chooseIdentity).
// Pinned place and seed: Lewiston, ME (the day-zero test's place).
it("gives the chosen identity to a player whose world was warmed up, at Lewiston ME, pinned seed", () => {
  setBookkeeping(false);
  const lewiston = {
    key: "2338740",
    seed: "23142a2761a616b9618e425db3c9591cc9cba0aaf1f83ab37d888944e039ab3b",
  };
  const world = buildBenchWorld(lewiston.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: lewiston.key,
    warmUpDays: OPENING_WARMUP_DAYS,
    playerBirthDate: "1990-03-14",
    playerGender: "female",
    chooseIdentity: (core, id) =>
      applyChosenPerson(core, id, {
        givenName: "Avery",
        familyName: "Stone",
        gender: "female",
        birthYear: 1990,
        birthMonth: 3,
        birthDay: 14,
      }),
  });
  const { core } = world;
  const player = core.people.get(world.playerId!)!;
  // The world opens on the start date, after the weeks it ran; the player is who they chose.
  expect(core.date).toBe(gameStartDate());
  expect(core.startedAt).not.toBe(core.date);
  expect(player.givenName).toBe("Avery");
  expect(player.familyName).toBe("Stone");
  expect(player.birthDate).toBe("1990-03-14");
  // After the weeks have run the first day is gone: a late choice is still refused.
  expect(() =>
    coreAPI(core).chooseIdentityV1(world.playerId!, {
      givenName: "A",
      familyName: "B",
      birthDate: makeIsoDate("1980-01-01"),
      looks: {},
    }),
  ).toThrow(/first day/);
}, 150_000);

// The Oct 24 playtest case (play-stop-20: a birthday chosen a week from a sister's) can no longer
// come up through the creator: a chosen birthday moves only within the player's own age, and no
// drawn place holds a brother or sister within nine months of that year. The rule that keeps
// siblings apart from a chosen birthday is checked in src/core2/sibling-births.test.ts ("keeps a
// chosen birthday and moves the sibling beside it") (CTO, #9995, Nov 17).
