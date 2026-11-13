/**
 * The scene-talk bank's stock lines by move (words composer, unit 4: the
 * join over the stock lines by kind; docs/design/words-composer.md). Prints
 * what is left to compose: every counted line of data/english/parts/
 * scene-talk.json (no insert, four words or more, not a joined piece, the
 * count tests/guards/english/line-inserts.test.ts keeps) classified by the
 * shared move it makes, the slots that move is said about and the engine
 * that holds each slot's record; then by purpose family, with how many lines
 * a purpose's conversion deletes outright (every use is that family's) and
 * the engines its causes come from.
 *
 *   npx tsx scripts/words/scene-talk-moves.ts [--purpose <family>]
 *
 * Read-only. The move table below is the plan's; the scene engine's own
 * moves (purpose-arcs.json) are what each bank move is filed under.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const INSERT = /\{[^{}\s]+\}/;
const SHORT_WORDS = 3;

interface Use {
  purpose?: string;
  step: string;
  move: string;
  role?: string;
}
interface Part {
  key: string;
  text: string;
  uses: Use[];
  piece?: { of: string; part: string; required?: boolean };
}

/** The shared moves, the bank moves each gathers, and the slots it is said about. */
const MOVES: Record<string, { bank: string[]; slots: string[] }> = {
  "state-stand": {
    bank: ["answer", "tell", "boast", "confess", "lie", "deny"],
    slots: ["subject", "stand", "reason"],
  },
  agree: {
    bank: ["agree", "accept", "relent", "congratulate"],
    slots: ["subject", "tie"],
  },
  refuse: {
    bank: ["refuse", "decline", "disagree", "withdraw"],
    slots: ["subject", "reason"],
  },
  defer: { bank: ["stall", "deflect"], slots: ["subject", "next"] },
  ask: {
    bank: ["ask", "press", "request", "plea", "greet"],
    slots: ["subject", "tie"],
  },
  thank: { bank: ["thank"], slots: ["tie"] },
  apologize: { bank: ["apologize", "comfort"], slots: ["subject", "tie"] },
  promise: { bank: ["promise", "offer"], slots: ["subject", "next"] },
  warn: {
    bank: ["warn", "threaten", "confront", "blame"],
    slots: ["subject", "next"],
  },
  bargain: { bank: ["bargain"], slots: ["subject", "stand"] },
  close: { bank: ["leave"], slots: ["next", "tie"] },
};

/** The engine that holds each slot's record. */
const SLOT_ENGINES: Record<string, string> = {
  subject:
    "the cause record: legislature (bill, vote, ordinance), press/news (story), contest (race), jobs (offer), family (person)",
  stand:
    "legislature vote records (castMemberVote) where a vote exists, else the views engine (viewOn on the bill's question)",
  reason:
    "the speaker's own records through view-learned (work, money), else the stance's principle",
  next: "the body's calendar and the bill's stage (legislature), the contest's dates (elections)",
  tie: "the telling (relation record, earlier scenes between the two)",
};

const bank = JSON.parse(
  readFileSync(path.join(ROOT, "data/english/parts/scene-talk.json"), "utf8"),
) as { parts: Part[] };
const types = JSON.parse(
  readFileSync(
    path.join(ROOT, "src/director/data/situation-types.json"),
    "utf8",
  ),
) as {
  types: {
    purpose?: string;
    causes?: { causeEngine?: string; causeRecord?: string }[];
  }[];
};

const only = process.argv.includes("--purpose")
  ? process.argv[process.argv.indexOf("--purpose") + 1]
  : undefined;

const counted = bank.parts.filter((part) => {
  if (INSERT.test(part.text)) return false;
  if (part.text.trim().split(/\s+/).length <= SHORT_WORDS) return false;
  return !part.piece;
});
const familyOf = (use: Use) => (use.purpose ?? "*").split(".")[0]!;
const moveOf = (bankMove: string) =>
  Object.entries(MOVES).find(([, row]) => row.bank.includes(bankMove))?.[0] ??
  (bankMove === "narrate" || bankMove === "beat" ? "narrate" : "other");

const rows = counted.filter(
  (part) => !only || part.uses.some((use) => familyOf(use) === only),
);
process.stdout.write(
  `scene-talk counted lines: ${counted.length}${only ? `; in ${only}: ${rows.length}` : ""}\n\n`,
);

const byMove = new Map<string, { n: number; steps: Map<string, number> }>();
for (const part of rows) {
  const use = part.uses[0]!;
  const move = moveOf(use.move);
  const row = byMove.get(move) ?? { n: 0, steps: new Map() };
  row.n += 1;
  const step = `${use.step}/${use.role ?? "-"}`;
  row.steps.set(step, (row.steps.get(step) ?? 0) + 1);
  byMove.set(move, row);
}
process.stdout.write("move | lines | by step | slots\n");
for (const [move, row] of [...byMove].sort((a, b) => b[1].n - a[1].n))
  process.stdout.write(
    `${move} | ${row.n} | ${[...row.steps]
      .sort((a, b) => b[1] - a[1])
      .map(([step, n]) => `${step} ${n}`)
      .join(
        ", ",
      )} | ${(MOVES[move]?.slots ?? ["(the scene's setting)"]).join(", ")}\n`,
  );
process.stdout.write("\nslot | engine that holds its record\n");
for (const [slot, engine] of Object.entries(SLOT_ENGINES))
  process.stdout.write(`${slot} | ${engine}\n`);

const families = new Map<string, { n: number; only: number }>();
for (const part of rows) {
  const fams = new Set(part.uses.map(familyOf));
  for (const fam of fams) {
    const row = families.get(fam) ?? { n: 0, only: 0 };
    row.n += 1;
    if (fams.size === 1) row.only += 1;
    families.set(fam, row);
  }
}
const causes = new Map<string, Set<string>>();
for (const type of types.types)
  if (type.purpose)
    for (const cause of type.causes ?? [])
      causes
        .set(
          type.purpose.split(".")[0]!,
          causes.get(type.purpose.split(".")[0]!) ?? new Set(),
        )
        .get(type.purpose.split(".")[0]!)!
        .add(`${cause.causeEngine}:${cause.causeRecord}`);
process.stdout.write(
  "\npurpose | lines | deleted outright on conversion | causes (engine:record)\n",
);
for (const [fam, row] of [...families].sort((a, b) => b[1].n - a[1].n))
  process.stdout.write(
    `${fam} | ${row.n} | ${row.only} | ${[...(causes.get(fam) ?? [])].slice(0, 6).join(", ") || "-"}\n`,
  );
