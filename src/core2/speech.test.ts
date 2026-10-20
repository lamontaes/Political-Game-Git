import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { buildDeepPast } from "./deep-past";
import { createLifeCore } from "./life";
import {
  deliverSpeech,
  SPEECH_OCCASION_KEY,
  speechModule,
} from "./modules/speech";
import { stancesOf, viewOf, viewsModule } from "./modules/views";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";

// M4-04: a speech changes specific listeners' views, by who they are, and
// some of them retell it at home.
const seed = process.env.GOLDEN_PATH_SEED ?? "speech-a";
const input = buildDeepPast(
  buildPopulation({
    seed,
    ...(process.env.GOLDEN_PATH_SEED
      ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
      : {}),
    startedAt: "2021-01-01",
    minimumPeople: 500,
  }),
);
const core = createLifeCore(input, { modules: [viewsModule, speechModule] });
const api = coreAPI(core);
const adults = [...core.people.values()].filter(
  (row) =>
    row.tier !== "husk" &&
    row.alive &&
    ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(input.startedAt)) >= 18,
);
const speaker = adults[0]!;
const audience = adults.slice(1, 61).map((row) => row.id);
const topic = "fixture:park";
const retellings = deliverSpeech(api, {
  id: "fixture-speech",
  speakerId: speaker.id,
  placeId: speaker.placeId,
  topic,
  desiredChange: "build-park",
  audienceIds: audience,
});

describe(`a speech in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("moves listeners near the speaker's lean more than those far from it", () => {
    const lean = viewOf(api, speaker.id)!.lean;
    const rows = retellings.map((row) => ({
      distance: Math.abs(viewOf(api, row.listenerId)!.lean - lean),
      moved: row.moved,
    }));
    const near = rows.filter((row) => row.distance < 1);
    const far = rows.filter((row) => row.distance >= 2);
    const mean = (list: typeof rows) =>
      list.reduce((sum, row) => sum + row.moved, 0) / Math.max(1, list.length);
    expect(near.length).toBeGreaterThan(0);
    if (far.length) expect(mean(near)).toBeGreaterThan(mean(far));
    for (const row of retellings.filter((r) => r.moved > 0)) {
      const stance = stancesOf(api, row.listenerId).find(
        (s) => s.topic === topic,
      )!;
      expect(stance.causes.some((c) => c.eventId === "fixture-speech")).toBe(
        true,
      );
    }
  });

  it("says what it was given at", () => {
    const heard: Record<string, Record<string, string> | undefined> = {};
    api.subscribeEvents(
      "speech-occasion",
      ["speech.heard", "speech.retold"],
      (_api, event) => {
        heard[event.id] = event.facts;
      },
    );
    for (const [id, occasion] of [
      ["occasion-hearing", "hearing"],
      ["occasion-none", undefined],
    ] as const)
      deliverSpeech(api, {
        id,
        ...(occasion ? { occasion } : {}),
        speakerId: speaker.id,
        placeId: speaker.placeId,
        topic: "fixture:library",
        desiredChange: "build-library",
        audienceIds: audience,
      });
    expect(heard["occasion-hearing"]?.[SPEECH_OCCASION_KEY]).toBe("hearing");
    expect(heard["occasion-none"]).toBeDefined();
    expect(heard["occasion-none"]?.[SPEECH_OCCASION_KEY]).toBeUndefined();
    for (const [id, facts] of Object.entries(heard))
      if (id.startsWith("occasion-hearing:retold:"))
        expect(facts?.[SPEECH_OCCASION_KEY]).toBe("hearing");
  });

  it("is retold by some listeners, not all, and the retelling moves their household", () => {
    const retold = retellings.filter((row) => row.retold);
    expect(retold.length).toBeGreaterThan(0);
    expect(retold.length).toBeLessThan(retellings.length);
    const household = retold.flatMap((row) => row.toIds);
    expect(
      household.some((id) =>
        stancesOf(api, id).some((s) =>
          s.causes.some((c) => c.eventId.startsWith("fixture-speech:retold:")),
        ),
      ),
    ).toBe(true);
  });

  it("leaves people who neither heard it nor were told untouched", () => {
    const reached = new Set([
      speaker.id,
      ...audience,
      ...retellings.flatMap((row) => row.toIds),
    ]);
    for (const row of adults.filter((r) => !reached.has(r.id)))
      expect(stancesOf(api, row.id)).toEqual([]);
  });
});
