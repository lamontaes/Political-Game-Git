/**
 * The desktop shell's dialog sentences, from the English engine's shell bank
 * (data/english/parts/shell.json, staged beside the client as
 * shell-lines.json). The shell runs outside the game, so it reads the bank
 * itself; no sentence is written in the shell. A line is the text of the part for a move
 * with its `{slot}` facts filled in.
 */

/** @param {{ parts: { move: string, text: string }[] }} bank */
export function shellLines(bank) {
  const byKey = new Map(bank.parts.map((part) => [part.move, part.text]));
  return (key, facts = {}) => {
    const text = byKey.get(key);
    if (text === undefined) throw new Error(`No shell line: ${key}`);
    return text.replace(/\{(\w+)\}/g, (_all, slot) => {
      if (!(slot in facts)) throw new Error(`Shell line ${key} lacks ${slot}`);
      return String(facts[slot]);
    });
  };
}
