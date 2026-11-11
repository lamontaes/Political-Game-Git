/**
 * Asked "What would I be doing?", the caller says something the offer did
 * not (words-job-offer-answer-repeats-title-and-pay; Ninnekah, Oklahoma,
 * Nov 10: "$16.25 an hour to start. We'd train you on the rest."). Every
 * answer of the job-offer purpose names a fact the offer lines never say
 * (the hours, who held the job before, how many work there), unless it plays
 * only when the records hold none of those.
 */
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

interface Use {
  purpose?: string;
  step?: string;
  move?: string;
  excludesFacts?: string[];
}
interface Part {
  key: string;
  text: string;
  uses?: Use[];
}

const bank = JSON.parse(
  readFileSync("data/english/parts/scene-talk.json", "utf8"),
) as { parts: Part[] };
const slots = (text: string) =>
  new Set([...text.matchAll(/\{([\w-]+)\}/g)].map((match) => match[1]!));
const useOf = (part: Part) =>
  part.uses?.find((use) => use.purpose === "job-offer");

it("every job-offer answer says a fact the offer did not", () => {
  const offerParts = bank.parts.filter((part) => useOf(part)?.step === "state");
  const offered = new Set(offerParts.flatMap((part) => [...slots(part.text)]));
  const answers = bank.parts.filter(
    (part) => useOf(part)?.step === "follow" && useOf(part)?.move === "answer",
  );
  expect(offerParts.length).toBeGreaterThan(0);
  expect(answers.length).toBeGreaterThanOrEqual(4);
  const repeats = answers
    .filter((part) => [...slots(part.text)].every((slot) => offered.has(slot)))
    // A line that only repeats the offer may stay only for an opening whose
    // records hold none of the new facts.
    .filter((part) => {
      const excluded = new Set(useOf(part)?.excludesFacts ?? []);
      return !["hours", "crew", "replaced"].every((fact) => excluded.has(fact));
    })
    .map((part) => `${part.key}: ${part.text}`);
  expect(repeats).toEqual([]);
  // The new facts each have two answers or more, so the move never drops out
  // after its first line is said.
  for (const fact of ["hours", "crew", "replaced"])
    expect(
      answers.filter((part) => slots(part.text).has(fact)).length,
      fact,
    ).toBeGreaterThanOrEqual(2);
});
