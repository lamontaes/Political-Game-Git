import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  ageAtStart,
  applyChosenPerson,
  birthYears,
  chosenBirthDate,
  creatorRandomPlace,
  creatorStates,
  creatorTowns,
  drawBirthday,
  drawName,
  readChosenPerson,
} from "./creator";
import {
  appearanceRows,
  drawnAppearance,
  lookForGender,
  moveAppearance,
  portraitPng,
  readRecipe,
} from "./appearance";
import { drawnFigure } from "./figure-hair";
import { lookFigures } from "./whole-figures";
import { buildBenchWorld } from "./world";
import { personCard } from "./card";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { schoolsAttended } from "../core2/past";
import { gameStartDate } from "../core2/game-start";
import { ageOnDate, daysBetween, makeIsoDate } from "../core2/kernel/dates";
import { OPENING_KIN } from "../core2/opening-kin";
import { coreAPI, personOrFillIn } from "../core2/state";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { PARTIES_MODULE_ID } from "../core2/modules/parties";
import { properName } from "../director/words";

describe("the New game creator", () => {
  it("draws a name before any gender is chosen, and again after", () => {
    const any = drawName("seed", 1);
    expect(any.givenName).not.toBe("");
    expect(any.familyName).not.toBe("");
    expect(drawName("seed", 2, "female").givenName).not.toBe("");
  });

  it("draws an adult birthday whose year is one of the labeled choices", () => {
    const b = drawBirthday("seed", 1);
    expect(ageAtStart(b.year, b.month, b.day)).toBeGreaterThanOrEqual(18);
    const years = birthYears(b.month, b.day);
    expect(years.map((row) => row.year)).toContain(b.year);
    expect(years[0]!.label).toMatch(/^\d{4} \(age \d+\)$/);
  });

  it("lists every state with places, and a state's towns with populations", () => {
    const states = creatorStates();
    expect(states.length).toBeGreaterThan(50);
    const state = states[Math.floor(states.length / 2)]!;
    const towns = creatorTowns(state.key, "");
    expect(towns.length).toBeGreaterThan(0);
    expect(towns.some((town) => (town.population ?? 0) > 0)).toBe(true);
  });

  it("refuses a person with no gender", () => {
    expect(() =>
      readChosenPerson(
        JSON.stringify({
          givenName: "A",
          familyName: "B",
          birthYear: 1980,
          birthMonth: 1,
          birthDay: 1,
        }),
      ),
    ).toThrow();
  });

  it("offers the figures the game draws, steps them and draws the portrait", () => {
    const recipe = drawnAppearance("female", "seed", 0);
    expect(recipe.sex).toBe("female");
    const labels = appearanceRows(recipe, "female").map((row) => row.label);
    expect(labels.slice(0, 6)).toEqual([
      "Build",
      "Clothes",
      "Skin",
      "Face",
      "Hair",
      "Hair color",
    ]);
    // A color for each piece the outfit has: a jacket only with a vest or blazer.
    expect(labels.slice(6)).toEqual([
      ...(recipe.outfit === "vest" || recipe.outfit === "blazer"
        ? ["Jacket color"]
        : []),
      "Shirt color",
      "Pants color",
      "Shoes color",
    ]);
    expect(appearanceRows(recipe, "nonbinary")[0]!.label).toBe("Body");
    const next = moveAppearance(recipe, "female", "outfit", 1);
    expect(next.outfit).not.toBe(recipe.outfit);
    expect(readRecipe(JSON.stringify(next))).toEqual(next);
    expect(() =>
      readRecipe(JSON.stringify({ ...next, outfit: "hair" })),
    ).toThrow();
    // The portrait is the standing v2 figure in the look's own colors and
    // hair, through the same drawing the rooms use.
    const png = portraitPng(next);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    const file = lookFigures().find(
      (row) =>
        row.sex === next.sex &&
        row.build === next.build &&
        row.outfit === next.outfit,
    )!.file;
    expect(
      png.equals(
        drawnFigure(
          file
            .split("/")
            .pop()!
            .replace(/\.png$/, ""),
          next,
        ),
      ),
    ).toBe(true);
  });
});

