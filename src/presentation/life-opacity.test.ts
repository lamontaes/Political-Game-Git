import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  EPISODE_FAMILIES,
  adultSituationBank,
  setupQuestionnaireBank,
} from "../simulation";
import { projectStoryMoment } from "./life-story";
import { projectLifeRecord } from "./life-record";
import { openThreadRecaps } from "./life-narration";
import { createNewGameWorld, type NewGameSetup } from "./new-game";

/**
 * What the player is not shown.
 *
 * The adaptive layer only works while it can be surprised. A player who can
 * read which axis a question measures answers the axis; a player who can see
 * that a moment was ranked as demanding treats every hard-looking choice as a
 * promise the world has not made. So the interesting properties of this wave
 * are all negative, and negative properties are the ones that rot silently —
 * a helpful label appears on a screen one day and nothing notices.
 *
 * Hence this file. It holds the silence shut in three places: what the play
 * surface imports, what the play surface renders, and what the authored copy
 * says about itself.
 */

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * The module whose whole purpose is to say what the game has concluded.
 *
 * `life-diagnostics` exists for tests, audits and the completion report:
 * calibration traces, beat traces, model audits, life shapes. Nothing that
 * renders may reach it, and the check is on the import rather than on the
 * output, because an import is what makes a leak possible in the first place.
 *
 * The ranking modules are deliberately NOT on this list, and the distinction
 * matters. `player-model` and `situation-selection` are used by the story
 * surface, and have to be: something has to decide which beat to offer. What
 * must not escape is the ranking's *account of itself* — the tier, the reason,
 * the cross-pressure reading — and that is held shut by the projected types
 * rather than by an import ban. `StoryMoment` has no field to put a reason in;
 * `traceStorySelection` returns it and is called by tests and by
 * `life-diagnostics` and by nothing that renders.
 */
const DIAGNOSTIC_MODULES = ["life-diagnostics", "playthrough-transcript"];

/** Surfaces a player actually sees. */
const PLAYER_SURFACES = [
  join(HERE, "..", "player"),
  join(HERE, "life-story.ts"),
  join(HERE, "life-narration.ts"),
  join(HERE, "life-record.ts"),
];

async function sourceFiles(target: string): Promise<readonly string[]> {
  try {
    const entries = await readdir(target, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const full = join(target, entry.name);
        if (entry.isDirectory()) return sourceFiles(full);
        return entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")
          ? [full]
          : [];
      }),
    );
    return nested.flat();
  } catch {
    return [target];
  }
}

