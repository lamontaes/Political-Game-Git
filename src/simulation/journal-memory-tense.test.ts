import { describe, expect, it } from "vitest";

import { EPISODE_FAMILIES } from "./episode-bank";

/**
 * The Journal replays each choice's `memory` line as a record of what already
 * happened, so every one must read in the past tense. Before #595 the opening
 * aftermaths were live narration ("You wait for {person} to answer"), and the
 * Journal showed "In September, you wait for Zachary Wong to answer."
 *
 * The check reads the verb that follows "you" in each line. It passes a
 * regular past form (-ed), a negated past (didn't) or a listed irregular past,
 * and fails anything else, so a new present-tense line fails here by name.
 */

const IRREGULAR_PAST = new Set([
  "came",
  "dealt",
  "did",
  "drew",
  "gave",
  "got",
  "had",
  "held",
  "kept",
  "left",
  "let",
  "lost",
  "made",
  "met",
  "put",
  "ran",
  "read",
  "said",
  "sat",
  "saw",
  "sent",
  "set",
  "spent",
  "stood",
  "swapped",
  "took",
  "told",
  "went",
  "were",
  "wrote",
]);

const NEGATED_PAST = new Set(["didn't", "couldn't", "wouldn't", "weren't"]);

/** Words that can sit between "you" and its verb. */
const ADVERBS = new Set(["finally", "never", "also", "still", "just", "then"]);

function leadVerbAfterYou(line: string): string | null {
  const words = line
    .toLowerCase()
    .replace(/\{[^}]*\}/g, "someone")
    .replace(/[.,;:!?]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const at = words.indexOf("you");
  if (at < 0) return null;
  let index = at + 1;
  // "You and {person} stopped ..." — skip the joined subject.
  if (words[index] === "and") index += 2;
  while (index < words.length && ADVERBS.has(words[index]!)) index += 1;
  return words[index] ?? null;
}

function isPastForm(verb: string): boolean {
  return (
    verb.endsWith("ed") || NEGATED_PAST.has(verb) || IRREGULAR_PAST.has(verb)
  );
}

const MEMORY_LINES = EPISODE_FAMILIES.flatMap((family) =>
  family.stages.flatMap((stage) =>
    (stage.options ?? []).map((option) => ({
      where: `${family.key}/${stage.key}/${option.key}`,
      memory: option.memory,
    })),
  ),
);

describe("Journal memory lines", () => {
  it("covers the opening aftermaths and the rest of the episode bank", () => {
    const families = new Set(
      MEMORY_LINES.map(({ where }) => where.split("/")[0]),
    );
    expect(MEMORY_LINES.length).toBeGreaterThan(200);
    expect([...families].some((key) => key!.startsWith("opening"))).toBe(true);
  });

  it("reads every recorded choice in the past tense", () => {
    const present = MEMORY_LINES.flatMap(({ where, memory }) => {
      const verb = leadVerbAfterYou(memory);
      return verb === null || isPastForm(verb)
        ? []
        : [`${where}: "${memory}" (${verb})`];
    });
    expect(present).toEqual([]);
  });

  it("flags live narration of the kind the Journal used to replay", () => {
    expect(
      isPastForm(leadVerbAfterYou("You wait for {person} to answer.")!),
    ).toBe(false);
    expect(
      isPastForm(leadVerbAfterYou("You ask {person} how their day is going.")!),
    ).toBe(false);
    expect(isPastForm(leadVerbAfterYou("You and {person} swap snacks.")!)).toBe(
      false,
    );
    expect(isPastForm(leadVerbAfterYou("You waited beside the swing.")!)).toBe(
      true,
    );
  });
});