// Owner's playtest, Oct 26 (laws-opening-past-fits-the-chosen-age): a creator
// birthday of 35 left the parent 47 and the schooling of a 17-year-old. The
// world is built for the chosen birthday, so the player is a resident of that
// age and what was drawn for them (kin, schools, work, money) fits it.
describe("the life drawn for the age the creator chose", () => {
  const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
  const place = drawPlace(seed, "creator-chosen-age");
  const minParentAge = OPENING_KIN.fertilityByAge.rows[0]!.minAge;

  it.each([18, 35, 70])(
    `gives a player of %i parents, schools, work and money that fit, in ${place.name}, seed ${place.seed}`,
    (age) => {
      setBookkeeping(false);
      const [startYear] = gameStartDate().split("-").map(Number) as [number];
      const chosen = {
        givenName: "Jackson",
        familyName: "Knox",
        gender: "male" as const,
        birthYear: startYear - age - 1,
        birthMonth: 8,
        birthDay: 6,
      };
      expect(ageAtStart(chosen.birthYear, 8, 6)).toBe(age);
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
        playerBirthDate: chosenBirthDate(chosen),
      });
      const { core } = world;
      const id = world.playerId!;
      const where = `${place.name}, seed ${place.seed}, age ${age}, player ${id}`;
      const start = makeIsoDate(core.date);
      // The resident the world drew is the chosen age already; the creator
      // moves their birth date by under a year, not by decades.
      const drawnBorn = core.people.get(id)!.birthDate;
      expect(ageOnDate(makeIsoDate(drawnBorn), start), where).toBe(age);
      expect(
        Math.abs(daysBetween(makeIsoDate(drawnBorn), chosenBirthDate(chosen))),
        where,
      ).toBeLessThan(366);
      applyChosenPerson(core, id, chosen);
      const player = core.people.get(id)!;
      expect(player.birthDate, where).toBe(chosenBirthDate(chosen));

      // Every parent the record names is old enough to be one, as M0-06 asks,
      // and the player is old enough to be the parent of each child.
      const kin = (kind: string) =>
        (player.pastFacts ?? [])
          .filter((fact) => fact.kind === kind && fact.facts?.otherPersonId)
          .map((fact) => fact.facts!.otherPersonId!);
      const born = (otherId: string) =>
        personOrFillIn(core, otherId)!.birthDate;
      const parents = kin("family:parent");
      const household = core.households.get(player.householdId)!;
      const householdParents = parents.filter((parent) =>
        household.memberIds.includes(parent),
      );
      for (const parent of parents) {
        const atBirth = ageOnDate(makeIsoDate(born(parent)), player.birthDate);
        expect(atBirth, `${where}: parent ${parent}`).toBeGreaterThanOrEqual(
          minParentAge,
        );
        expect(atBirth, `${where}: parent ${parent}`).toBeLessThan(70);
      }
      for (const child of kin("family:child"))
        expect(
          ageOnDate(player.birthDate, makeIsoDate(born(child))),
          `${where}: child ${child}`,
        ).toBeGreaterThanOrEqual(minParentAge);

      // The player starts a resident: the opening seats officials and names
      // party chairs from residents 25 or older, and the player is one.
      const api = coreAPI(core);
      expect(
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .query("byPerson", [id]),
        `${where}: holds no seat at the opening`,
      ).toHaveLength(0);
      expect(
        api
          .moduleState(PARTIES_MODULE_ID)
          .table("parties")
          .rows()
          .filter((row) => row.leaderId === id),
        `${where}: leads no party at the opening`,
      ).toHaveLength(0);

      // Who you are: the schools the school engine's run recorded for the
      // years before the start, each named from its own record, and the
      // record of the high school the player went through.
      const card = personCard(core, id);
      expect(card.age, where).toBe(age);
      expect(card.birthDate, where).toBe(chosenBirthDate(chosen));
      const schools = schoolsAttended(core, id);
      const high = schools.find((row) => row.stage === "high");
      expect(high, `${where}: a high school record`).toBeDefined();
      for (const row of schools)
        expect(
          ageOnDate(player.birthDate, makeIsoDate(row.date)),
          `${where}: ${row.recordId}`,
        ).toBeGreaterThanOrEqual(4);
      expect(new Set(card.schools.map((row) => row.name)), where).toEqual(
        new Set(
          schools.flatMap((row) => (row.name ? [properName(row.name)] : [])),
        ),
      );

      // Work: a job, or someone in the household who earns instead.
      const earners = household.memberIds.filter(
        (member) => personOrFillIn(core, member)?.jobId,
      );
      if (!card.job)
        expect(
          earners.includes(id),
          `${where}: ${id} holds no job but is counted as an earner`,
        ).toBe(false);
      // Money: cash on hand, or someone in the household with a job.
      expect(
        card.liquidMinor > 0 || earners.length > 0,
        `${where}: money ${card.liquidMinor}`,
      ).toBe(true);
      console.info(
        `${where}: born ${player.birthDate} (drawn ${drawnBorn}); parents ${
          parents.map((parent) => `${parent} ${born(parent)}`).join(", ") ||
          "none recorded"
        } (in the home: ${householdParents.join(", ") || "none"}); high school ${high?.recordId}; schools ${card.schools
          .map((row) => `${row.name} (${row.recordId})`)
          .join(
            "; ",
          )}; work ${card.job ? `${card.job.title} (${card.job.jobId})` : `none, earners ${earners.join(" ") || "none"}`}; money ${card.liquidMinor}`,
      );
    },
    600_000,
  );
});

