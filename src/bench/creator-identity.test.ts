import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import {
  addDays,
  ageOnDate,
  daysBetween,
  makeIsoDate,
} from "../core2/kernel/dates";
import { P } from "../core2/parameters";
import type { CoreState } from "../core2/types";
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

// Owner's playtest, Oct 24 (play-stop-20): a birthday chosen a week from a
// sister's left them born seven days apart. Brothers and sisters move to stay
// born at least nine months from the chosen birthday.
it(`moves a brother or sister born within nine months of the chosen birthday, in a drawn place`, () => {
  setBookkeeping(false);
  const siblingsOf = (core: CoreState, id: string) =>
    (core.people.get(id)!.pastFacts ?? []).flatMap((fact) =>
      fact.kind === "family:sibling" && fact.facts?.otherPersonId
        ? [fact.facts.otherPersonId]
        : [],
    );
  // The creator moves a birthday only within the player's own age (`applyChosenPerson`; New game
  // draws the world with a resident of the chosen age), so the case is a brother or sister born
  // within nine months of a day that keeps the player's age on the opening day: the day a week
  // from theirs, or the nearest day of the player's age year to it. Draw places until one holds
  // it, and name each place passed over.
  const ageAtOpening = (born: string) =>
    ageOnDate(makeIsoDate(born), makeIsoDate(gameStartDate()));
  const [openYear, openMonthDay] = [
    Number(gameStartDate().slice(0, 4)),
    gameStartDate().slice(4),
  ];
  // The first and last birthdays that are a given age on the opening day.
  const ageYear = (age: number) => ({
    first: addDays(makeIsoDate(`${openYear - age - 1}${openMonthDay}`), 1),
    last: makeIsoDate(`${openYear - age}${openMonthDay}`),
  });
  const passedOver: string[] = [];
  let found:
    | {
        drawn: ReturnType<typeof drawPlace>;
        world: ReturnType<typeof buildBenchWorld>;
        chosen: ReturnType<typeof makeIsoDate>;
      }
    | undefined;
  for (let n = 0; n < 8 && !found; n += 1) {
    const drawn = drawPlace(seed, `creator-siblings:${n}`);
    const world = buildBenchWorld(drawn.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: drawn.key,
    });
    const id = world.playerId!;
    const own = ageAtOpening(world.core.people.get(id)!.birthDate);
    const siblings = siblingsOf(world.core, id);
    const { first, last } = ageYear(own);
    const chosen = siblings
      .flatMap((other) => {
        const born = makeIsoDate(world.core.people.get(other)!.birthDate);
        return [addDays(born, 7), addDays(born, -7)].map((day) => {
          const inYear = day < first ? first : day > last ? last : day;
          return { born, day: inYear };
        });
      })
      .find(
        ({ born, day }) =>
          ageAtOpening(day) === own &&
          Math.abs(daysBetween(day, born)) < P.siblingBirthGapDays,
      )?.day;
    if (chosen) found = { drawn, world, chosen };
    else
      passedOver.push(
        `${drawn.name} (seed ${drawn.seed}): ${
          siblings.length
            ? `no brother or sister born within nine months of a day the player, ${own}, keeps their age on`
            : "the player has no brother or sister"
        }`,
      );
  }
  process.stdout.write(
    `creator-siblings: ${found ? `${found.drawn.name}, seed ${found.drawn.seed}` : "no place held the case"}; passed over: ${passedOver.join("; ") || "none"}\n`,
  );
  if (!found)
    throw new Error(
      `No drawn place held a brother or sister born within nine months of a birthday that keeps the player's age (seed ${seed}): ${passedOver.join("; ")}`,
    );
  const { drawn, world, chosen } = found;
  const where = `${drawn.name}, seed ${drawn.seed}`;
  const { core } = world;
  const id = world.playerId!;
  const siblings = siblingsOf(core, id);
  expect(siblings.length, where).toBeGreaterThan(0);
  // Brothers and sisters carrying the player's drawn family name.
  const drawnFamily = core.people.get(id)!.familyName;
  const sharing = siblings.filter(
    (other) => core.people.get(other)!.familyName === drawnFamily,
  );
  const [year, month, day] = chosen.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  applyChosenPerson(core, id, {
    givenName: "Bo",
    familyName: "Snider",
    gender: "male",
    birthYear: year,
    birthMonth: month,
    birthDay: day,
  });
  expect(core.people.get(id)!.birthDate).toBe(chosen);
  // The chosen surname reaches a sibling living elsewhere too (C27).
  for (const other of sharing)
    expect(core.people.get(other)!.familyName, where).toBe("Snider");
  const gap = P.siblingBirthGapDays;
  for (const other of siblings)
    expect(
      Math.abs(
        daysBetween(chosen, makeIsoDate(core.people.get(other)!.birthDate)),
      ),
      `${where}: ${other} born ${core.people.get(other)!.birthDate}`,
    ).toBeGreaterThanOrEqual(gap);
}, 600_000);
