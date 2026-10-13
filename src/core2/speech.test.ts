import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { buildDeepPast } from "./deep-past";
import { createLifeCore } from "./life";
import { deliverSpeech, speechModule } from "./modules/speech";
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

  it("moves its audience about as much as persuasion experiments find", () => {
    // About 5 points on policy views after persuasive information (Coppock
    // 2023): 0.05 on the 0-to-1 stance scale, on average.
    const mean =
      retellings.reduce((sum, row) => sum + row.moved, 0) / retellings.length;
    expect(mean).toBeGreaterThan(0.025);
    expect(mean).toBeLessThan(0.1);
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

  it("draws listeners' leans toward the speaker's, and a run of speeches moves some along the party scale", () => {
    const before = new Map(audience.map((id) => [id, { ...viewOf(api, id)! }]));
    const speakerLean = viewOf(api, speaker.id)!.lean;
    // A campaign's worth of speeches to the same audience.
    for (let n = 0; n < 30; n += 1)
      deliverSpeech(api, {
        id: `fixture-rally-${n}`,
        speakerId: speaker.id,
        placeId: speaker.placeId,
        topic: `fixture:rally-${n}`,
        desiredChange: "elect-speaker",
        audienceIds: audience,
      });
    let closer = 0;
    let changed = 0;
    for (const id of audience) {
      const was = before.get(id)!;
      const now = viewOf(api, id)!;
      if (Math.abs(now.lean - speakerLean) < Math.abs(was.lean - speakerLean))
        closer += 1;
      // Never moved away from the speaker.
      expect(Math.abs(now.lean - speakerLean)).toBeLessThanOrEqual(
        Math.abs(was.lean - speakerLean) + 1e-9,
      );
      if (now.party !== was.party) {
        changed += 1;
        expect(
          [...core.eventIds].some((e) =>
            e.startsWith(`views.party-changed:${id}:`),
          ),
        ).toBe(true);
      }
    }
    expect(closer).toBeGreaterThan(0);
    // Party is the stablest attitude: most keep theirs (Pew 2020: about 8 in 10
    // gave the same answer across five waves over two years).
    expect(changed / audience.length).toBeLessThan(0.3);
  });
});
