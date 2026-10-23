import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { stageWorldHeld } from "../../scripts/dialogue-batch/stage-world";
import type { PersonId } from "../core2/types";
import {
  openConversation,
  say,
  subjectsBetween,
  type Conversation,
} from "./conversation";
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

/** One reply the player gave: whether it was a yes or a no, and where the talk stood. */
interface Turn {
  yesNo: boolean;
  text: string;
  /** How many lines the talk had before the reply. */
  before: number;
}

const YES_NO = /^(yes|no|yeah|nope)\b/i;

/**
 * Whether a played talk counts as one run to its close, and what it breaks.
 * It counts only with lines from both people, at least one reply the player
 * gave, and records behind every line. A yes or a no is followed up: the next
 * thing the other person says after it is not a goodbye.
 */
function judge(
  talk: Pick<Conversation, "lines" | "choices" | "otherId">,
  turns: readonly Turn[],
  playerId: string,
  earned: (line: Conversation["lines"][number]) => boolean = () => true,
): { counts: boolean; problems: string[] } {
  const problems: string[] = [];
  const both =
    talk.lines.some((line) => line.speakerId === playerId) &&
    talk.lines.some((line) => line.speakerId === talk.otherId);
  const counts =
    turns.length > 0 &&
    both &&
    talk.lines.every((line) => line.sourceRecordIds.length > 0);
  if (!counts) return { counts, problems };
  if (talk.choices.length) problems.push("still open after its turns");
  for (const line of talk.lines)
    if (!earned(line)) problems.push(`unearned opener "${line.text}"`);
  for (const turn of turns) {
    if (!turn.yesNo) continue;
    const reply = talk.lines
      .slice(turn.before)
      .find((line) => line.speakerId === talk.otherId);
    if (!reply || reply.kind === "farewell")
      problems.push(`"${turn.text}" not followed up`);
  }
  // A goodbye never answers the other person's own question.
  talk.lines.forEach((line, at) => {
    if (line.kind !== "farewell") return;
    let back = at - 1;
    while (back >= 0 && talk.lines[back]!.kind === "ack") back -= 1;
    const answer = talk.lines[back];
    const asked = talk.lines[back - 1];
    if (
      answer?.speakerId === playerId &&
      asked?.speakerId === talk.otherId &&
      /\?$/.test(asked.text.trim())
    )
      problems.push(`a goodbye after "${asked.text}"`);
  });
  return { counts, problems };
}

describe("talks in a played year", () => {
  it("never counts an empty or one-sided talk, or one the player did not answer", () => {
    const empty = { lines: [], choices: [], otherId: "b" as PersonId };
    expect(judge(empty, [], "a").counts).toBe(false);
    const line = (speakerId: string, text: string, kind = "ask") =>
      ({
        speakerId,
        text,
        kind,
        sourceRecordIds: ["r"],
      }) as unknown as Conversation["lines"][number];
    const oneSided = { ...empty, lines: [line("b", "Do you have a minute?")] };
    expect(judge(oneSided, [], "a").counts).toBe(false);
    const goodbye = {
      ...empty,
      lines: [
        line("b", "Are you running?"),
        line("a", "Yes."),
        line("b", "See you later.", "farewell"),
      ],
    };
    const turns = [{ yesNo: true, text: "Yes.", before: 1 }];
    expect(judge(goodbye, turns, "a")).toEqual({
      counts: true,
      problems: [
        '"Yes." not followed up',
        'a goodbye after "Are you running?"',
      ],
    });
  });

  it(`fifteen talks run to their close, open only on what the records earn and follow up every answer (seed ${seed})`, () => {
    const rows: string[] = [];
    const types = new Set<string>();
    let where = "";
    let notCounted = 0;
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
        const here = `${where}: ${staged.typeKey} ${staged.momentId}`;
        const shared = subjectsBetween(core, watched, otherId, director).filter(
          (row) => row.kind === "shared-school" || row.kind === "shared-work",
        );
        const talk = openConversation(core, watched, otherId, {
          presentIds: scene.presentIds,
          director,
          occasionId: staged.momentId,
        });
        const turns: Turn[] = [];
        for (let turn = 0; turn < TURNS && talk.choices.length; turn += 1) {
          // A yes or a no where one is offered, else the first reply.
          const choice =
            talk.choices.find((row) => YES_NO.test(row.text)) ??
            talk.choices[0]!;
          turns.push({
            yesNo: YES_NO.test(choice.text),
            text: choice.text,
            before: talk.lines.length,
          });
          say(core, talk, choice.key);
        }
        // An opener on a shared school or workplace is earned by decades on record.
        const earned = (line: Conversation["lines"][number]) => {
          const about = shared.find((row) => line.subjectId.includes(row.id));
          return !about || !!about.facts["long-ago"];
        };
        const judged = judge(talk, turns, watched, earned);
        if (!judged.counts) {
          // A scene whose talk the player never answered is not one of the fifteen.
          notCounted += 1;
          continue;
        }
        expect(judged.problems, here).toEqual([]);
        pairs.add(pair);
        types.add(staged.typeKey);
        const records = [
          ...new Set(talk.lines.flatMap((line) => line.sourceRecordIds)),
        ];
        rows.push(
          `${staged.typeKey} | moment ${staged.momentId} | cause ${staged.causeId} | ${watched} and ${otherId} | ${talk.lines.length} lines, ${turns.length} replies (${turns.filter((t) => t.yesNo).length} yes or no) | records ${records.slice(0, 4).join(", ")}`,
        );
      }
    }
    const named = `TALKS ${where}, ${rows.length} talks in ${types.size} situation types (${notCounted} staged talks the player never answered, not counted)\n${rows.join("\n")}\n`;
    console.log(named);
    // The talks and their record ids, for a PR body or a grading page.
    if (process.env.PLAYED_TALKS_OUT)
      writeFileSync(process.env.PLAYED_TALKS_OUT, named);
    expect(rows.length, `${where}: talks the director's scenes opened`).toBe(
      TALKS,
    );
  }, 2_400_000);
});
