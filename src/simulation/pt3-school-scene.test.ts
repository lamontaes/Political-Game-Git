import { describe, expect, it } from "vitest";

import { createNewGameWorld } from "../presentation/new-game";
import type { NewGameSetup } from "../presentation/new-game";
import { EPISODE_FAMILIES, episodeFamily } from "./episode-bank";
import { DISTINCT_GIVEN_NAME_GENERATION_VERSION } from "./people";
import { advanceWorld } from "./world";
import { personName } from "./people";
import {
  eligibleEpisodeBeats,
  episodeRoleBindings,
  playedEpisodeStages,
  type EpisodeBeat,
  type EpisodeExclusion,
} from "./life-episodes";
import { deserializeWorld, serializeWorld } from "./index";
import type { EntityId, World } from "./index";

/**
 * The corridor scene the third playtest met, and what it is now.
 *
 * What it said was "Something got broken in the corridor at your school and
 * your name is the one that came up", with "Say who did it" underneath and
 * nobody to name. PT3 repaired the copy — a bound classmate, a named incident —
 * and these tests used to prove that repaired scene through the choice, the
 * memory, the continuation a year later and a reload.
 *
 * The dialogue review of 2026-09-23 withheld it. Choosing the scene was what
 * created the incident: nothing in the simulation records a broken object, the
 * damage or the blame before the scene is picked, so the selector was
 * inventing the event it then described. Until a simulation record produces
 * that incident, the stage carries a `withheld` requirement, and what these
 * tests now hold is that ordinary play never offers it and says why, in the
 * reason the bank carries. The repaired copy stays authored for the day a
 * record grounds it, and its two continuations cannot open without it.
 */

const SCHOOL = "school.the-thing-you-got-blamed-for";
const HOME = "home.someone-is-not-all-right";

/** The reason the bank gives for withholding a stage. */
function withheldReason(familyKey: string, stageKey: string): string {
  const stage = episodeFamily(familyKey)!.stages.find(
    (candidate) => candidate.key === stageKey,
  )!;
  const requirement = stage.requires.find(
    (candidate) => candidate.kind === "withheld",
  );
  if (!requirement || requirement.kind !== "withheld") {
    throw new Error(`${familyKey}/${stageKey} is no longer withheld.`);
  }
  return requirement.reason;
}

function schoolLife(age: number, seed: string) {
  const game = createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge: age,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
    givenNameGenerationVersion: DISTINCT_GIVEN_NAME_GENERATION_VERSION,
  } as NewGameSetup);
  return { world: game.world, personId: game.playerPersonId };
}

function stageEligibility(
  world: World,
  personId: EntityId,
  familyKey: string,
  stageKey: string,
): {
  readonly beat: EpisodeBeat | undefined;
  readonly exclusion: EpisodeExclusion | undefined;
} {
  const eligibility = eligibleEpisodeBeats({
    world,
    personId,
    families: EPISODE_FAMILIES,
  });
  return {
    beat: eligibility.beats.find(
      (beat) => beat.episodeKey === familyKey && beat.stageKey === stageKey,
    ),
    exclusion: eligibility.exclusions.find(
      (entry) => entry.episodeKey === familyKey && entry.stageKey === stageKey,
    ),
  };
}

/** The stage is not offered, and the exclusion is the bank's own reason. */
function expectWithheld(
  world: World,
  personId: EntityId,
  familyKey: string,
  stageKey: string,
): void {
  const { beat, exclusion } = stageEligibility(
    world,
    personId,
    familyKey,
    stageKey,
  );
  expect(beat, `${familyKey}/${stageKey} is offered`).toBeUndefined();
  expect(exclusion, `${familyKey}/${stageKey} says nothing`).toBeDefined();
  expect(exclusion!.requirement.kind).toBe("withheld");
  expect(exclusion!.detail).toBe(withheldReason(familyKey, stageKey));
}

function schoolPeer(world: World, personId: EntityId) {
  return episodeRoleBindings(world, personId).find(
    (binding) => binding.role === "school-peer",
  );
}

