/**
 * What a person says at each venue, in a random place drawn from all 56: a
 * floor speech, a public comment, a campaign stop, a victory and a
 * concession each compose through the English engine in their own register,
 * with no empty slot, citing the records they were filled from.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildPopulation } from "../core2/population";
import { createLifeCore } from "../core2/life";
import { coreAPI } from "../core2/state";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import {
  ADDRESS_VENUES,
  registerForVenue,
  wordVenueSpeech,
} from "./venue-speech";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`venue-speech:${Date.now()}`).digest("hex");

describe("what a person says at each venue", () => {
  it("composes every venue in its own register from the speaker's records", () => {
    const place = drawPlace(runSeed, "venue-speech");
    const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
    const core = createLifeCore(
      buildPopulation({
        seed: place.seed,
        placeKey: place.key,
        startedAt: "2026-01-05",
        minimumPeople: 300,
      }),
      { modules: [] },
    );
    const api = coreAPI(core);
    const [speaker, rival] = [...core.people.values()].filter((p) => p.alive);
    const question = PLATFORM_QUESTIONS[0]!;
    const registers = new Set<string>();
    for (const venue of ADDRESS_VENUES)
      for (const position of [0.8, -0.8]) {
        const speech = wordVenueSpeech(api, {
          speakerId: speaker!.id,
          venue,
          question,
          position,
          recordIds: [`vote:${speaker!.id}:1`],
          opponentId: rival!.id,
          chair: position > 0 ? "male" : "female",
        });
        expect(
          speech,
          `${venue} (${position}) not spoken: ${where}`,
        ).not.toBeNull();
        expect(speech!.register, where).toBe(registerForVenue(venue, position));
        expect(speech!.text.length, where).toBeGreaterThan(3);
        expect(speech!.text, where).not.toMatch(/[{}]/);
        expect(speech!.sourceRecordIds.length, where).toBeGreaterThan(0);
        registers.add(speech!.register);
        const again = wordVenueSpeech(api, {
          speakerId: speaker!.id,
          venue,
          question,
          position,
          recordIds: [`vote:${speaker!.id}:1`],
          opponentId: rival!.id,
          chair: position > 0 ? "male" : "female",
        });
        expect(again, where).toEqual(speech);
      }
    // A floor speech for a measure and against it are different registers.
    expect(registers.has("house-support"), where).toBe(true);
    expect(registers.has("house-oppose"), where).toBe(true);
  });
});
