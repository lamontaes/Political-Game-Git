/**
 * Every use of the address bank (data/english/parts/opening-speech.json) declares what its claim
 * rests on (`PartTie`, bank-parts.ts), and the declaration agrees with the facts the use needs:
 * a use that needs no fact a record or a stand supplies is `frame`, and a use that needs one is
 * tied to a kind of record it needs (item words-addresses-are-scenes-with-ties, step 2). The
 * table below says which record each fact the address planner supplies comes from
 * (src/director/speech-outline.ts): the speaker's stand, the law in force or a bill, a named record
 * (the macro month, a budget's books, the address's kind read from the year), or a frame
 * (a name, an office, the theme's name). A `place` tie belongs to a governor's or a local
 * head's address only, on their own state or town: the President's address never names the
 * hearer's town (owner, Nov 16: "the opening speech, if it's from the president, of course it's
 * not going to mention the town"), so no use the President's address can reach is tied to it.
 */
import { expect, it } from "vitest";
import bank from "../../data/english/parts/opening-speech.json" with { type: "json" };
import names from "../../data/english/question-names.json" with { type: "json" };
import type { PartTie, PartUse } from "./bank-parts";

/**
 * Which record a supplied fact comes from, by its name. How a question stands today (`today*`) is
 * the speaker's side's own account of the law in force (question-names.json `today`), so it is
 * the speaker's stand, not the law's.
 */
function factTie(fact: string): PartTie {
  if (fact.startsWith("kind-") || fact === "home-state") return "record";
  if (
    /^(vice-president|speaker|realm-|body-name|presiding|office-title|prior-office|theme-|rank-)/.test(
      fact,
    )
  )
    return "frame";
  if (
    /^(belief|stance-|pole-|family-|party-|today)/.test(fact) ||
    [
      "side",
      "first-side",
      "first-reason",
      "asks-question",
      "good-name",
    ].includes(fact)
  )
    return "stand";
  if (
    /^(law-|condition-law|condition-measure)/.test(fact) ||
    [
      "measure",
      "to",
      "first-to",
      "turn-to",
      "about",
      "about-one",
      "about-many",
      "first-about",
      "first-after",
    ].includes(fact)
  )
    return "law";
  return "record";
}

const TIES: readonly PartTie[] = ["stand", "place", "law", "record", "frame"];

/** The addresses a `place` tie may be said in: the governor's and the local head's. */
const PLACE_SUBJECTS = new Set(["state-of-the-state", "town-address"]);

it("every use of the address bank declares a tie its facts bear out", () => {
  const parts = (
    bank as unknown as {
      parts: { key: string; addressKind?: string; uses: PartUse[] }[];
    }
  ).parts;
  const wrong: string[] = [];
  for (const part of parts)
    for (const use of part.uses) {
      const needs = new Set(
        [...(use.requiresFacts ?? []), ...(use.onlyWhen ?? [])]
          .map(factTie)
          .filter((tie) => tie !== "frame"),
      );
      // An address kind is read from the year's records (address-kind.ts).
      if (part.addressKind) needs.add("record");
      const tie = use.tie;
      if (tie === "place" && !PLACE_SUBJECTS.has(use.subject))
        wrong.push(
          `${part.key}: place, but said in ${use.subject}, not a governor's or local head's address`,
        );
      if (!tie || !TIES.includes(tie)) wrong.push(`${part.key}: no tie`);
      else if (tie === "frame" && needs.size)
        wrong.push(`${part.key}: frame, but needs ${[...needs].join(", ")}`);
      else if (tie !== "frame" && !needs.has(tie))
        wrong.push(
          `${part.key}: ${tie}, but needs ${[...needs].join(", ") || "nothing"}`,
        );
    }
  expect(wrong).toEqual([]);
}, 50); // 16 ms beside other work, 10 alone (a5bf2edd); limit near twice the slower.

it("every field a question's row holds declares its tie (question-names.json ties)", () => {
  const file = names as unknown as {
    ties: { fields: Record<string, PartTie> };
    names: Record<string, Record<string, unknown>>;
  };
  const fields = new Set(
    Object.values(file.names).flatMap((row) => Object.keys(row)),
  );
  const untied = [...fields].filter(
    (field) => !TIES.includes(file.ties.fields[field]!),
  );
  expect(untied).toEqual([]);
  // A side's account of today and its reason are its view, never the law's.
  for (const field of ["for", "against", "today", "todayMore", "reasons"])
    expect(file.ties.fields[field], field).toBe("stand");
}, 50); // 1 ms beside and alone; held at the first test's limit.
