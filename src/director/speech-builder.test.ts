import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { OPENING_DATE } from "../../scripts/dialogue-batch/play-lives";
import stagesJson from "../../data/english/parts/speech-stages.json" with { type: "json" };
import { coreAPI } from "../core2/state";
import { stancesOf } from "../core2/modules/views";
import {
  SPEECH_STAGES,
  beginSpeech,
  chooseSpeechPart,
  giveBuiltSpeech,
  speechText,
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

// Every stage sentence in speech-stages.json is hand-written, and the owner
// ruled (Oct 6, EN-1 to EN-3) that no text the English engine did not write
// ships. Those parts are held (words-authored-parts-shippable-sweep), so the
// builder offers no stage until the engine composes or mines one (pool item
// words-speech-stage-parts). Until then it must offer nothing, never an empty
// or hand-written line, and giving the empty speech must move no one.
describe(`a built speech in ${place.key} (seed ${place.seed})`, () => {
  it("offers no stage while every stage part is hand-written, and never an authored line", () => {
    const authored = (
      stagesJson as unknown as {
        parts: { text: string; origin?: string; shippable: boolean }[];
      }
    ).parts.filter((part) => part.origin === "authored");
    expect(authored.length).toBeGreaterThan(0);
    expect(authored.every((part) => !part.shippable)).toBe(true);
    const build = beginSpeech(core, speakerId)!;
    expect(build).not.toBeNull();
    expect(build.done).toBe(false);
    expect(build.picked).toEqual([]);
    expect(build.choices).toEqual([]);
    expect(SPEECH_STAGES).toEqual(["opener", "core", "core", "closer"]);
  });

  it("changes nothing when a part that was never offered is picked", () => {
    const build = beginSpeech(core, speakerId)!;
    const after = chooseSpeechPart(core, build, "core:no-such-subject");
    expect(after).toEqual(build);
    expect(speechText(after)).toBe("");
  });

  it("gives an empty speech to no one: no stand reaches the speech engine and no view moves", () => {
    const build = beginSpeech(core, speakerId)!;
    const audience = [...core.people.values()]
      .filter(
        (row) =>
          row.alive &&
          row.id !== speakerId &&
          row.placeId === core.people.get(speakerId)!.placeId,
      )
      .slice(0, 30)
      .map((row) => row.id);
    expect(audience.length).toBeGreaterThan(0);
    const api = coreAPI(core);
    const before = audience.map((id) => JSON.stringify(stancesOf(api, id)));
    expect(giveBuiltSpeech(core, build, audience)).toEqual([]);
    expect(audience.map((id) => JSON.stringify(stancesOf(api, id)))).toEqual(
      before,
    );
  });
});
