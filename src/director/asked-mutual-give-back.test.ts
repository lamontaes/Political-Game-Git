import { describe, expect, it } from "vitest";
import { stageWorldHeld } from "../../scripts/dialogue-batch/stage-world";
import type { PersonId } from "../core2/types";
import { openConversation, say } from "./conversation";

// Asked "Have you heard from Ariana?", the player's "Nope. Not in a while."
// never ends the talk: the asker gives their own answer back, when they
// last saw the person, from their own tie. Pinned to the seed the played
// talks were red at (played-talks, Nov 14: Cumming, Iowa, seed
// 7952d3f3e3253ee4, a job-offer talk on Apr 14, 2025), the director's own
// scenes over its first four months. Before the asker's own recent contact
// held the question back, the first talk here was "Have you heard from
// Ariana?" ... "I saw her today."
// Re-pinned Nov 16 from seed 7952d3f3e3253ee4 to d4 (Sidon, Mississippi). Old premise: at that seed the
// world had a scene that ends in this question; since start at 18 moved the people and the
// opening, none leads to it any more (0 asked of 45 and 48 scenes), and asked-mutual is no
// opening subject, only a follow-up. Scanned over 120 days at nine seeds: asked at a1, d4, f6
// and 18 (one to three times), never at 7952d3f3, 9f8e7d6c, b2, e5 or 07. Red at the old seed
// (0 asked), green at d4.
// Re-pinned Nov 16 from that seed to d4 (Sidon, Mississippi). Old premise: at seed
// 7952d3f3e3253ee4 the world had a talk that ends in this question; since start at 18 moved
// the people and the opening, no scene there leads to it any more (0 asked of 45 scenes),
// and asked-mutual is no opening subject, only a follow-up. Scanned at nine seeds over 120
// days: asked at a1, d4, f6 and 18 (one to three times), never at 7952d3f3, 9f8e7d6c, b2,
// e5 or 07; red at the old seed (0 asked), green at d4.
const SEED = "d4";

describe("a question about someone both know", () => {
  it("is answered back by the asker after the player's answer", () => {
    let asked = 0;
    const seen: string[] = [];
    const { report } = stageWorldHeld({
      id: "asked-mutual-give-back",
      seed: SEED,
      days: 120,
      onStaged: (staged, scene, core, director) => {
        const watched = staged.watchedId as PersonId;
        const otherId = scene?.talkToId;
        if (!scene || !otherId) return;
        const talk = openConversation(core, watched, otherId, {
          presentIds: scene.presentIds,
          director,
          occasionId: staged.momentId,
        });
        if (talk.last?.kind !== "asked-mutual") return;
        // The answer the played talks gave: a yes or a no where one is offered.
        const choice =
          talk.choices.find((row) => /^(yes|no|yeah|nope)\b/i.test(row.text)) ??
          talk.choices[0];
        if (!choice) return;
        asked += 1;
        const before = talk.lines.length;
        say(core, talk, choice.key);
        const back = talk.lines
          .slice(before)
          .find((line) => line.speakerId === otherId);
        seen.push(
          `${core.date}: ${talk.lines.map((line) => line.text).join(" / ")}`,
        );
        expect(back?.kind, seen.at(-1)).toBe("asked-mutual-give");
        expect(back?.sourceRecordIds.length, seen.at(-1)).toBeGreaterThan(0);
        // Nobody asks after someone they saw today or yesterday: they would
        // tell it (Words lead, Nov 15).
        expect(back?.text, seen.at(-1)).not.toMatch(/\b(today|yesterday)\b/);
      },
    });
    const where = `${report.place.name}, seed ${report.seed}`;
    expect(
      asked,
      `${where}: questions about someone both know`,
    ).toBeGreaterThan(0);
  }, 180_000);
});
