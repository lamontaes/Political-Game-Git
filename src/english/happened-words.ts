import happenedWords from "../../data/english/happened-words.json" with { type: "json" };

interface Fact {
  text: string;
  sourceRecordIds: readonly string[];
}

const SAID = (
  happenedWords as unknown as { said: { fact: string; said: string }[] }
).said;

/**
 * What happened, as a scene's first line says it ("the law on minimum wage",
 * "the assault charge"), from the first cause-record fact that names a
 * happening, worded by `data/english/happened-words.json`; null when the
 * record names none (Words lead, Nov 15).
 */
export function happenedSaid(
  facts: Readonly<Record<string, Fact>>,
): Fact | null {
  for (const row of SAID) {
    const fact = facts[row.fact];
    if (fact)
      return {
        text: row.said.replace(`{${row.fact}}`, fact.text),
        sourceRecordIds: fact.sourceRecordIds,
      };
  }
  return null;
}
