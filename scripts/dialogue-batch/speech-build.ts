/**
 * A staged speech in a drawn place, for the grading batch: the four choices
 * at each stage, the choice taken, and the speech it builds. Development
 * tooling; shipped play never imports it.
 *
 *   node --import tsx scripts/dialogue-batch/speech-build.ts --seed <seed>
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import {
  SPEECH_STAGES,
  beginSpeech,
  chooseSpeechPart,
  speechText,
} from "../../src/director/speech-builder";
import { drawPlace } from "../core2-year/place";
import { OPENING_DATE } from "./play-lives";

const at = process.argv.indexOf("--seed");
const seed = at >= 0 ? process.argv[at + 1]! : "speech-build";
const place = drawPlace(seed, "speech-build");
setBookkeeping(false);
const { core, playerId } = buildBenchWorld(place.seed, OPENING_DATE, {
  twoLevel: true,
  placeKey: place.key,
});
const speaker = core.people.get(playerId!)!;
console.log(
  `Speech by ${speaker.givenName} ${speaker.familyName}, ${core.people.get(playerId!)!.placeId}, place ${place.key} (seed ${place.seed})`,
);
let build = beginSpeech(core, playerId!)!;
for (const stage of SPEECH_STAGES) {
  console.log(`\n${stage.toUpperCase()}`);
  build.choices.forEach((row, n) =>
    console.log(`  ${n + 1}. ${row.text}  [${row.sourceRecordIds.join(", ")}]`),
  );
  build = chooseSpeechPart(core, build, build.choices[0]!.key);
}
console.log(`\nThe speech, as given:\n${speechText(build)}`);
