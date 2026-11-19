import { describe, expect, it } from "vitest";
import { stageWorldHeld } from "../../scripts/dialogue-batch/stage-world";
import type { PersonId } from "../core2/types";
import { openConversation } from "./conversation";
import { spokenWhenRow } from "./words";

// Asked "Have you seen Margaret?" by someone, a player who saw Margaret a
// few days ago is never offered a plain "Nope. Not in a while." beside "I
// saw Margaret Wolfe a few days ago." (Words lead rule 113: no reply
// against the record). Pinned to the seed it was seen at (Nov 15, seed
// 9f8e7d6c5b4a3921, Mar 2, 2025), the director's own scenes over its first
// four months. The player still has a choice of acts: the true answer, or
// the true answer with a question back, said with the person's pronoun.
// Re-pinned Nov 16 from seed 9f8e7d6c5b4a3921 to d4 (Sidon, Mississippi), when start at 18
// moved the people and the opening. Re-pinned Nov 19 from d4 to 07 (The Plains, Ohio; CTO,
// #9747 comment 7005598394). Old premise: at d4 someone asks after a person the player saw
// lately within 120 days. The history from 1925 moved who meets whom, and on train 0e7ea9db
// nobody asks there (57 scenes; main 79e2a8fd has one). Scanned over 120 days at nine seeds on
// the train: the case came up at 18, e5, 07 and c3; at 07 three times on the train and twice
// on main. It stays pinned until the century's per-seed opening cost comes down: a drawn
// version (eight draws, about 55 s each) takes about 400 s.
const SEED = "07";
const NO = /^(not|brief)$/;

describe("asked after someone the player saw lately", () => {
  it("offers no plain no against the player's own contact", () => {
    let lately = 0;
    const { report } = stageWorldHeld({
      id: "asked-mutual-no-against-record",
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
        const aboutId = talk.last?.subject.aboutId;
        if (talk.last?.kind !== "asked-mutual" || !aboutId) return;
        // The player's own last contact with the person asked about.
        let date: string | null = null;
        for (const id of core.relationshipsByPerson.get(watched) ?? []) {
          const row = core.relationships.get(id)!;
          if (row.actorId !== aboutId && row.otherId !== aboutId) continue;
          if (!date || row.lastContactDate > date) date = row.lastContactDate;
        }
        if (!date || spokenWhenRow(date, core.date).gap === "long") return;
        lately += 1;
        const said = `${core.date}: ${talk.lines.map((line) => line.text).join(" / ")} | ${talk.choices.map((row) => row.text).join(" ; ")}`;
        for (const choice of talk.choices)
          expect(NO.test(choice.move) && !choice.lie, said).toBe(false);
        // Still a choice of acts, none against the record: the answer, or
        // the answer with a question back (coordinator, Nov 15).
        expect(
          new Set(talk.choices.map((row) => row.move)).size,
          said,
        ).toBeGreaterThanOrEqual(2);
        // The asker just said the name: the answer does not say it again
        // (Words lead, Nov 15).
        const family = core.people.get(aboutId as PersonId)?.familyName ?? "";
        for (const choice of talk.choices)
          expect(choice.text.includes(family), said).toBe(false);
      },
    });
    expect(
      lately,
      `${report.place.name}, seed ${report.seed}: asked after someone seen lately`,
    ).toBeGreaterThan(0);
  }, 180_000);
});
