import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ageAtStart,
  applyChosenPerson,
  birthYears,
  chosenBirthDate,
  creatorStates,
  creatorTowns,
  drawBirthday,
  drawName,
  readChosenPerson,
} from "./creator";
import {
  appearanceRows,
  drawnAppearance,
  moveAppearance,
  portraitPng,
  readRecipe,
} from "./appearance";
import { lookFigures } from "./whole-figures";
import { buildBenchWorld } from "./world";
import { personCard } from "./card";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { DEFAULT_DEEP_PAST_DATA } from "../core2/deep-past";
import { gameStartDate } from "../core2/game-start";
import { ageOnDate, daysBetween, makeIsoDate } from "../core2/kernel/dates";
import { OPENING_KIN } from "../core2/opening-kin";
import { personOrFillIn } from "../core2/state";
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
    expect(labels).toEqual(["Build", "Clothes"]);
    expect(appearanceRows(recipe, "nonbinary")[0]!.label).toBe("Body");
    const next = moveAppearance(recipe, "female", "outfit", 1);
    expect(next.outfit).not.toBe(recipe.outfit);
    expect(readRecipe(JSON.stringify(next))).toEqual(next);
    expect(() =>
      readRecipe(JSON.stringify({ ...next, outfit: "hair" })),
    ).toThrow();
    // The portrait is the standing v2 figure itself, as rooms draw it.
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
        readFileSync(
          new URL(`../../art/people-engine/v2/${file}`, import.meta.url),
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
  const abbreviations = Object.keys(
    DEFAULT_DEEP_PAST_DATA.schools.directoryAbbreviations,
  );

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

      // Who you are: the schools the record holds, each in its full name,
      // and the record of the high school the player went through.
      const card = personCard(core, id);
      expect(card.age, where).toBe(age);
      expect(card.birthDate, where).toBe(chosenBirthDate(chosen));
      const schools = (player.pastFacts ?? []).filter(
        (fact) => fact.facts?.schoolName && fact.facts.stage,
      );
      const high = schools.find((fact) => fact.facts?.stage === "high");
      expect(high, `${where}: a high school record`).toBeDefined();
      for (const fact of schools)
        expect(
          ageOnDate(player.birthDate, makeIsoDate(fact.date)),
          `${where}: ${fact.id}`,
        ).toBeGreaterThanOrEqual(4);
      expect(new Set(card.schools.map((row) => row.name)), where).toEqual(
        new Set(schools.map((fact) => properName(fact.facts!.schoolName!))),
      );
      for (const row of card.schools)
        expect(
          abbreviations,
          `${where}: ${row.recordId} ${row.name}`,
        ).not.toContain(row.name.split(" ").at(-1)!.toUpperCase());

      // Work: a job, or the record of who in the household earns instead.
      const livelihood = (player.pastFacts ?? []).find(
        (fact) => fact.kind === "household:livelihood",
      );
      expect(livelihood?.facts?.householdId, where).toBe(player.householdId);
      const earners = (livelihood?.facts?.earnerIds ?? "")
        .split(" ")
        .filter(Boolean);
      for (const earner of earners) {
        expect(household.memberIds, `${where}: earner ${earner}`).toContain(
          earner,
        );
        expect(personOrFillIn(core, earner)!.jobId, earner).toBeDefined();
      }
      if (!card.job)
        expect(
          earners.includes(id),
          `${where}: ${id} holds no job but the record lists them as an earner`,
        ).toBe(false);
      // Money: cash on hand, or the livelihood record of the household's
      // jobs, savings and living costs that says where it stands.
      expect(
        card.liquidMinor > 0 || livelihood !== undefined,
        `${where}: money ${card.liquidMinor}`,
      ).toBe(true);
      console.info(
        `${where}: born ${player.birthDate} (drawn ${drawnBorn}); parents ${
          parents.map((parent) => `${parent} ${born(parent)}`).join(", ") ||
          "none recorded"
        } (in the home: ${householdParents.join(", ") || "none"}); high school ${high?.id}; schools ${card.schools
          .map((row) => `${row.name} (${row.recordId})`)
          .join(
            "; ",
          )}; work ${card.job ? `${card.job.title} (${card.job.jobId})` : `none, ${livelihood?.id}, earners ${earners.join(" ") || "none"}`}; money ${card.liquidMinor}`,
      );
    },
    600_000,
  );
});
