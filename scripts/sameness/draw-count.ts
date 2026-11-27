/* eslint-disable @typescript-eslint/no-explicit-any -- reads recorded telling inputs */
/**
 * The lines of a bank that never play (W1's draw count, #9750 7134029654):
 * tells the kind for every recorded world under 60 trait draws, and lists by
 * move each line of the bank no telling picked, with the facts it needs. A
 * line gated on a fact no input world holds is not dead; one whose facts the
 * worlds hold and is never drawn is (a budgeted slot the move before already
 * said, a lean on no facet, an `after` that never comes).
 * Run: BANK=data/english/parts/outline-call.json KIND=inaugural \
 *   node --import tsx scripts/sameness/draw-count.ts scripts/sameness/inputs/inaugural-drawn.jsonl
 */
import { readFileSync } from "node:fs";
import { tell } from "../../src/english/outline-planner";

const kind = process.env.KIND ?? "inaugural";
const bank = process.env.BANK;
if (!bank) throw new Error("BANK=<bank file> is required");
const rows: any[] = readFileSync(
  process.argv[2] ?? "scripts/sameness/inputs/inaugural-drawn.jsonl",
  "utf8",
)
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
const DRAWS = Number(process.env.DRAWS ?? 60);
const drawn = new Map<string, number>();
for (const row of rows) {
  const facets = Object.keys(row.traits ?? {});
  for (let i = 0; i < DRAWS; i += 1) {
    const traits = Object.fromEntries(
      facets.map((f, j) => [f, ((i * 7 + j * 13 + i * i) % 5) - 2]),
    );
    const told = tell({
      kind,
      facts: row.facts,
      ...(row.points ? { points: row.points } : {}),
      momentKey: `${row.momentKey}:${i}`,
      worldSeed: row.worldSeed,
      traits,
      sourceRecordIds:
        (Object.values(row.facts)[0] as any)?.sourceRecordIds ?? [],
      knower: "person:gate" as any,
    });
    for (const sentence of told?.sentences ?? [])
      drawn.set(sentence.piece, (drawn.get(sentence.piece) ?? 0) + 1);
  }
}
const parts: any[] = JSON.parse(readFileSync(bank, "utf8")).parts;
const never = new Map<string, string[]>();
for (const part of parts)
  if (!drawn.has(part.key)) {
    const needs = (part.uses ?? []).flatMap(
      (use: any) => use.requiresFacts ?? [],
    );
    never.set(part.move, [
      ...(never.get(part.move) ?? []),
      `${part.text}  [${needs.join(",")}]`,
    ]);
  }
const played = parts.filter((part) => drawn.has(part.key)).length;
console.log(
  `${played} of ${parts.length} lines played over ${rows.length} worlds x ${DRAWS} draws`,
);
for (const [move, lines] of never)
  console.log(`${move}: ${lines.length} never played\n  ${lines.join("\n  ")}`);
