import { readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { checkAmericanEnglish } from "../scripts/prose-eval/american-english";
import { directorSlots } from "../src/english/bank-parts";

/**
 * Part banks: pieces mined from public records (EM-1) and pieces authored to
 * the calibrated patterns (owner, Oct 15: the text rule), with their era and
 * register check (EM-3). A mined part carries a source a reader can open; an
 * authored part is tagged `origin: "authored"` with its author and date and
 * any source as a note. Every part stays within its register's length and is
 * current American English with no developer wording.
 */

const PARTS_DIR = path.resolve(__dirname, "../data/english/parts");

const DEVELOPER_WORDS = [
  "game profile",
  "catalog",
  "does not establish",
  "disclosed",
  "fictional",
  "row",
  "piece",
  "stub",
  "todo",
];

type Part = {
  key: string;
  move: string;
  kind: "spoken" | "written";
  text: string;
  /** An authored part names who wrote it and when; a mined part names its source. */
  origin?: "authored";
  author?: string;
  date?: string;
  source?: { document: string; date: string; granule?: string; url: string };
};

/** What is wrong with how a part says where it came from; empty when nothing is. */
export function provenanceProblems(part: Part): string[] {
  const problems: string[] = [];
  if (part.origin === "authored") {
    if (!part.author?.trim())
      problems.push("an authored part names its author");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(part.date ?? ""))
      problems.push("an authored part carries the date it was written");
    // A source on an authored part is a note, not a requirement.
    return problems;
  }
  const source = part.source;
  if (!source?.document.trim())
    problems.push("a mined part names its source document");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source?.date ?? ""))
    problems.push("a mined part carries its source date");
  // Where the wording came from never decides whether it plays; the source
  // is a note.
  if (!/^https:\/\//.test(source?.url ?? ""))
    problems.push("a mined part carries an https source url");
  return problems;
}

type Bank = {
  schema: string;
  register: string;
  slots: Record<string, string>;
  maxWords: number;
  parts: Part[];
};

const banks = readdirSync(PARTS_DIR)
  .filter((name) => name.endsWith(".json"))
  .map((name) => ({
    name,
    bank: JSON.parse(readFileSync(path.join(PARTS_DIR, name), "utf8")) as Bank,
  }));

describe("English part banks", () => {
  it("has at least one bank", () => {
    expect(banks.length).toBeGreaterThan(0);
  });

  it("accepts an authored part with no source document, and still asks a mined part for one", () => {
    const base = {
      key: "x.y.1",
      move: "y",
      kind: "spoken" as const,
      text: "Hello.",
    };
    expect(
      provenanceProblems({
        ...base,
        origin: "authored",
        author: "the Words session",
        date: "2026-10-15",
      }),
    ).toEqual([]);
    expect(
      provenanceProblems({ ...base, origin: "authored", date: "2026-10-15" }),
    ).toHaveLength(1);
    expect(provenanceProblems(base).length).toBeGreaterThan(0);
    expect(
      provenanceProblems({
        ...base,
        source: {
          document: "A federal record",
          date: "2024-05-01",
          url: "https://www.example.gov/record",
        },
      }),
    ).toEqual([]);
  });

  for (const { name, bank } of banks) {
    describe(name, () => {
      // The owner's grades (`data/english/part-grades.json`, read by
      // `heldByGrades`) are the one gate on what plays; a part has no flag.
      it("leaves what plays to the owner's grades: no part carries a flag of its own", () => {
        for (const part of bank.parts)
          expect(Object.keys(part), part.key).not.toContain("shippable");
      });

      it("validates against the bank schema", () => {
        expect(bank.schema).toBe("english-parts/1");
        expect(`${bank.register}.json`).toBe(name);
        expect(bank.maxWords).toBeGreaterThan(0);
        expect(bank.parts.length).toBeGreaterThan(0);
        const keys = bank.parts.map((part) => part.key);
        expect(new Set(keys).size).toBe(keys.length);
        const texts = bank.parts.map((part) => part.text.toLowerCase());
        expect(new Set(texts).size).toBe(texts.length);
      });

      it("gives every part a move type, a kind and its provenance", () => {
        for (const part of bank.parts) {
          expect(["spoken", "written"]).toContain(part.kind);
          expect(part.key.startsWith(`${bank.register}.${part.move}.`)).toBe(
            true,
          );
          expect(provenanceProblems(part), part.key).toEqual([]);
        }
      });

      it("uses only declared slots and stays within the register's length", () => {
        for (const part of bank.parts) {
          // A slot may carry a hyphen ({last-together}); every brace is a
          // slot's, so the one converter (`directorSlots`) fills it.
          for (const [, slot] of part.text.matchAll(/\{([\w-]+)\}/g))
            expect(Object.keys(bank.slots)).toContain(slot);
          expect(
            directorSlots(part.text).replace(/\{\{[a-z][a-z0-9-]*\}\}/g, ""),
            part.key,
          ).not.toMatch(/[{}]/);
          const words = part.text
            .replace(/\{[\w-]+\},?/g, "")
            .trim()
            .split(/\s+/);
          expect(words.length).toBeLessThanOrEqual(bank.maxWords);
        }
      });

      it("is current American English with no developer wording", () => {
        const findings = checkAmericanEnglish(
          bank.parts.map((part) => ({
            path: `${name}:${part.key}`,
            text: part.text,
            provenance: "authored" as const,
          })),
        );
        expect(findings).toEqual([]);
        for (const part of bank.parts) {
          const lower = part.text.toLowerCase();
          for (const word of DEVELOPER_WORDS)
            expect(lower).not.toMatch(new RegExp(`\\b${word}\\b`));
        }
      });
    });
  }
});

