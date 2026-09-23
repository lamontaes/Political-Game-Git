import { describe, expect, it } from "vitest";
import {
  advanceWorldMinutes,
  deserializeWorld,
  eligibleEpisodeBeats,
  playEpisodeOption,
  serializeWorld,
} from "../simulation";
import {
  OPENING_LIFE_ADDITIONS,
  OPENING_LIFE_FAMILIES,
  OPENING_LIFE_LATER,
  openingLaterStageKey,
  openingLifeFamily,
  openingLifeSceneAtStage,
  type OpeningLifeLater,
} from "../simulation/opening-life-content";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";

const DAY = 24 * 60;
// The mechanism is exercised against placeholder entries, one for each of the
// first two choices of one school-age moment. They are not content: the owner
// rejected every drafted later scene, and shipped play reads an empty table.
const PLACEHOLDER_SCENE = OPENING_LIFE_ADDITIONS.find(
  (scene) => scene.key.startsWith("early.school.") && scene.choices.length >= 2,
)!;
const PROPOSED: Readonly<Record<string, readonly OpeningLifeLater[]>> = {
  [PLACEHOLDER_SCENE.key]: PLACEHOLDER_SCENE.choices
    .slice(0, 2)
    .map((choice, index) => ({
      key: `placeholder-${index}`,
      afterChoice: choice.key,
      afterDays: 5 + index * 2,
      premise: `Placeholder later stage ${index} with {person}.`,
      choices: [
        {
          key: "first",
          label: `Placeholder choice ${index}a`,
          aftermath: "Placeholder.",
        },
        {
          key: "second",
          label: `Placeholder choice ${index}b`,
          aftermath: "Placeholder.",
        },
      ],
    })),
};
const FAMILIES = OPENING_LIFE_ADDITIONS.map((scene) =>
  openingLifeFamily(scene, undefined, PROPOSED),
);

it("offers no later answer in shipped play until one is researched", () => {
  expect(OPENING_LIFE_LATER).toEqual({});
  for (const family of OPENING_LIFE_FAMILIES)
    expect(
      family.stages.filter((stage) => stage.key.startsWith("later.")),
      family.key,
    ).toEqual([]);
  // The placeholders would add stages, so the empty assertion above is not
  // vacuous.
  expect(
    FAMILIES.flatMap((family) => family.stages).filter((stage) =>
      stage.key.startsWith("later."),
    ),
  ).toHaveLength(Object.values(PROPOSED).flat().length);
});

describe("a later scene answers the choice actually recorded, after the time actually passed", () => {
  it.each(
    Object.keys(PROPOSED).map(
      (key) =>
        [
          key,
          OPENING_LIFE_ADDITIONS.find((scene) => scene.key === key)!,
        ] as const,
    ),
  )("%s", (key, definition) => {
    expect(definition, key).toBeDefined();
    const laters = PROPOSED[key]!;
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startKind: "custom",
      household: "shares-a-home",
      seed: "later-scenes",
      startAge: definition.ages[0],
    });
    const { playerPersonId: personId } = game;
    const beats = (world: typeof game.world) =>
      eligibleEpisodeBeats({
        world,
        personId,
        families: FAMILIES,
      }).beats.filter((beat) => beat.episodeKey === `opening.${key}`);
    const moment = beats(game.world).find((beat) => beat.stageKey === "moment");
    expect(moment, key).toBeDefined();

    for (const choice of definition.choices) {
      const answered = playEpisodeOption(game.world, {
        personId,
        beat: moment!,
        optionKey: choice.key,
        families: FAMILIES,
      }).world;
      const expected = laters.filter(
        (later) => later.afterChoice === choice.key,
      );
      const laterStages = (world: typeof game.world) =>
        beats(world)
          .filter((beat) => beat.stageKey.startsWith("later."))
          .map((beat) => beat.stageKey);

      // Nothing answers a choice on the day it was made.
      expect(laterStages(answered), choice.key).toEqual([]);

      for (const later of laters) {
        const stageKey = openingLaterStageKey(later);
        const short = advanceWorldMinutes(
          answered,
          (later.afterDays - 1) * DAY,
        );
        expect(
          laterStages(short),
          `${choice.key} ${stageKey} early`,
        ).not.toContain(stageKey);
        const due = deserializeWorld(
          serializeWorld(advanceWorldMinutes(short, DAY)),
        );
        const before = serializeWorld(due);
        const offered = beats(due).find((beat) => beat.stageKey === stageKey);
        // Looking at what is offered records nothing.
        expect(serializeWorld(due)).toBe(before);
        expect(!!offered, `${choice.key} ${stageKey}`).toBe(
          expected.includes(later),
        );
        if (!offered) continue;
        // The same person as the first moment, never whoever is nearest now.
        expect(offered.bindings).toEqual(moment!.bindings);
        const atStage = openingLifeSceneAtStage(
          definition,
          stageKey,
          PROPOSED,
        )!;
        expect(offered.options.map((option) => option.key)).toEqual(
          atStage.choices.map((option) => option.key),
        );
        const played = playEpisodeOption(due, {
          personId,
          beat: offered,
          optionKey: later.choices[0]!.key,
          families: FAMILIES,
        }).world;
        // A later answer plays once.
        expect(laterStages(played)).not.toContain(stageKey);
      }
    }
  });

  it("gives opposite answers to one moment different later scenes", () => {
    for (const [key, laters] of Object.entries(PROPOSED)) {
      const choices = new Set(laters.map((later) => later.afterChoice));
      expect(choices.size, key).toBe(laters.length);
      const definition = OPENING_LIFE_ADDITIONS.find(
        (scene) => scene.key === key,
      )!;
      for (const later of laters)
        expect(
          definition.choices.map((choice) => choice.key),
          `${key} ${later.key}`,
        ).toContain(later.afterChoice);
    }
  });
});