describe("PT3 — the school corridor is withheld until a record produces the incident", () => {
  for (const [age, seed] of [
    [10, "pt3-school-child"],
    [16, "pt3-school-teen"],
  ] as const) {
    it(`never offers a ${age}-year-old the corridor scene, and says why`, () => {
      const { world, personId } = schoolLife(age, seed);
      expectWithheld(world, personId, SCHOOL, "blamed");
      // Not for want of a cast: the school still holds a classmate the scene
      // could have named. What is missing is the incident, not the person.
      expect(schoolPeer(world, personId)).toBeDefined();
    });
  }

  it("keeps the repaired copy authored for the day a record grounds it", () => {
    const stage = episodeFamily(SCHOOL)!.stages.find(
      (candidate) => candidate.key === "blamed",
    )!;
    const text = stage.lines.join(" ");
    // What the playtest read stays gone from the authored scene.
    expect(text).not.toContain("Something got broken");
    expect(text).not.toContain("four feet away");
    expect(text).not.toMatch(/The person who did/i);
    expect(text).toContain("{detail:incident}");
    const nameThem = stage.options.find(
      (option) => option.key === "name-them",
    )!;
    expect(nameThem.label).toContain("{role:school-peer}");
    expect(nameThem.label).not.toBe("Say who did it");
  });

  it("withholds it in a different life with a different classmate, for the same reason", () => {
    const first = schoolLife(14, "pt3-school-cast-a");
    const second = schoolLife(14, "pt3-school-cast-b");
    expect(schoolPeer(first.world, first.personId)!.personName).not.toBe(
      schoolPeer(second.world, second.personId)!.personName,
    );
    expectWithheld(first.world, first.personId, SCHOOL, "blamed");
    expectWithheld(second.world, second.personId, SCHOOL, "blamed");
  });

  it("withholds the scene, with its reason, when the school holds nobody else", () => {
    const { world, personId } = schoolLife(12, "pt3-school-alone");
    const mine = new Set(
      world.history.educationEnrollments
        .filter((enrollment) => enrollment.personId === personId)
        .map((enrollment) => enrollment.id),
    );
    /*
     * The same life with nobody else enrolled anywhere. A constructed control,
     * not a played world. It used to show the stage refused for want of a
     * classmate rather than composed around an invented culprit; the withheld
     * requirement is checked first now, so the reason given is the missing
     * incident, and no culprit is invented either way.
     */
    const alone: World = {
      ...world,
      history: {
        ...world.history,
        educationEnrollments: world.history.educationEnrollments.filter(
          (enrollment) => mine.has(enrollment.id),
        ),
      },
    };
    expect(schoolPeer(alone, personId)).toBeUndefined();
    expectWithheld(alone, personId, SCHOOL, "blamed");
  });

  it("writes nothing when the scene is withheld, and a reload withholds it the same way", () => {
    const { world, personId } = schoolLife(15, "pt3-school-follow");
    const before = serializeWorld(world);
    expectWithheld(world, personId, SCHOOL, "blamed");
    // Reading eligibility created no incident, event or memory.
    expect(serializeWorld(world)).toBe(before);
    expect(
      playedEpisodeStages(world, personId).some(
        (entry) => entry.episodeKey === SCHOOL && entry.stageKey === "blamed",
      ),
    ).toBe(false);
    const reloaded = deserializeWorld(before);
    expectWithheld(reloaded, personId, SCHOOL, "blamed");
  });

  it("names two people in the house two different names", () => {
    /*
     * The adjacent home scene, which binds a guardian and a household peer in
     * the same sentence. Its option read "Tell Charles Rush — then it is
     * Charles Rush's to deal with, and Charles Rush will know it came from
     * you": the guardian and the older brother had been handed the same name
     * by the generator, so the choice named nobody the player could pick out.
     */
    for (let index = 0; index < 12; index += 1) {
      const { world, personId } = schoolLife(13, `pt3-house-${index}`);
      const cast = new Map<string, EntityId>();
      for (const binding of episodeRoleBindings(world, personId)) {
        const already = cast.get(binding.personName);
        expect(
          already === undefined || already === binding.personId,
          `two people in ${`pt3-house-${index}`} answer to ${binding.personName}`,
        ).toBe(true);
        cast.set(binding.personName, binding.personId);
      }
      expect(cast.has(personName(world.people[personId]!))).toBe(false);
    }
  });

  it("withholds the home scene in every one of those households, for the reason the bank gives", () => {
    /*
     * The adjacent home scene ("noticing") was withheld by the same review:
     * nothing records the peer's late returns, curfews or whereabouts. It used
     * to be proved here that the first ordinary life reaching it handed the
     * telling to the responsible adult by name. No ordinary life reaches it
     * now, in a household with a teenager or without one.
     */
    for (let index = 0; index < 12; index += 1) {
      const life = schoolLife(14, `pt3-house-tell-${index}`);
      expectWithheld(life.world, life.personId, HOME, "noticing");
    }
  });

  it("opens neither continuation a year on, because the corridor was never played", () => {
    /*
     * "it-stuck" and "it-came-out" turn on what the player chose in the
     * corridor. With the corridor withheld there is no choice for them to
     * turn on, however much real time passes.
     */
    const { world, personId } = schoolLife(15, "pt3-school-year");
    const later = advanceWorld(advanceWorld(world, 200), 166);
    for (const [stageKey, option] of [
      ["it-stuck", "take-it"],
      ["it-came-out", "name-them"],
    ] as const) {
      const { beat, exclusion } = stageEligibility(
        later,
        personId,
        SCHOOL,
        stageKey,
      );
      expect(beat).toBeUndefined();
      expect(exclusion!.requirement).toEqual({
        kind: "after-choice",
        stage: "blamed",
        option,
      });
    }
    expectWithheld(later, personId, SCHOOL, "blamed");
  });
});
