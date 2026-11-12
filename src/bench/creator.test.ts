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
  portraitFace,
  lookFaces,
  readRecipe,
} from "./appearance";
import { bustChoices, bustOfLook, bustPerson, bustTopColors } from "./bust";
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
    const towns = creatorTowns(state.key, "", "creator-test");
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

  it("offers what a bust shows: skin, hair, facial hair for a man, and the clothes they dress up in", () => {
    const hers = drawnAppearance("female", "seed", 0);
    expect(bustPerson(hers.person)!.sex).toBe("woman");
    // Owner, Nov 7: "busts, never full figures"; Nov 10: "I would like to be
    // able to change ties and stuff ... I want to see colors and stuff
    // changing as well". A row shows only where the bank paints the piece:
    // no tie is painted for the women.
    // Owner, Nov 12: "two tabs, everyday and formal, bust flips between
    // them": the everyday top and its color sit in the Everyday tab, the
    // shirt, tie and jacket in the Formal tab, the rest in both.
    const tabbed = (look: typeof hers, gender: string) =>
      appearanceRows(look, gender).map((row) =>
        row.tab ? `${row.tab}: ${row.label}` : row.label,
      );
    const henley = { ...hers, top: "henley", topColor: "green" };
    expect(tabbed(henley, "female")).toEqual([
      "Skin",
      "Hair",
      "Hair color",
      "everyday: Top",
      "everyday: Top color",
      "formal: Shirt",
      "formal: Jacket",
    ]);
    // A top painted in one color has no color row.
    expect(
      tabbed({ ...hers, top: "denim", topColor: undefined }, "female"),
    ).not.toContain("everyday: Top color");
    const his = drawnAppearance("male", "seed", 0);
    expect(tabbed(his, "male")).toEqual([
      "Skin",
      "Hair",
      "Hair color",
      "Facial hair",
      "everyday: Top",
      "everyday: Top color",
      "formal: Shirt",
      "formal: Tie",
      "formal: Jacket",
    ]);
    expect(appearanceRows(hers, "nonbinary")[0]!.label).toBe("Body");

    // Each row steps through every choice and comes back round.
    const steps = (look: typeof his, row: string, n: number) => {
      const seen = new Set<string>();
      for (let i = 0; i < n; i++) {
        seen.add(appearanceRows(look, "male").find((r) => r.id === row)!.value);
        look = moveAppearance(look, "male", row, 1);
      }
      return { seen, look };
    };
    const choices = bustChoices(bustPerson(his.person)!);
    expect(steps(his, "hair", choices.hair.length).seen.size).toBe(
      choices.hair.length,
    );
    expect(steps(his, "hair", choices.hair.length).look).toEqual(his);
    expect(steps(his, "hair-color", choices.hairColor.length).seen.size).toBe(
      choices.hairColor.length,
    );
    // Facial hair: none, then each style.
    const faces = steps(his, "face", choices.face.length + 1);
    expect(faces.seen.size).toBe(choices.face.length + 1);
    expect(faces.seen.has("None")).toBe(true);
    expect(faces.look).toEqual(his);
    // The shirt in each of its colors; the tie and the jacket: none, then each color.
    const shirts = steps(his, "shirt", choices.shirt.length);
    expect(shirts.seen.size).toBe(choices.shirt.length);
    expect(shirts.look).toEqual(his);
    for (const piece of ["tie", "jacket"] as const) {
      const worn = steps(his, piece, choices[piece].length + 1);
      expect(worn.seen.size, piece).toBe(choices[piece].length + 1);
      expect(worn.seen.has("None"), piece).toBe(true);
      expect(worn.look, piece).toEqual(his);
    }
    // The everyday tops: each whole top the set paints, and each top's colors.
    const tops = steps(his, "top", choices.top.length);
    expect(tops.seen.size).toBe(choices.top.length);
    expect(tops.look.top).toBe(his.top);
    const topColors = bustTopColors(bustPerson(his.person)!, his.top);
    const colored = steps(his, "top-color", topColors.length);
    expect(colored.seen.size).toBe(topColors.length);
    expect(colored.look).toEqual(his);
    expect(steps(his, "skin", 3).seen.size).toBe(3);
    // A change of skin keeps the hairstyle and the facial hair; the hair's
    // color stays where the new skin's people have it.
    const next = moveAppearance(his, "male", "skin", 1);
    expect(next.person).not.toBe(his.person);
    expect(next.hair).toBe(his.hair);
    expect(next.face).toBe(his.face);

    // The chosen top is saved in the look and is what the bust wears
    // everyday; it stays put as the other rows move.
    expect(his.top && his.topColor).toBeTruthy();
    expect(readRecipe(JSON.stringify(his))).toEqual(his);
    const chosenTop = moveAppearance(his, "male", "top", 1);
    expect(moveAppearance(chosenTop, "male", "hair", 1).top).toBe(
      chosenTop.top,
    );
    const everyday = lookFaces(chosenTop).everyday!.bust.layers;
    expect(
      everyday.some((url) =>
        url.endsWith(`/top-${chosenTop.top}-${chosenTop.topColor}.png`),
      ),
    ).toBe(true);
    expect(everyday.some((url) => /\/(shirt|tie|jacket)-/.test(url))).toBe(
      false,
    );
    expect(lookFaces(chosenTop).formal).toEqual(portraitFace(chosenTop));
    expect(() =>
      readRecipe(JSON.stringify({ ...his, person: "nobody" })),
    ).toThrow();
    // A piece the bank lacks falls back: the first hairstyle, hair color and
    // shirt, and no facial hair, tie or jacket.
    expect(
      readRecipe(
        JSON.stringify({ person: his.person, hair: "x", face: "y", tie: "z" }),
      ),
    ).toMatchObject({
      person: his.person,
      hair: choices.hair[0]!.key,
      hairColor: choices.hairColor[0]!.key,
      shirt: choices.shirt[0]!.key,
    });
    const fallen = readRecipe(
      JSON.stringify({ person: his.person, hair: "x", face: "y", tie: "z" }),
    );
    expect(fallen.face ?? fallen.tie ?? fallen.jacket).toBeUndefined();
    // A top the set lacks falls back to the game's own pick for the look.
    expect(choices.top.map((choice) => choice.key)).toContain(
      readRecipe(JSON.stringify({ ...his, top: "ballgown" })).top,
    );

    // The creator's bust is the look's own pieces in the clothes its rows
    // choose: the shirt, the tie where one is chosen, the jacket where one is.
    const dressed = {
      ...his,
      shirt: choices.shirt[1]!.key,
      tie: choices.tie[0]!.key,
      jacket: choices.jacket[0]!.key,
    };
    const face = portraitFace(dressed)!;
    expect(face.bust).toEqual(bustOfLook(dressed, "official"));
    for (const piece of ["shirt", "tie", "jacket"] as const)
      expect(
        face.bust.layers.some(
          (url) =>
            url.includes(`/${piece}-`) &&
            url.endsWith(`-${dressed[piece]}.png`),
        ),
        piece,
      ).toBe(true);
    const plain = readRecipe(
      JSON.stringify({ ...dressed, tie: undefined, jacket: undefined }),
    );
    const shirtOnly = portraitFace(plain)!.bust.layers;
    expect(shirtOnly.some((url) => /\/(tie|jacket)-/.test(url))).toBe(false);
    expect(shirtOnly.some((url) => /\/shirt-/.test(url))).toBe(true);
    expect(
      face.bust.layers.some((url) =>
        url.endsWith(`/hair-${his.hair}-${his.hairColor}.png`),
      ),
    ).toBe(true);
    expect(face.bust.layers.some((url) => /\/face-/.test(url))).toBe(
      Boolean(his.face),
    );
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
  it("redraws a woman's look on a man's body, keeping her skin", () => {
    const hers = drawnAppearance("female", "seed", 3);
    const his = lookForGender(hers, "male");
    expect(bustPerson(his.person)!.sex).toBe("man");
    expect(bustPerson(his.person)!.tone).toBe(bustPerson(hers.person)!.tone);
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
    expect(bustPerson(chosen.recipe!.person)!.sex).toBe("man");
  });
});

it("names every skin, hairstyle, hair color and facial hair capitalized, like the other rows", () => {
  for (const sex of ["female", "male"]) {
    let look = drawnAppearance(sex, "capitals", 2);
    for (let n = 0; n < 8; n++) {
      for (const row of appearanceRows(look, sex)) {
        expect(row.value, row.id).not.toBe("");
        expect(row.value[0], `${row.id} ${row.value}`).toBe(
          row.value[0]!.toUpperCase(),
        );
        look = moveAppearance(look, sex, row.id, 1);
      }
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
      creatorTowns(first.state.key, "", "creator-test").some(
        (t) => t.key === first.town.key,
      ),
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
