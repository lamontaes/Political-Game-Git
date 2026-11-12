/**
 * An address cut into the sentences its versions tests count across worlds
 * (local-address-versions, opening-address-versions): one helper for both.
 * A question of `shortQuestionMostWords` words or fewer ("Why?") is read
 * with the sentence after it as one thought. The words lead's ruling of
 * Nov 12, on seed bab4ffbbf3ef6ae3: "Why? Because I believe {belief}." is one
 * piece, and the owner's own rule treats one to three words as too short to
 * carry a fact (Nov 11, call 12: "Replies of one to three words and action
 * names stay"). Every other sentence is cut exactly as before.
 */
import checks from "../../data/english/composed-checks.json" with { type: "json" };

const SHORT = (
  checks as unknown as {
    parameters: { shortQuestionMostWords: { value: number } };
  }
).parameters.shortQuestionMostWords.value;

export function addressSentences(text: string): string[] {
  const cut = text
    .split(/(?<=[.!?])\s+/)
    .map((row) => row.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (let at = 0; at < cut.length; at += 1) {
    const sentence = cut[at]!;
    const next = cut[at + 1];
    if (
      next !== undefined &&
      sentence.endsWith("?") &&
      sentence.split(/\s+/).length <= SHORT
    ) {
      out.push(`${sentence} ${next}`);
      at += 1;
    } else out.push(sentence);
  }
  return out;
}