// A relative day in narration is true only against the clock: "today",
// "tonight" and "this morning" only on the record's own day (the director's
// `same-day` fact), "yesterday" only the day after (`day-after`). A scene
// that plays later falls to a piece that names no day.
describe("relative days in scene narration", () => {
  const sceneTalk = banks.find((row) => row.name === "scene-talk.json")!.bank;
  type Use = { step?: string; requiresFacts?: string[] };
  it("says today, tonight or yesterday only with the fact that makes it true", () => {
    const wrong: string[] = [];
    for (const part of sceneTalk.parts as (Part & { uses: Use[] })[])
      for (const use of part.uses.filter((row) => row.step === "narrate")) {
        const needs = use.requiresFacts ?? [];
        if (
          /\b(?:today|tonight|this (?:morning|afternoon|evening))\b/i.test(
            part.text,
          ) &&
          !needs.includes("same-day")
        )
          wrong.push(`${part.key}: needs same-day`);
        if (/\byesterday\b/i.test(part.text) && !needs.includes("day-after"))
          wrong.push(`${part.key}: needs day-after`);
      }
    expect(wrong).toEqual([]);
  });
});

// The time of day in scene talk is true only against the scene's own hour
// (the director's `morning`, `afternoon`, `daytime` and `evening` marks, from
// the player's clock). A line that says the present is the evening ("Thanks
// for your time tonight.") is held back in the daytime, one that says the
// afternoon is still ahead is held back in the evening, and a morning
// greeting is held back after noon. A line whose "tonight" is still to come ("I'll
// read it tonight.") is true at any hour of the day; it is listed here, so
// every line that names the evening is decided one way or the other.
const EVENING_AHEAD = new Set([
  "scene-talk.reply-stall.let-me-read-it-tonight",
  "scene-talk.follow-answer.i-m-still-finding-out-i-ll-have-names-tonight",
  "scene-talk.reply-deflect.i-was-going-to-tell-you-tonight",
  "scene-talk.reply-thank.good-i-ll-start-calling-tonight",
  "scene-talk.reply-leave.i-ve-got-to-run-call-me-tonight",
  "scene-talk.reply-stall.send-me-the-draft-i-ll-read-it-tonight",
  "scene-talk.follow-thank.good-i-ll-get-you-the-file-tonight",
  "scene-talk.reply-thank.you-call-her-i-can-t-tonight",
  "scene-talk.reply-comfort.go-easy-tonight-saturday-s-a-long-day",
  "scene-talk.reply-press.tonight-would-be-better",
  "scene-talk.follow-accept.tonight-then",
  "scene-talk.follow-promise.sign-at-the-bottom-and-i-ll-write-the-reference-myself-tonight",
  "scene-talk.reply-agree.done-put-it-in-writing-tonight",
  "scene-talk.follow-press.monday-s-fine-tonight-though-give-the-room-one-line-it-can-cheer",
  "scene-talk.reply-agree.i-ll-call-relative-tonight",
  "scene-talk.reply-agree.all-right-i-ll-call-tonight",
  "scene-talk.follow-accept.done-i-ll-walk-it-over-to-the-chair-myself-tonight",
  "scene-talk.reply-agree.then-get-it-out-next-session-and-i-ll-still-vote-yes-tonight",
  "scene-talk.reply-agree.you-ve-got-it-send-it-over-tonight",
  "scene-talk.follow-thank.tonight-you-re-a-good-partner",
  "scene-talk.reply-leave.let-me-get-through-tonight-first",
  "scene-talk.reply-agree.okay-i-ll-go-over-there-tonight",
  "scene-talk.reply-agree.then-i-ll-do-it-tonight",
  "scene-talk.follow-confront.not-after-tonight-you-re-not",
  "scene-talk.follow-plea.then-do-it-on-yours-just-do-it-tonight",
  "scene-talk.follow-warn.earn-it-again-tomorrow-tonight-be-gracious",
  "scene-talk.reply-stall.leave-it-i-want-to-read-it-tonight-myself",
  "scene-talk.close-thank.thank-you-it-goes-to-the-clerk-tonight",
  "scene-talk.reply-offer.leave-your-number-with-my-office-tonight-i-ll-call-you-this-week",
  "scene-talk.follow-press.then-send-another-one-tonight",
  "scene-talk.reply-deflect.read-it-tonight-call-me-tomorrow-with-a-better-question",
  "scene-talk.close-warn.it-s-running-tonight-with-or-without-you",
  "scene-talk.follow-accept.sign-here-i-ll-get-it-to-the-clerk-tonight",
  "scene-talk.reply-agree.then-i-ll-sign-it-tonight",
  "scene-talk.reply-stall.give-me-tonight",
  "scene-talk.follow-press.tonight-s-fine-don-t-let-it-slide-past-the-weekend",
  "scene-talk.close-accept.all-right-i-ll-tell-the-leaders-tonight",
  "scene-talk.close-promise.i-ll-send-the-details-to-your-office-tonight",
  "scene-talk.follow-thank.i-ll-write-them-down-for-you-tonight",
  "scene-talk.follow-thank.i-ll-write-it-tonight",
  "scene-talk.reply-offer.my-office-will-give-you-the-name-and-the-number-tonight",
  "scene-talk.follow-thank.tonight-thank-you",
  "scene-talk.reply-comfort.there-s-a-line-i-won-t-cross-with-our-savings-i-ll-name-it-with-you-tonight",
  "scene-talk.reply-deflect.give-me-tonight-sunday-we-sit-down-with-the-bills-and-count-it-all",
  "scene-talk.follow-plea.pick-a-number-and-say-it-tonight",
  "scene-talk.follow-plea.tell-me-one-thing-that-changes-tonight",
  "scene-talk.follow-thank.thank-you-i-ll-tell-the-floor-tonight",
  "scene-talk.follow-accept.all-right-i-ll-go-out-first-tonight-so-they-hear-it-from-me",
  "scene-talk.follow-refuse.then-you-ll-be-speaking-alone-tonight-i-ll-speak-when-the-count-is-fin",
  "scene-talk.close-press.think-about-it-tonight-we-re-out-of-time",
  "scene-talk.follow-comfort.take-it-easy-tonight",
  "scene-talk.follow-thank.then-we-start-tonight-bring-me-your-contact-list",
]);
describe("the time of day in scene talk", () => {
  const sceneTalk = banks.find((row) => row.name === "scene-talk.json")!.bank;
  type Use = { excludesFacts?: string[] };
  const parts = sceneTalk.parts as (Part & { uses: Use[] })[];
  const evening =
    /\b(?:tonight|this evening|good evening|good night|your evening)\b|^evening\b/i;
  // "Morning." as a greeting, not "Morning, then." (a time agreed for later).
  const morning = /^(?:good )?morning\b(?!, then)/i;
  const heldBack = (part: (typeof parts)[number], mark: string) =>
    part.uses.every((use) => use.excludesFacts?.includes(mark));
  it("says what hour it is only with the mark that makes it true", () => {
    const wrong: string[] = [];
    for (const part of parts) {
      if (
        evening.test(part.text) &&
        !heldBack(part, "daytime") &&
        !EVENING_AHEAD.has(part.key)
      )
        wrong.push(`${part.key}: names the evening without the daytime mark`);
      if (/\bthis afternoon\b/i.test(part.text) && !heldBack(part, "evening"))
        wrong.push(`${part.key}: names the afternoon without the evening mark`);
      if (
        morning.test(part.text) &&
        !(heldBack(part, "afternoon") && heldBack(part, "evening"))
      )
        wrong.push(`${part.key}: greets the morning without the later marks`);
    }
    expect(wrong).toEqual([]);
  });
  it("lists as looking ahead only lines that name the evening and play all day", () => {
    const byKey = new Map(parts.map((part) => [part.key, part]));
    const stale = [...EVENING_AHEAD].filter((key) => {
      const part = byKey.get(key);
      return !part || !evening.test(part.text) || heldBack(part, "daytime");
    });
    expect(stale).toEqual([]);
  });
});