// Owner's playtest, Oct 27: a male character could step to a female body. A
// look the page sends back (after Undo or Reset) is redrawn on the chosen
// gender's body, by the creator route and by New game.
describe("a look always has the chosen gender's body", () => {
  it("redraws a woman's look on a man's body, keeping what that body has", () => {
    const hers = drawnAppearance("female", "seed", 3);
    const his = lookForGender(hers, "male");
    expect(his.sex).toBe("male");
    expect(his.build).toBe(hers.build);
    expect(his.skin).toBe(hers.skin);
    expect(lookForGender(hers, "female")).toBe(hers);
    expect(lookForGender(hers, "nonbinary")).toBe(hers);
    const chosen = readChosenPerson(
      JSON.stringify({
        givenName: "Sam",
        familyName: "Lee",
        gender: "male",
        birthYear: 1990,
        birthMonth: 5,
        birthDay: 4,
        recipe: hers,
      }),
    );
    expect(chosen.recipe!.sex).toBe("male");
  });
});

it("names every hair style and face capitalized, like the other rows", () => {
  for (const sex of ["female", "male"]) {
    let look = drawnAppearance(sex, "capitals", 2);
    for (let n = 0; n < 14; n++) {
      look = moveAppearance(look, sex, "hair", 1);
      const rows = appearanceRows(look, sex);
      for (const row of rows.filter((r) => r.id === "hair" || r.id === "face"))
        expect(row.value[0], `${row.id} ${row.value}`).toBe(
          row.value[0]!.toUpperCase(),
        );
    }
  }
});

describe("Random place in the creator", () => {
  it("draws a state and one of its towns from all 56, the same for the same seed and press", () => {
    const first = creatorRandomPlace("seed-a", 1);
    expect(first.state.key).toMatch(/^us-/i);
    expect(first.state.name.length).toBeGreaterThan(1);
    expect(first.town.name.length).toBeGreaterThan(0);
    expect(first.town.population).toBeGreaterThan(0);
    // The town is one the state's own list offers, by key.
    expect(
      creatorTowns(first.state.key, "").some((t) => t.key === first.town.key),
    ).toBe(true);
    expect(creatorRandomPlace("seed-a", 1)).toEqual(first);
    // Another press or another seed can land elsewhere; across a few draws it does.
    const keys = new Set(
      [1, 2, 3, 4, 5, 6].map(
        (draw) => creatorRandomPlace("seed-a", draw).town.key,
      ),
    );
    expect(keys.size).toBeGreaterThan(1);
  });
});
