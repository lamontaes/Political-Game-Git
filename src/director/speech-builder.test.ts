import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "../core2/game-start";
import { coreAPI } from "../core2/state";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { fileCandidacy, openContests } from "../core2/modules/elections";
import { lawChain } from "../core2/modules/laws";
import type { PersonId } from "../core2/types";
import { outlineOf, planSpeech } from "./speech-outline";
import { campaignSpeaker } from "./local-speeches";
import {
  beginSpeech,
  chooseSpeechPart,
  speechText,
  stagesOf,
  type SpeechBuild,
} from "./speech-builder";

// A speech is built as it is given, one part a click, by the one planner: the
// greeting, a part for each point the speech's row plans, and a close. Pinned
// to one place and seed (Lakeridge, Nevada, a governor's race the world opens
// in January 2026); the speech is the first of the town's best-connected
// adults who files.
const PLACE = "3239100";
const SEED = "speech-planner-pin";

const world = buildBenchWorld(SEED, gameStartDate(), {
  twoLevel: true,
  placeKey: PLACE,
});
const { core } = world;
const api = coreAPI(core);

/** The town's best-connected adults file in the first race that takes one and has a speech to build; the world runs a week at a time until one does. */
function candidate(): {
  speakerId: PersonId;
  officeId: string;
  party: string | null;
  start: SpeechBuild;
} {
  const town = lawChain(api).townPlaceId;
  const adults = [...core.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === town &&
        Number(core.date.slice(0, 4)) - Number(p.birthDate.slice(0, 4)) >= 35,
    )
    .sort(
      (a, b) =>
        b.familyIds.size +
          b.knownIds.size -
          a.familyIds.size -
          a.knownIds.size || a.id.localeCompare(b.id),
    )
    .slice(0, 8);
  for (let week = 0; week < 60; week += 1) {
    for (const person of adults)
      for (const contest of openContests(api)) {
        const result = fileCandidacy(api, {
          personId: person.id,
          contestId: contest.id,
          platform: [],
        });
        if (result.status === "refused") continue;
        const race = {
          officeId: contest.officeId,
          party: result.filing.party ?? null,
        };
        const start = beginSpeech(core, person.id, race);
        if (start) return { speakerId: person.id, ...race, start };
      }
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
  }
  throw new Error(`no race took a speaker in ${PLACE}`);
}
const { speakerId, officeId, party, start } = candidate();

const play = (pick: (build: SpeechBuild) => string): SpeechBuild => {
  let build = start;
  while (!build.done) build = chooseSpeechPart(core, build, pick(build));
  return build;
};

describe(`a built speech in ${PLACE} (seed ${SEED}, speaker ${speakerId})`, () => {
  it("takes its form from the speech's row, a greeting, a part for each point and a close", () => {
    const stages = stagesOf();
    expect(stages[0]).toBe("opener");
    expect(stages.at(-1)).toBe("closer");
    expect(stages.length).toBe(outlineOf("campaign").points + 2);
    expect(start.stages).toEqual(stages);
  });

  it("offers up to four different parts at each click, each the planner's sentences from the speaker's records", () => {
    let build = start;
    const seen: string[] = [];
    while (!build.done) {
      expect(build.choices.length).toBeGreaterThan(0);
      expect(build.choices.length).toBeLessThanOrEqual(4);
      expect(new Set(build.choices.map((row) => row.text)).size).toBe(
        build.choices.length,
      );
      for (const choice of build.choices) {
        expect(choice.sourceRecordIds.length).toBeGreaterThan(0);
        expect(choice.text).not.toMatch(/\{\{|\}\}/);
      }
      seen.push(build.choices[0]!.stage);
      build = chooseSpeechPart(core, build, build.choices[0]!.key);
    }
    expect(seen[0]).toBe("opener");
    expect(seen.at(-1)).toBe("closer");
    expect(seen.filter((stage) => stage === "core").length).toBeGreaterThan(0);
  });

  it("says exactly the words the player saw, planned with one theme and an ask for each point picked", () => {
    const build = play((now) => now.choices[0]!.key);
    expect(speechText(build)).toBe(
      build.picked.map((row) => row.text).join(" "),
    );
    const questions = build.picked.filter((row) => row.subject);
    expect(questions.length).toBeGreaterThan(0);
    for (const row of questions)
      expect(row.stand?.question, row.key).toBe(row.subject);
    const speaker = campaignSpeaker(core, speakerId, officeId, party)!;
    const plan = planSpeech(core, "campaign", {
      ...speaker,
      chosen: questions.map((row) => row.subject),
    });
    expect(plan.theme).not.toBeNull();
    expect(plan.asks).toEqual(questions.map((row) => row.subject));
  });

  it("builds a different speech from different choices", () => {
    const first = speechText(play((now) => now.choices[0]!.key));
    const last = speechText(play((now) => now.choices.at(-1)!.key));
    expect(first).not.toBe(last);
  });

  it("changes nothing for a key that is not on offer", () => {
    expect(chooseSpeechPart(core, start, "no-such-part")).toBe(start);
  });
});
