/**
 * A business closing is told as news, never as a list of its record's fields
 * (owner, Nov 1, on "Stanton's Kitchen closes... 16 people worked here. The
 * owner was retiring... none of this is a story"). For every closing the
 * records can hold (why it closed or no reason, the owner named or not, its
 * years known or not, its workers counted or not), the story is the lede and
 * at most two sentences: who ran it, how long and why in one, then what it
 * leaves the people who worked there. Every fact the record gives is told,
 * and none is said in a sentence of its own.
 */
import { describe, expect, it } from "vitest";
import type { GroundedEnglishPacket } from "./grounded-english";
import { composeNewsStory } from "./english-newscast";

const packet = (facts: Record<string, string>): GroundedEnglishPacket => {
  const grounded = Object.fromEntries(
    Object.entries(facts).map(([key, text]) => [
      key,
      { text, sourceRecordIds: [`record:${key}`] },
    ]),
  );
  return {
    surface: "dialogue",
    momentKey: "closing-story",
    worldSeed: "closing-story",
    bankVersion: "words-newscast-v1",
    stage: "adult",
    sourceRecordIds: ["record:story"],
    facts: grounded,
    speaker: { personId: "anchor", traits: {} },
    knowledge: Object.entries(grounded).map(([factKey, fact]) => ({
      personId: "anchor",
      factKey,
      sourceRecordIds: fact.sourceRecordIds,
    })),
  } as unknown as GroundedEnglishPacket;
};

const WHYS = [null, "retiring", "no-successor", "losses", "broke"] as const;
/** A sentence that only states one field: the shape the owner turned down. */
const FIELD_LINE =
  /^(?:\d+ people worked there|It employed \d+ people|The owner was \w|\w+ \w+ owned the business|It had been open for \d+ years|The business is in )/;

describe("a closing told as news", () => {
  for (const why of WHYS)
    for (const owner of [true, false])
      for (const years of [true, false])
        for (const workers of [true, false])
          it(`why ${why ?? "none"}, owner ${owner}, years ${years}, workers ${workers}`, () => {
            const facts: Record<string, string> = {
              subject: "Stanton's Kitchen",
              year: "2024",
              industry: "food service",
              ...(why ? { [why]: "yes" } : {}),
              ...(owner ? { owner: "Ruth Stanton" } : {}),
              ...(years ? { years: "31" } : {}),
              ...(workers ? { number: "16", several: "yes" } : {}),
            };
            const story = composeNewsStory(packet(facts), "closing");
            const body = story.paragraphs ?? [];
            const context = body.slice(1);
            const text = body.join(" ");
            // The lede, then at most two sentences that connect.
            expect(context.length, text).toBeLessThanOrEqual(2);
            for (const sentence of context)
              expect(sentence, text).not.toMatch(FIELD_LINE);
            // Every fact the record gives is told.
            if (owner) expect(text).toContain("Ruth Stanton");
            if (years) expect(text).toContain("31");
            if (workers) expect(text).toContain("16");
            // The kind of business is not a sentence of its own any more.
            expect(text).not.toMatch(/food service/);
          });
});
