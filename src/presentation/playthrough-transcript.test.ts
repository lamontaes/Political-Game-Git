import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP, type NewGameSetup } from "./new-game";
import {
  fixedChooser,
  narrativeLint,
  runPlaythrough,
  transcriptToInventory,
  transcriptToMarkdown,
  varyingChooser,
} from "./playthrough-transcript";

/**
 * The deterministic playthrough harness.
 *
 * The harness exists to make narrative sequence auditable, and an audit is only
 * worth anything if it reproduces. So the property that matters most is the
 * boring one: the same inputs produce the same life, byte for byte, on any run.
 */

function setup(
  overrides: Partial<NewGameSetup> & { seed: string },
): NewGameSetup {
  return { ...DEFAULT_NEW_GAME_SETUP, ...overrides };
}

const CHILD = setup({
  seed: "harness-child",
  placeKey: "kentucky",
  startAge: 10,
  household: "shares-a-home",
  depth: "play-formative-years",
  questionnaire: "deep",
  gender: "male",
});

describe("the playthrough harness is deterministic", () => {
  it("produces byte-identical transcripts for the same config", () => {
    const first = runPlaythrough({
      label: "a",
      setup: CHILD,
      beats: 6,
      choose: varyingChooser(),
    });
    const second = runPlaythrough({
      label: "a",
      setup: CHILD,
      beats: 6,
      choose: varyingChooser(),
    });
    expect(JSON.stringify(second.beats)).toEqual(JSON.stringify(first.beats));
    expect(second.personName).toEqual(first.personName);
  });

  it("takes the same column every time under a fixed chooser", () => {
    const run = runPlaythrough({
      label: "fixed",
      setup: CHILD,
      beats: 6,
      choose: fixedChooser(0),
    });
    for (const beat of run.beats) {
      if (beat.options.length > 0) {
        expect(beat.chosenKey).toEqual(beat.options[0]!.key);
      }
    }
  });
});

describe("the harness renders a real player moment", () => {
  it("introduces present people rather than listing bare names in a shared home", () => {
    const run = runPlaythrough({
      label: "people",
      setup: CHILD,
      beats: 4,
      choose: varyingChooser(),
    });
    const anyPresent = run.beats.some((beat) => beat.presentPeople.length > 0);
    expect(anyPresent).toBe(true);
    for (const beat of run.beats) {
      for (const person of beat.presentPeople) {
        // An introduction is always at least the name; a relationship, when the
        // record knows one, is folded into it rather than invented.
        expect(person.introduction.length).toBeGreaterThan(0);
        if (person.relationship) {
          expect(person.introduction).toContain(person.relationship);
        }
      }
    }
  });

  it("assigns every beat a place and an age, and never an empty markdown render", () => {
    const run = runPlaythrough({
      label: "shape",
      setup: CHILD,
      beats: 5,
      choose: varyingChooser(),
    });
    for (const beat of run.beats) {
      expect(beat.age).toBeGreaterThanOrEqual(10);
      expect(beat.place).toEqual("Kentucky");
    }
    expect(transcriptToMarkdown(run).length).toBeGreaterThan(200);
  });
});

describe("the lint is a working diagnostic", () => {
  it("detects the machine-cadence the connective narration currently produces", () => {
    const run = runPlaythrough({
      label: "lint",
      setup: CHILD,
      beats: 8,
      choose: varyingChooser(),
    });
    const findings = narrativeLint(run);
    // This is a diagnostic of the CURRENT build, not a target: the steady-state
    // lines ("carried on", "went on being") are present today, so the lint must
    // see them. If this ever returns zero, either the narration was rewritten
    // (good — update this test) or the lint broke (bad).
    expect(findings.some((f) => f.category === "machine-cadence")).toBe(true);
  });

  it("turns a transcript into an inventory of contextualised strings", () => {
    const run = runPlaythrough({
      label: "inv",
      setup: CHILD,
      beats: 5,
      choose: varyingChooser(),
    });
    const inventory = transcriptToInventory(run);
    expect(inventory.length).toBeGreaterThan(0);
    for (const item of inventory) {
      expect(item.text.length).toBeGreaterThan(0);
      expect(item.configLabel).toEqual("inv");
      expect([
        "connective",
        "authored-scene",
        "choice",
        "thread-recap",
      ]).toContain(item.kind);
    }
  });
});
