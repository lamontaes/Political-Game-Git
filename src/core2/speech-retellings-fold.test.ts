import { describe, expect, it } from "vitest";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore, createLifeCore } from "./life";
import {
  addressesGivenBy,
  deliverSpeech,
  retellingsOf,
  speechModule,
} from "./modules/speech";
import { viewsModule } from "./modules/views";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";
import rows from "./data/speech/parameters.json" with { type: "json" };

// A speech's retellings are rows for speechRetellingKeptDays, then dropped
// (core-long-run-speech-retellings-fold); the speech's address stays.
const seed = process.env.GOLDEN_PATH_SEED ?? "speech-fold-a";
const input = buildPopulation({
  seed,
  ...(process.env.GOLDEN_PATH_SEED
    ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
    : {}),
  startedAt: "2021-01-01",
  minimumPeople: 300,
});
const kept = (rows as Record<string, { value: number }>)
  .speechRetellingKeptDays!.value;

describe(`a speech's retellings in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("stay through the kept days and are dropped the day after, while the address stays", () => {
    const core = createLifeCore(input, {
      modules: [viewsModule, speechModule],
    });
    const api = coreAPI(core);
    const adults = [...core.people.values()].filter(
      (row) =>
        row.tier !== "husk" &&
        row.alive &&
        ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(input.startedAt)) >=
          18,
    );
    const speaker = adults[0]!;
    const heard = deliverSpeech(api, {
      id: "fold-speech",
      speakerId: speaker.id,
      placeId: speaker.placeId,
      topic: "fixture:park",
      desiredChange: "build-park",
      audienceIds: adults.slice(1, 41).map((row) => row.id),
    });
    expect(heard.length).toBeGreaterThan(0);
    const given = makeIsoDate(core.date);

    advanceCore(core, addDays(given, kept - 1));
    expect(retellingsOf(api, "fold-speech").length).toBe(heard.length);

    advanceCore(core, addDays(given, kept));
    expect(retellingsOf(api, "fold-speech")).toEqual([]);
    expect(addressesGivenBy(api, speaker.id)).toContain("fold-speech");
  });
});
