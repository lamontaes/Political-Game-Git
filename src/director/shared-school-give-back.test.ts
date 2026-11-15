import { describe, expect, it } from "vitest";
import { stageWorldHeld } from "../../scripts/dialogue-batch/stage-world";
import type { PersonId } from "../core2/types";
import { openConversation, say } from "./conversation";

// Asked "Remember Cumming Public Schools?", the player's answer never ends
// the talk: the asker says how long it has been, from the school record's
// year, or agrees where the player's answer already said it. Pinned to the
// seed the played talks were red at (played-talks, Nov 15: Cumming, Iowa,
// seed 7952d3f3e3253ee4, a cause-invite talk on Jan 6, 2026, "You remember
// Cumming Public Schools?" "Yes, I do." and nothing after it). The talk here
// takes the player's first offered reply ("That was 35 years ago.").
const SEED = "7952d3f3e3253ee4";
// A played year: at this seed the first question about a shared school comes
// on Jan 16, 2026, about day 350; none came within 120 days at this seed, at
// North Hornell, New York (9f8e7d6c5b4a3921) or at Rienzi, Mississippi
// (55aa55aa12345678). The run takes about 130 seconds.
const DAYS = 365;

describe("a question about a school both went to", () => {
  it("is answered back by the asker after the player's answer", () => {
    let asked = 0;
    const seen: string[] = [];
    const { report } = stageWorldHeld({
      id: "shared-school-give-back",
      seed: SEED,
      days: DAYS,
      onStaged: (staged, scene, core, director) => {
        const watched = staged.watchedId as PersonId;
        const otherId = scene?.talkToId;
        if (!scene || !otherId) return;
        const talk = openConversation(core, watched, otherId, {
          presentIds: scene.presentIds,
          director,
          occasionId: staged.momentId,
        });
        if (talk.last?.kind !== "shared-school") return;
        const choice = talk.choices[0];
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
        expect(back?.kind, seen.at(-1)).toBe("shared-school-give");
        expect(back?.sourceRecordIds.length, seen.at(-1)).toBeGreaterThan(0);
      },
    });
    const where = `${report.place.name}, seed ${report.seed}`;
    expect(
      asked,
      `${where}: questions about a school both went to`,
    ).toBeGreaterThan(0);
  }, 270_000);
});
