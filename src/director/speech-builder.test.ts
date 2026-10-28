import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { OPENING_DATE } from "../../scripts/dialogue-batch/play-lives";
import {
  SPEECH_STAGES,
  beginSpeech,
  chooseSpeechPart,
  speechText,
  type SpeechBuild,
} from "./speech-builder";

// A speech is built as it is given: a short opener, two longer parts at the
// core on different subjects, a short closer, four choices at each stage, all
// worded from the speaker's records in a drawn place.
const seed = process.env.GOLDEN_PATH_SEED ?? "speech-builder";
const place = drawPlace(seed, "speech-builder");
const world = buildBenchWorld(place.seed, OPENING_DATE, {
  twoLevel: true,
  placeKey: place.key,
});
const { core } = world;
const speakerId = world.playerId!;

const play = (pick: (build: SpeechBuild) => string): SpeechBuild => {
  let build = beginSpeech(core, speakerId)!;
  while (!build.done) build = chooseSpeechPart(core, build, pick(build));
  return build;
};

describe(`a built speech in ${place.key} (seed ${place.seed})`, () => {
  it("offers four choices at each of four stages, the core parts on different subjects", () => {
    let build = beginSpeech(core, speakerId)!;
    expect(build).not.toBeNull();
    for (const stage of SPEECH_STAGES) {
      expect(build.choices.length).toBeGreaterThan(0);
      expect(build.choices.length).toBeLessThanOrEqual(4);
      for (const choice of build.choices) {
        expect(choice.stage).toBe(stage);
        expect(choice.sourceRecordIds.length).toBeGreaterThan(0);
        expect(choice.text).not.toMatch(/\{\{|\}\}/);
      }
      expect(new Set(build.choices.map((row) => row.subject)).size).toBe(
        stage === "core" ? build.choices.length : 1,
      );
      build = chooseSpeechPart(core, build, build.choices[0]!.key);
    }
    expect(build.done).toBe(true);
    expect(build.picked.map((row) => row.stage)).toEqual([...SPEECH_STAGES]);
    const [first, second] = build.picked.filter((row) => row.stage === "core");
    expect(first!.subject).not.toBe(second!.subject);
    // The core is longer than the opener and the closer.
    const [opener, , , closer] = build.picked;
    for (const edge of [opener!, closer!])
      expect(first!.text.length).toBeGreaterThan(edge.text.length);
  });

  it("builds a different speech from different choices", () => {
    const first = speechText(play((build) => build.choices[0]!.key));
    const last = speechText(play((build) => build.choices.at(-1)!.key));
    expect(first).not.toBe(last);
  });
});
