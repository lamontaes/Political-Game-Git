import { describe, expect, it } from "vitest";
import { stageWorldHeld } from "../../scripts/dialogue-batch/stage-world";
import type { PersonId } from "../core2/types";
import { openConversation, say } from "./conversation";

// Asked "Remember Cumming Public Schools?", the player's answer never ends
// the talk: the asker says how long it has been, from the school record's
// year, or agrees where the player's answer already said it. Pinned to the
// seed the played talks were red at (played-talks, Nov 15: Cumming, Iowa,
// seed 7952d3f3e3253ee4, a cause-invite talk on Jan 6, 2026, "You remember
// Cumming Public Schools?" "Yes, I do." and nothing after it). Every talk the
// director's scenes open is played to its close, as the played talks play
// them (a yes or a no where one is offered, else the first reply), one talk
// per pair, so the year runs as it did when the red was seen.
const SEED = "7952d3f3e3253ee4";
// A played year: a schoolmate is met through a scene only late in the year
// (the first school question at this seed came on Jan 6, 2026; none came
// within 120 days here, at North Hornell, New York, 9f8e7d6c5b4a3921, or at
// Rienzi, Mississippi, 55aa55aa12345678). The run takes about 150 seconds; the
// limit is twice that.
const DAYS = 365;
const YES_NO = /^(yes|no|yeah|nope)\b/i;

describe("a question about a school both went to", () => {
  it("is answered back by the asker after the player's answer", () => {
    const seen: string[] = [];
    const pairs = new Set<string>();
    const { report } = stageWorldHeld({
      id: "shared-school-give-back",
      seed: SEED,
      days: DAYS,
      onStaged: (staged, scene, core, director) => {
        const watched = staged.watchedId as PersonId;
        const otherId = scene?.talkToId;
        if (!scene || !otherId) return;
        const pair = [watched, otherId].sort().join("|");
        if (pairs.has(pair)) return;
        pairs.add(pair);
        const talk = openConversation(core, watched, otherId, {
          presentIds: scene.presentIds,
          director,
          occasionId: staged.momentId,
        });
        for (let turn = 0; turn < 12 && talk.choices.length; turn += 1) {
          const asked = talk.last?.kind === "shared-school";
          const choice =
            talk.choices.find((row) => YES_NO.test(row.text)) ??
            talk.choices[0]!;
          const before = talk.lines.length;
          say(core, talk, choice.key);
          if (!asked) continue;
          const back = talk.lines
            .slice(before)
            .find((line) => line.speakerId === otherId);
          seen.push(
            `${core.date}: ${talk.lines.map((line) => line.text).join(" / ")}`,
          );
          expect(back?.kind, seen.at(-1)).toBe("shared-school-give");
          expect(back?.sourceRecordIds.length, seen.at(-1)).toBeGreaterThan(0);
        }
      },
    });
    const where = `${report.place.name}, seed ${report.seed}`;
    expect(
      seen.length,
      `${where}: questions about a school both went to`,
    ).toBeGreaterThan(0);
  }, 300_000);
});
