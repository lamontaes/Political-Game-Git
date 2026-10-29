import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * The owner's pattern bans (owner, Oct 15 to Oct 28; the words and director
 * plan, approved Oct 28, section 2: "When you say 'remove every X is home,'
 * that is a ban on a pattern, not a grade on a line"). A bank part that
 * matches one fails the build, so a banned line never comes back. The
 * banned sentence shapes:
 *
 * - "X is home", "X is at home", "X is at {place}" (Oct 28 sitting, 37:
 *   "Remove every 'X is home' and 'X is at place' line. Do not replace them").
 * - "Talk to you soon" and "See you later" as sign-offs (Oct 15, batch 12;
 *   Oct 24 playtest).
 * - "must" where people say "have to" (Oct 19, batch 17: "Americans say
 *   must, but not in that way"); "must have" (a guess) is allowed.
 * - "That's settled" (Oct 15, batch 13: "It's a little dev talky").
 * - "the doors" for canvassing (Oct 15, batch 13: "don't say that. Just say
 *   ... canvassing or door knocking") and "gaps" (batch 13: "Don't say gaps,
 *   though. That is dev language").
 * - Narration naming the day, the date or the place (Oct 26 and Oct 27
 *   sittings; scene-standard rule 6): the screen already shows them.
 * - A year said aloud in a spoken line (Oct 19, batch 19: "it says
 *   2026-11-01"): a date in speech is said as people say it, without the
 *   year when it is this year (src/director/words.ts spokenDate).
 * - A bare yes or no as a whole reply (Oct 15, batch 12: "Do you remember
 *   the school?" "Yes." "Okay, bye." is not a talk; a yes or no never ends a
 *   talk).
 */

const ROOT = path.resolve(__dirname, "../../..");
const PARTS = path.join(ROOT, "data/english/parts");

interface Part {
  readonly key: string;
  readonly move: string;
  readonly text: unknown;
}

/** The banks people speak or narrate in; printed news keeps its dates. */
const SPOKEN = new Set([
  "bring-it-up",
  "choice-names",
  "conversation",
  "journal",
  "newscast",
  "opening-speech",
  "scene-talk",
  "scene-words",
  "speech-stages",
]);

const isNarration = (bank: string, part: Part) =>
  bank === "scene-words" || part.move.startsWith("narrate");
const isReply = (part: Part) =>
  /^(?:reply|answer)|-(?:reply|answer)(?:-|$)/.test(part.move);

export const BANS: readonly {
  readonly id: string;
  readonly pattern: RegExp;
  readonly applies: (bank: string, part: Part) => boolean;
}[] = [
  {
    id: "X is home / X is at place",
    pattern:
      /\{[a-z_-]+\} (?:is|are|was|were) (?:at )?home\b|\{[a-z_-]+\} (?:is|are|was|were) at (?:\{[a-z_-]+\}|the house|work)\b|\{[a-z_-]+\} (?:is|are|was|were) in with\b/i,
    applies: () => true,
  },
  {
    id: "Talk to you soon",
    pattern: /\btalk(?: to you)? soon\b/i,
    applies: () => true,
  },
  { id: "See you later", pattern: /\bsee you later\b/i, applies: () => true },
  {
    id: "must for have to",
    pattern: /\bmust\b(?! have\b)/i,
    applies: (bank) => SPOKEN.has(bank),
  },
  {
    id: "that's settled",
    pattern: /\b(?:that's|that is|it's|it is) settled\b/i,
    applies: (bank) => SPOKEN.has(bank),
  },
  {
    id: "the doors",
    pattern: /\bthe doors\b/i,
    applies: (bank) => SPOKEN.has(bank),
  },
  {
    id: "gaps",
    pattern: /\bgaps\b|\b(?:your|the) gap\b/i,
    applies: (bank) => SPOKEN.has(bank),
  },
  {
    id: "narration naming the day or the place",
    pattern: /\{(?:weekday|day|month|date|time|today|place|town|city|room)\}/,
    applies: isNarration,
  },
  {
    id: "a year said aloud",
    pattern: /\b(?:19|20)\d\d\b/,
    applies: (bank) => SPOKEN.has(bank),
  },
  {
    id: "the day of the week as small talk",
    pattern: /\bquiet \{weekday\}/,
    applies: () => true,
  },
  {
    id: "a bare yes or no as a whole reply",
    pattern: /^(?:yes|no|yeah|nope)[.!]?$/i,
    // "Have you heard?" "No." is followed by the news itself.
    applies: (_bank, part) =>
      isReply(part) && !part.move.startsWith("news-answer"),
  },
];

function banks(): { bank: string; parts: Part[] }[] {
  return readdirSync(PARTS)
    .filter((name) => name.endsWith(".json"))
    .map((name) => ({
      bank: name.replace(/\.json$/, ""),
      parts:
        (
          JSON.parse(readFileSync(path.join(PARTS, name), "utf8")) as {
            parts?: Part[];
          }
        ).parts ?? [],
    }));
}

const textOf = (part: Part) =>
  typeof part.text === "string" ? part.text : JSON.stringify(part.text);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : [full];
  });
}

