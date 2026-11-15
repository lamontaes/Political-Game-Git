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
import { SHORT_QUESTION_MOST_WORDS as SHORT } from "../english/composed-checks";

export function addressSentences(text: string): string[] {
  const cut = text
    .split(/(?<=[.!?])\s+/)
    .map((row) => row.trim())
    .filter(Boolean);
  const out: string[] = [];
  // A short question waits for the sentence after it and is said with it.
  let waiting: string | undefined;
  for (const sentence of cut) {
    if (waiting !== undefined) {
      out.push(`${waiting} ${sentence}`);
      waiting = undefined;
    } else if (sentence.endsWith("?") && sentence.split(/\s+/).length <= SHORT)
      waiting = sentence;
    else out.push(sentence);
  }
  // A short question that ends the address has no sentence to join.
  if (waiting !== undefined) out.push(waiting);
  return out;
}
