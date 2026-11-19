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
// The test draws its world and waits for the case (drawn-place-tests): each
// draw is a 120-day staged world at `${base}:${n}`, and the first draw in which
// someone asks after a person the player saw lately is the one checked; the
// draws passed over are named. The pin it replaces, seed d4 (Sidon,
// Mississippi), lost its premise when the history from 1925 changed who meets
// whom: on train 0e7ea9db nobody asks there in 120 days (57 scenes), while on
// main 79e2a8fd one does. Over nine seeds on the train the case came up at
// four (18, e5, 07, c3); a draw is about 55 s.
const base = process.env.GOLDEN_PATH_SEED || "asked-mutual";
const DRAWS = 8;
const NO = /^(not|brief)$/;

describe("asked after someone the player saw lately", () => {
  it("offers no plain no against the player's own contact", () => {
    const passed: string[] = [];
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const seed = `${base}:${draw}`;
      let lately = 0;
      const { report } = stageWorldHeld({
        id: "asked-mutual-no-against-record",
        seed,
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
      const where = `${report.place.name}, seed ${report.seed}`;
      if (!lately) {
        passed.push(`${where}: nobody asked after someone seen lately`);
        continue;
      }
      process.stdout.write(
        `ASKED-MUTUAL ${where}: asked ${lately} times; passed over ${passed.length ? passed.join("; ") : "none"}\n`,
      );
      return;
    }
    throw new Error(
      `No draw asked after someone seen lately in 120 days: ${passed.join("; ")}`,
    );
  }, 600_000);
});