describe("The play surface cannot see what the game concluded", () => {
  it("imports no diagnostic module anywhere a player can reach", async () => {
    const files = (await Promise.all(PLAYER_SURFACES.map(sourceFiles))).flat();
    expect(files.length).toBeGreaterThan(3);
    const offenders: string[] = [];
    for (const file of files) {
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
      const source = await readFile(file, "utf8");
      for (const module of DIAGNOSTIC_MODULES) {
        const pattern = new RegExp(
          `(?:from\\s+|import\\s*\\(\\s*)["'][^"']*${module}["']`,
        );
        if (pattern.test(source)) {
          offenders.push(`${file} imports ${module}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */

const FORECAST_WORDS =
  /\bstakes\b|\bpressing\b|\bnotable\b|\bordinary tier\b|cross[- ]pressure|dormant|thread key|instance key|episode key|salience|confidence|prior\b|weight\b|dimension\b/i;

function setup(overrides: Partial<NewGameSetup>): NewGameSetup {
  return {
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: "opacity",
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
    ...overrides,
  };
}

describe("Nothing a player is shown says how much it matters", () => {
  it("keeps rationing vocabulary out of every projected surface", () => {
    for (const seed of ["opacity-a", "opacity-b", "opacity-c"]) {
      for (const age of [9, 34, 52]) {
        const created = createNewGameWorld(
          setup({
            seed,
            startAge: age,
            depth: age < 18 ? "play-formative-years" : "summarize-earlier-life",
          }),
        );
        const moment = projectStoryMoment(
          created.world,
          created.playerPersonId,
        );
        const shown = [
          moment.connective.sentences.join(" "),
          moment.scene.prose,
          ...moment.scene.options.flatMap((option) => [
            option.label,
            option.description,
          ]),
          ...moment.openThreads.map((entry) => entry.sentence),
        ].join("\n");
        expect(shown, `${seed}/${age}`).not.toMatch(FORECAST_WORDS);
      }
    }
  });

  it("keeps it out of the journal too", () => {
    const created = createNewGameWorld(setup({ seed: "opacity-journal" }));
    const record = projectLifeRecord(created.world, created.playerPersonId);
    const shown = [
      record.summary,
      ...record.chapters.flatMap((chapter) => [
        chapter.heading,
        ...chapter.entries.map((entry) => entry.sentence),
      ]),
      ...record.people.map((person) => person.sentence),
      ...record.open.map((entry) => entry.sentence),
    ].join("\n");
    expect(shown).not.toMatch(FORECAST_WORDS);
    expect(shown).not.toMatch(/what you remember/i);
  });

  it("never names a thread's machinery in a recap", () => {
    const created = createNewGameWorld(setup({ seed: "opacity-recap" }));
    for (const recap of openThreadRecaps(
      created.world,
      created.playerPersonId,
      10,
    )) {
      expect(recap.sentence).not.toMatch(FORECAST_WORDS);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe("The authored copy does not explain itself", () => {
  it("names no axis, tier or model term in anything a player reads", () => {
    for (const family of EPISODE_FAMILIES) {
      for (const stage of family.stages) {
        const shown = [
          ...stage.lines,
          ...stage.options.flatMap((option) => [
            option.label,
            option.description,
            option.memory,
          ]),
        ].join("\n");
        expect(shown, `${family.key}/${stage.key}`).not.toMatch(
          /\bstakes\b|cross[- ]pressure|dimension|salience|player model|adaptive/i,
        );
      }
    }
  });

  it("keeps political labels out of the calibration a player reads", () => {
    for (const item of setupQuestionnaireBank()) {
      const shown = [
        item.prompt,
        ...item.options.map((option) => option.text),
      ].join("\n");
      expect(shown, item.key).not.toMatch(
        /\b(?:liberal|conservative|left[- ]wing|right[- ]wing|libertarian|authoritarian|progressive|populist)\b/i,
      );
      // And no option tells the player which axis it is answering.
      expect(shown, item.key).not.toMatch(
        /\b(?:econ-distribution|civic-order|governance-scale|decision-style|personal-ties)\b/,
      );
    }
  });

  /**
   * An option description says what the choice IS. It does not say how it will
   * turn out.
   *
   * The dialogue audit found exactly one violation in four hundred and
   * thirty-six authored options — "It will probably not be raised." — which
   * handed the player the outcome before they made the choice. One is a small
   * number and it is also the number that matters: the whole aftermath design
   * rests on a player not being able to tell in advance which decisions come
   * back, and a description that tells them makes the honest zero-consequence
   * options readable as safe.
   *
   * The rule is deliberately narrow. Ten shipped descriptions use "will" or
   * "would" legitimately — "They will be annoyed", "It will take months either
   * way", "You said you would" — because a known cost of an option is part of
   * what the option is. What is banned is *hedged prediction of the
   * consequence*: probably, likely, chances are, nothing will come of it. That
   * is the game guessing on the player's behalf.
   */
  it("never tells the player how a choice will turn out", () => {
    const forecast =
      /\b(?:probably|most likely|likely to|chances are|odds are|in all likelihood)\b|\bnothing (?:much )?(?:will|would) come of\b|\b(?:will|would) (?:probably )?(?:not )?(?:come back|be raised|be remembered|be noticed|be forgotten)\b|\bno ?(?:one|body) (?:will|would) (?:notice|remember|mind|care)\b/i;

    const offenders: string[] = [];
    for (const family of EPISODE_FAMILIES) {
      for (const stage of family.stages) {
        for (const option of stage.options) {
          if (forecast.test(option.description)) {
            offenders.push(
              `${family.key}/${stage.key} [${option.key}]: ${option.description}`,
            );
          }
        }
      }
    }
    for (const situation of adultSituationBank()) {
      for (const option of situation.options) {
        if (forecast.test(option.description)) {
          offenders.push(
            `${situation.key} [${option.key}]: ${option.description}`,
          );
        }
      }
    }
    expect(offenders).toEqual([]);

    // The one that shipped, and the shapes the next one is likeliest to take.
    for (const written of [
      "It will probably not be raised.",
      "Nothing will come of it.",
      "Nobody will notice either way.",
      "Chances are it never comes up again.",
      "This will probably be remembered.",
    ]) {
      expect(forecast.test(written), written).toBe(true);
    }

    // And the shipped descriptions that are about the choice, not the outcome.
    for (const legitimate of [
      "They will be annoyed.",
      "It is duller and they will say so.",
      "It costs money you would notice.",
      "You will have to say how it got here.",
      "It might be wrong. It will take months either way.",
      "Say you will, and mean the standing version.",
      "Not something you will put your name to.",
      "You said you would.",
    ]) {
      expect(forecast.test(legitimate), legitimate).toBe(false);
    }
  });

  it("keeps development vocabulary out of the authored banks", () => {
    const developer =
      /\bfixture\b|\bplaceholder\b|\bstage[- ]?6\b|\bTODO\b|\blorem\b|\bsynthetic\b/i;
    for (const family of EPISODE_FAMILIES) {
      for (const stage of family.stages) {
        for (const line of stage.lines) {
          expect(line, `${family.key}/${stage.key}`).not.toMatch(developer);
        }
      }
    }
    for (const item of setupQuestionnaireBank()) {
      expect(item.prompt, item.key).not.toMatch(developer);
    }
  });
});
