import { describe, expect, it } from "vitest";
import type { PersonId } from "../core2/types";
import { type Conversation } from "./conversation";

/** One reply the player gave: whether it was a yes or a no, and where the talk stood. */
interface Turn {
  yesNo: boolean;
  text: string;
  /** How many lines the talk had before the reply. */
  before: number;
}

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
});
