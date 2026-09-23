import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createNewGameWorld } from "../presentation/new-game";
import { explicitNewGameSetup } from "../presentation/new-game-geography";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { advanceWorld } from "../simulation";
import { ageOnDate } from "../simulation/dates";
import { LIFE_PATHS2_HANDLERS } from "../simulation/life-paths2";
import { schoolStageToday } from "../simulation/school-stages";
import {
  loadEducationCatalog,
  type FetchLike,
} from "../education/catalog-load";
import {
  applyForEducation,
  canApplyFor,
  educationOptionReason,
} from "../education/study-provider";
import { LifePathsPanel } from "./LifePathsPanel";

/*
 * Peoria, Illinois: a young woman a year out of high school. A playtest there,
 * at eighteen, reported the Study tab showing only the game's own
 * college and no way to apply to a real one. In a real browser the finder
 * was on the page, a long scroll below six program cards, so the screen she
 * opened read as having no real colleges. These pin the order, the plain
 * wording and the route from the shipped directory to an application. Someone
 * still in high school sees their school on the Study tab instead, since
 * college comes after it; that is the child school screen's to pin.
 */

const PEORIA = "1759000";

function peoriaNineteen() {
  const game = createNewGameWorld(
    explicitNewGameSetup({
      placeKey: PEORIA,
      seed: "peoria-adult-college-finder",
      startAge: 18,
      birthMonth: 1,
      birthDay: 6,
      gender: "female",
      questionnaire: "skipped",
    }),
  );
  const personId = game.playerPersonId;
  const opened = openOrdinaryLife(game.world, personId);
  const world = openOrdinaryLife(
    advanceWorld(opened, 2, LIFE_PATHS2_HANDLERS),
    personId,
  );
  return { world, personId };
}

/** The shipped directory, read from `public/` the way the browser fetches it. */
const fromPublic: FetchLike = async (input: string) => {
  const bytes = readFileSync(`public${input}`);
  return {
    ok: true,
    json: async () => JSON.parse(bytes.toString("utf8")) as unknown,
    arrayBuffer: async () =>
      bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer,
  };
};

describe("the Study tab for a nineteen-year-old in Peoria", () => {
  const { world, personId } = peoriaNineteen();
  const markup = renderToStaticMarkup(
    <LifePathsPanel world={world} onWorldChange={() => {}} />,
  );

  it("is a real nineteen-year-old who has finished high school", () => {
    const person = world.people[personId]!;
    expect(ageOnDate(person.birthDate, world.currentDate)).toBe(19);
    expect(schoolStageToday(world, personId)).toBe("after");
    expect(markup).not.toContain('data-testid="study-grade-school"');
  });

  it("puts the college finder before the game's own programs", () => {
    const finder = markup.indexOf("Find a school or college");
    const programs = markup.indexOf("Programs you can enroll in");
    expect(finder).toBeGreaterThan(-1);
    expect(programs).toBeGreaterThan(-1);
    expect(finder).toBeLessThan(programs);
    // Both sit in the Study tab's one container, not in a folded section.
    const study = markup.slice(markup.lastIndexOf("<div", finder), programs);
    expect(study).not.toContain("<details");
  });

  it("carries no provenance or internal wording", () => {
    for (const internal of [
      "(fictional)",
      "game-authored",
      "Game-authored",
      "simulated days",
      "simulated-day",
      "editable",
      "NCES",
      "fictional parts of the game",
      "authored hours",
    ])
      expect(markup).not.toContain(internal);
    expect(markup).toContain("Civic Learning College");
    expect(markup).toMatch(/at least \d+ days/);
    expect(markup).toMatch(/you have 30 days to pay it/);
    expect(markup).toContain("($600 in all)");
  });

  it("can apply to a real Peoria college for a bachelor's degree", async () => {
    const colleges = await loadEducationCatalog("postsecondary", fromPublic);
    const bradley = colleges.find(
      (row) => row.name === "Bradley University" && row.state === "IL",
    );
    expect(bradley).toBeDefined();
    const bachelors = bradley!.capabilities.find(
      (c) => c.code === "LEVEL5" && c.state === "offered",
    )!;
    expect(canApplyFor(bachelors)).toBe(true);
    // The button this reason disables is "Apply for Bachelor's degree".
    expect(educationOptionReason(world, bradley!, bachelors)).toBeNull();
    const applied = applyForEducation(world, bradley!, "LEVEL5");
    expect(applied.ok).toBe(true);
    expect(applied.message).toBe(
      "Bradley University offered you a place. Review the terms before accepting.",
    );
    expect(educationOptionReason(applied.world, bradley!, bachelors)).toMatch(
      /already have an offer/,
    );
  });

  it("reads the directory's misspelled certificate label as a word", async () => {
    const colleges = await loadEducationCatalog("postsecondary", fromPublic);
    const labels = new Set(
      colleges.flatMap((row) => row.capabilities.map((c) => c.label)),
    );
    expect([...labels].some((label) => label.includes("Certifiicate"))).toBe(
      false,
    );
    expect(labels).toContain(
      "Certificate of at least 1 year, but less than 2 years",
    );
  });
});
