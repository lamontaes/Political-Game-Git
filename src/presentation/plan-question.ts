/**
 * The question a listener asks about a plan the player just told them, read
 * from the plan's own words.
 *
 * A plan is a recorded goal whose objective names a thing to do ("Make time to
 * learn something") or someone to do it with ("Make time for people you
 * know"). Asking about it means asking about the part the record leaves open:
 * an indefinite object ("something", "someone", "somewhere") becomes the
 * question word that fills it, and a noun phrase becomes "Which ..."
 * with its qualifying clause dropped. A plan that leaves nothing open (time for
 * oneself) has no such question; the caller then reacts and says no more.
 * Nothing here is drawn: the same objective gives the same question.
 */

const OPEN_OBJECT: Readonly<Record<string, string>> = {
  something: "what",
  someone: "who",
  somebody: "who",
  somewhere: "where",
};

const REFLEXIVE = /^(yourself|himself|herself|themselves|myself|ourselves)$/i;

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);
}

export function planQuestion(objective: string): string | null {
  const text = objective.trim().replace(/[.!?]+$/, "");
  const infinitive = /^make (?:some )?time to (\w+) (\w+)$/i.exec(text);
  if (infinitive) {
    const word = OPEN_OBJECT[infinitive[2]!.toLowerCase()];
    return word ? `${capitalize(infinitive[1]!.toLowerCase())} ${word}?` : null;
  }
  const noun = /^make (?:some )?time for (.+)$/i.exec(text);
  if (!noun) return null;
  const phrase = noun[1]!.trim();
  if (REFLEXIVE.test(phrase)) return null;
  // "people you know": the head noun, without its qualifying clause.
  const head = phrase.split(/\s+(?:you|we|they|who|that|i)\s+/i)[0]!.trim();
  return head ? `Which ${head.toLowerCase()}?` : null;
}