// A follow that ends the scene (the director's terminal follows: a thank or
// an accept) never asks a question: nothing answers it, and the scene would
// end on it ("Then we start tonight. Where do you keep your contacts?").
describe("the line that ends a scene", () => {
  const sceneTalk = banks.find((row) => row.name === "scene-talk.json")!.bank;
  const terminal: readonly string[] = JSON.parse(
    readFileSync(
      path.join(__dirname, "../src/director/data/scene-talk-rules.json"),
      "utf8",
    ),
  ).terminalFollow;
  type Use = { step?: string; move?: string };
  it("asks no question where it ends the talk", () => {
    const asking = (sceneTalk.parts as (Part & { uses: Use[] })[])
      .filter(
        (part) =>
          /\?\s*$/.test(part.text) &&
          part.uses.some(
            (use) => use.step === "follow" && terminal.includes(use.move ?? ""),
          ),
      )
      .map((part) => `${part.key}: ${part.text}`);
    expect(asking).toEqual([]);
  });
});

// The household's filing talk (family-filing) is said to a candidate for any
// office: a piece names a body (council, board, legislature) only where it
// needs the fact that the race is for one, and claims no span of years.
describe("the household's filing talk", () => {
  const sceneTalk = banks.find((row) => row.name === "scene-talk.json")!.bank;
  const pieces = sceneTalk.parts.filter((part) =>
    (part as Part & { uses?: { purpose?: string }[] }).uses?.some(
      (use) => use.purpose === "family-filing",
    ),
  );
  it("names no body by a fixed word and claims no span of years", () => {
    expect(pieces.length).toBeGreaterThan(0);
    for (const part of pieces) {
      const needs = (
        part as Part & { uses?: { requiresFacts?: string[] }[] }
      ).uses?.flatMap((use) => use.requiresFacts ?? []);
      for (const body of ["council", "board", "legislature", "commission"])
        if (new RegExp(`\\b${body}\\b`, "i").test(part.text))
          expect(
            needs?.some((fact) => fact.includes(body)),
            part.key,
          ).toBe(true);
      expect(part.text, part.key).not.toMatch(
        /\b(?:\d+|two|three|five|ten|twenty) years\b/i,
      );
    }
  });
});
