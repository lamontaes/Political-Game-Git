import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * The game is set in the United States, and its copy keeps saying otherwise.
 *
 * This is a recurring error rather than a one-off. The audited questionnaire
 * bank shipped with a "central ministry" in it — an institution no American
 * jurisdiction has. The narrative wave's first draft used pounds, councillors,
 * catchment areas and lorries throughout and had to be corrected by hand before
 * it was committed. The dialogue audit found a neighbour bringing the bins in
 * and another at the door with the post, both of which had been merged.
 *
 * Nothing prevented any of it, so it kept happening. This is what prevents it.
 *
 * Two rules govern what is on the list:
 *
 * 1. **Only words that are actually wrong here.** `council` is not on it, and
 *    must not be: American municipalities have councils, and this game is about
 *    local government. `councillor` is on it, because the American spelling is
 *    `councilor` and the office is usually "council member". Banning the
 *    institution because the audit's shorthand mentioned it would break real
 *    copy to satisfy a checklist.
 *
 * 2. **Only inside quoted strings.** Matching raw source would fail on
 *    `aftermath` for containing "maths" and `flatMap` for containing "flat".
 *    Identifiers are not prose and are not checked.
 */

const REPOSITORY_ROOT = path.resolve(__dirname, "..");

/**
 * Files whose strings a player can end up reading.
 *
 * Deliberately a list rather than a glob: this is a check on authored copy, and
 * pointing it at everything would make it a check on the codebase's vocabulary.
 */
const AUTHORED_SURFACES: readonly string[] = [
  "src/simulation/episode-bank.ts",
  "src/simulation/adult-situations.ts",
  "src/simulation/setup-opening-bank.ts",
  "src/simulation/setup-questionnaire-bank.ts",
  "src/simulation/character-history.ts",
  "src/simulation/life-callbacks.ts",
  "src/simulation/life-places.ts",
  "src/presentation/conversation-subjects.ts",
  "src/presentation/run-b-conversation.ts",
  "src/presentation/life-narration.ts",
  "src/presentation/life-record.ts",
  "src/presentation/life-story.ts",
  "src/presentation/ordinary-life.ts",
  "src/presentation/player-conversation.ts",
  "src/player/PlayerGame.tsx",
  "src/player/PlayerConversation.tsx",
];

/** What is wrong, and what to say instead. */
const BRITISH_IDIOM: readonly { pattern: RegExp; instead: string }[] = [
  { pattern: /£/, instead: "$" },
  { pattern: /\bcouncillors?\b/i, instead: "council member(s)" },
  { pattern: /\blorr(y|ies)\b/i, instead: "truck / trucks" },
  { pattern: /\bwhilst\b/i, instead: "while" },
  { pattern: /\bamongst\b/i, instead: "among" },
  { pattern: /\bfortnights?\b/i, instead: "two weeks" },
  { pattern: /\bcatchment\b/i, instead: "attendance zone" },
  { pattern: /\bthe bins\b/i, instead: "the trash cans" },
  { pattern: /\bcar parks?\b/i, instead: "parking lot(s)" },
  { pattern: /\bpetrol\b/i, instead: "gas" },
  { pattern: /\bpavements?\b/i, instead: "sidewalk(s)" },
  { pattern: /\bmaths\b/i, instead: "math" },
  { pattern: /\bchemist's\b/i, instead: "pharmacy" },
  { pattern: /\bsolicitors?\b/i, instead: "lawyer(s)" },
  {
    pattern: /\bcentral ministry\b/i,
    instead: "a named federal or state agency",
  },
  { pattern: /\bpostcodes?\b/i, instead: "ZIP code(s)" },
  { pattern: /\bnappies\b/i, instead: "diapers" },
  { pattern: /\bqueue(d|ing|s)?\b/i, instead: "line / lined up" },
];

/**
 * Source with its comments removed.
 *
 * Comments are prose about the code, not copy, and this file is a check on
 * copy. Without this the guard fires on the doc comment in the questionnaire
 * bank that explains why "central ministry" was corrected — flagging the note
 * recording a fix as though it were the defect.
 */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/**
 * Every quoted string in a source file.
 *
 * Covers the three kinds this codebase writes copy in, including template
 * literals, which is where most authored dialogue actually lives.
 */
function quotedStrings(source: string): readonly string[] {
  const found: string[] = [];
  const pattern =
    /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    found.push(match[1] ?? match[2] ?? match[3] ?? "");
  }
  return found;
}

describe("Authored copy is written in American English", () => {
  it("uses no British idiom a player would notice", () => {
    const offenders: string[] = [];
    for (const relative of AUTHORED_SURFACES) {
      const source = readFileSync(path.join(REPOSITORY_ROOT, relative), "utf8");
      for (const text of quotedStrings(withoutComments(source))) {
        for (const { pattern, instead } of BRITISH_IDIOM) {
          if (pattern.test(text)) {
            offenders.push(
              `${relative}: ${pattern.source} — say ${instead} — in ${JSON.stringify(
                text.slice(0, 90),
              )}`,
            );
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("still allows the institutions American local government actually has", () => {
    // A guard that broke real copy to satisfy a word list would be worse than
    // no guard. Councils, council meetings and city halls are real here.
    const legitimate = [
      "The council meeting is on Tuesday.",
      "She works for the city council.",
      "A council member asked a question.",
    ];
    for (const text of legitimate) {
      for (const { pattern } of BRITISH_IDIOM) {
        expect(
          pattern.test(text),
          `${pattern.source} should not fire on ${JSON.stringify(text)}`,
        ).toBe(false);
      }
    }
  });

  it("would have caught the phrasings that actually shipped", () => {
    // The three the dialogue audit found, plus the one the questionnaire
    // shipped with. A guard nobody has aimed at a real defect is decoration.
    const known = [
      "is bringing the bins back in, and glances at the board",
      "Somebody in the family needs a fortnight of your time",
      "the borough councillor said so",
      "seek an exemption from the central ministry",
    ];
    for (const text of known) {
      expect(
        BRITISH_IDIOM.some(({ pattern }) => pattern.test(text)),
        `nothing caught ${JSON.stringify(text)}`,
      ).toBe(true);
    }
  });
});