describe("the owner's pattern bans hold in every bank", () => {
  it("catches the shapes it bans and leaves story lines alone", () => {
    const hit = (bank: string, move: string, text: string) =>
      BANS.filter(
        (ban) =>
          ban.applies(bank, { key: "", move, text }) && ban.pattern.test(text),
      ).map((ban) => ban.id);
    expect(hit("scene-talk", "narrate-narrate", "{name} is home.")).toContain(
      "X is home / X is at place",
    );
    expect(
      hit("scene-talk", "narrate-narrate", "{name} was home when it came."),
    ).toContain("X is home / X is at place");
    expect(
      hit("scene-talk", "narrate-narrate", "{name} is at home with {child}."),
    ).toContain("X is home / X is at place");
    expect(
      hit("conversation", "farewell-leave-bye", "Talk to you soon."),
    ).not.toEqual([]);
    expect(hit("scene-talk", "close-thank", "Okay, talk soon.")).not.toEqual(
      [],
    );
    expect(
      hit("conversation", "farewell-leave-bye", "See you later."),
    ).not.toEqual([]);
    expect(hit("scene-talk", "reply-leave", "I must lock up.")).not.toEqual([]);
    expect(
      hit("scene-talk", "reply-lie", "They must have lost the message."),
    ).toEqual([]);
    expect(
      hit("scene-talk", "close-thank", "Then that's settled."),
    ).not.toEqual([]);
    expect(
      hit("scene-talk", "reply-promise", "I'll be at the doors."),
    ).not.toEqual([]);
    expect(hit("scene-talk", "follow-ask", "Where are your gaps?")).not.toEqual(
      [],
    );
    expect(
      hit("scene-talk", "narrate-narrate", "It's {weekday}, and {name} calls."),
    ).not.toEqual([]);
    expect(
      hit("scene-talk", "narrate-narrate", "{name} recognizes you in {place}."),
    ).not.toEqual([]);
    expect(
      hit("scene-talk", "follow-tell", "{name} grew up in {place}, too."),
    ).toEqual([]);
    expect(
      hit("scene-talk", "state-tell", "The vote was in 2025."),
    ).not.toEqual([]);
    expect(
      hit("conversation", "shared-school-answer-brief", "Yes."),
    ).not.toEqual([]);
    expect(
      hit("scene-talk", "reply-agree", "Yes. Put me down for it."),
    ).toEqual([]);
    expect(
      hit("scene-talk", "narrate-narrate", "{name} catches you on the steps."),
    ).toEqual([]);
  });

  it("no bank part matches a ban", () => {
    const found = banks().flatMap(({ bank, parts }) =>
      parts.flatMap((part) =>
        BANS.filter(
          (ban) => ban.applies(bank, part) && ban.pattern.test(textOf(part)),
        ).map((ban) => `${ban.id}: ${part.key}: ${textOf(part)}`),
      ),
    );
    expect(found).toEqual([]);
  });

  it("no corpus shape would mine a banned line back", () => {
    const shapes = path.join(ROOT, "scripts/english-corpus/shapes");
    const found = files(shapes)
      .filter((file) => file.endsWith(".json"))
      .flatMap((file) => {
        const text = readFileSync(file, "utf8");
        return BANS.filter(
          (ban) =>
            ban.applies("", { key: "", move: "", text: "" }) &&
            ban.id !== "a bare yes or no as a whole reply" &&
            ban.pattern.test(text),
        ).map((ban) => `${ban.id}: ${path.relative(ROOT, file)}`);
      });
    expect(found).toEqual([]);
  });

  it("the director says a date in speech with the director's own spoken date", () => {
    // The kernel's spokenDate always says the year; the director's drops it
    // within the year, as people say a date.
    const found = files(path.join(ROOT, "src/director"))
      .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
      .filter((file) =>
        /import \{[^}]*\bspokenDate\b[^}]*\} from "\.\.\/core2\/kernel\/dates"/.test(
          readFileSync(file, "utf8"),
        ),
      )
      .map((file) => path.relative(ROOT, file));
    expect(found).toEqual([]);
  });
});
