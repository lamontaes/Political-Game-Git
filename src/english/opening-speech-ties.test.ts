/**
 * Every use of the address bank (data/english/parts/opening-speech.json) declares what its claim
 * rests on (`PartTie`, bank-parts.ts), and the declaration agrees with the facts the use needs:
 * a use that needs no fact a record or a stand supplies is `frame`, and a use that needs one is
 * tied to a kind of record it needs (item words-addresses-are-scenes-with-ties, step 2). The
 * table below says which record each fact the address planner supplies comes from
 * (src/director/speech-outline.ts): the speaker's stand, the law in force or a bill, a named record
 * (the macro month, a budget's books, the address's kind read from the year), or a frame
 * (a name, an office, the theme's name). No fact the planner supplies today comes from the
 * hearer's own town or household, so no use is tied to `place`: the reach beat's pieces are the
 * next step's.
 */
import { expect, it } from "vitest";
import bank from "../../data/english/parts/opening-speech.json" with { type: "json" };
import type { PartTie, PartUse } from "./bank-parts";

/** Which record a supplied fact comes from, by its name. */
function factTie(fact: string): PartTie {
  if (fact.startsWith("kind-") || fact === "home-state") return "record";
  if (
    /^(vice-president|speaker|realm-|body-name|presiding|office-title|prior-office|theme-|rank-)/.test(
      fact,
    )
  )
    return "frame";
  if (
    /^(belief|stance-|pole-|family-|party-)/.test(fact) ||
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
    /^(law-|today|condition-law|condition-measure)/.test(fact) ||
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
      if (!tie || !TIES.includes(tie)) wrong.push(`${part.key}: no tie`);
      else if (tie === "frame" && needs.size)
        wrong.push(`${part.key}: frame, but needs ${[...needs].join(", ")}`);
      else if (tie !== "frame" && !needs.has(tie))
        wrong.push(
          `${part.key}: ${tie}, but needs ${[...needs].join(", ") || "nothing"}`,
        );
    }
  expect(wrong).toEqual([]);
});
