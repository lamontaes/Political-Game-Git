import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { stageWorldHeld } from "../../scripts/dialogue-batch/stage-world";
import type { PersonId } from "../core2/types";
import { openConversation, say, subjectsBetween } from "./conversation";
import { composeScene } from "./scene";

// Scenes with a purpose, the root fix (owner, Oct 15, evening: batch 12
// rejected). In a played year of the bench's world, in a place drawn from all
// 56 and a seed nobody chose, fifteen talks the director's own scenes open
// run to their close. No talk opens on a school or a workplace the two shared
// unless decades have passed and the record shows it, and a question the
// player answered is followed up, never answered with goodbye.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const TALKS = 15;
const TURNS = 12;
const ATTEMPTS = 3;

it(`fifteen talks in a played year run to their close, open only on what the records earn and follow up every answer (seed ${seed})`, () => {
  const rows: string[] = [];
  const types = new Set<string>();
  let where = "";
  for (
    let attempt = 0;
    attempt < ATTEMPTS && rows.length < TALKS;
    attempt += 1
  ) {
    const held = stageWorldHeld({
      id: "played-talks",
      seed: attempt ? `${seed}:${attempt}` : seed,
      days: 365,
    });
    const { core, director, report } = held;
    where = `${report.place.name}, seed ${report.seed}`;
    // One talk per pair of people, and every situation type the year staged
    // before any type a second time, so the fifteen are not one sitting.
    const pairs = new Set<string>();
    const done = new Set<string>();
    const order = [
      ...report.staged.filter(
        (row, at, all) =>
          all.findIndex((other) => other.typeKey === row.typeKey) === at,
      ),
      ...report.staged,
    ];
    for (const staged of order) {
      if (rows.length >= TALKS) break;
      const key = `${staged.watchedId}:${staged.momentId}:${staged.typeKey}`;
      if (done.has(key)) continue;
      done.add(key);
      const watched = staged.watchedId as PersonId;
      const entry = director.ledger.people
        .get(watched)
        ?.schedule.find((row) => row.momentId === staged.momentId);
      if (!entry) continue;
      const scene = composeScene(core, director, watched, entry);
      const otherId = scene?.talkToId;
      if (!scene || !otherId) continue;
      const pair = [watched, otherId].sort().join("|");
      if (pairs.has(pair)) continue;
      pairs.add(pair);
      types.add(staged.typeKey);
      const here = `${where}: ${staged.typeKey} ${staged.momentId}`;
      const shared = subjectsBetween(core, watched, otherId, director).filter(
        (row) => row.kind === "shared-school" || row.kind === "shared-work",
      );
      const talk = openConversation(core, watched, otherId, {
        presentIds: scene.presentIds,
        director,
        occasionId: staged.momentId,
      });
      for (let turn = 0; turn < TURNS && talk.choices.length; turn += 1) {
        // A yes or a no where one is offered, else the first reply.
        const choice =
          talk.choices.find((row) => /^(yes|no|yeah|nope)\b/i.test(row.text)) ??
          talk.choices[0]!;
        say(core, talk, choice.key);
      }
      // It ran to its close: nothing is left to answer.
      expect(talk.choices, `${here}: still open`).toEqual([]);
      for (const line of talk.lines) {
        // Every line cites the records behind it.
        expect(
          line.sourceRecordIds.length,
          `${here}: "${line.text}"`,
        ).toBeGreaterThan(0);
        // An opener on a shared school or workplace is earned by decades on record.
        const about = shared.find((row) => line.subjectId.includes(row.id));
        if (about)
          expect(
            about.facts["long-ago"],
            `${here}: "${line.text}"`,
          ).toBeTruthy();
      }
      // A goodbye never answers the other person's own question.
      talk.lines.forEach((line, at) => {
        if (line.kind !== "farewell") return;
        let back = at - 1;
        while (back >= 0 && talk.lines[back]!.kind === "ack") back -= 1;
        const answer = talk.lines[back];
        const asked = talk.lines[back - 1];
        if (answer && answer.speakerId === watched && asked)
          expect(
            asked.speakerId === talk.otherId && /\?$/.test(asked.text.trim()),
            `${here}: a goodbye after "${asked.text}"`,
          ).toBe(false);
      });
      const records = [
        ...new Set(talk.lines.flatMap((line) => line.sourceRecordIds)),
      ];
      rows.push(
        `${staged.typeKey} | moment ${staged.momentId} | cause ${staged.causeId} | ${watched} and ${otherId} | ${talk.lines.length} lines | records ${records.slice(0, 4).join(", ")}`,
      );
    }
  }
  const named = `TALKS ${where}, ${rows.length} talks in ${types.size} situation types\n${rows.join("\n")}\n`;
  console.log(named);
  // The talks and their record ids, for a PR body or a grading page.
  if (process.env.PLAYED_TALKS_OUT)
    writeFileSync(process.env.PLAYED_TALKS_OUT, named);
  expect(rows.length, `${where}: talks the director's scenes opened`).toBe(
    TALKS,
  );
}, 2_400_000);
