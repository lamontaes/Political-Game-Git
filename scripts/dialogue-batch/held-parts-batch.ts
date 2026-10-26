/**
 * A grading batch of the hand-written parts held until the owner grades them,
 * by move (owner, Oct 15, evening: batches grade pieces by move, register and
 * bearing, each shown with the slots it fills, so one grade carries to every
 * scene that uses that move). Development tooling; nothing here words
 * anything: every line shown is a bank part as written, its slots named.
 *
 *   node --import tsx scripts/dialogue-batch/held-parts-batch.ts --id batch-22 [--keys <file.json>]
 *
 * With no --keys, every authored part that is held (shippable false) and has
 * no grade in the part ledger; --keys narrows it to a JSON list of part keys.
 * Writes data/english/batches/<id>.json, whose items apply-grades folds into
 * the ledger, and docs/grading/words-<id>.md, the page the owner grades.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PART_GRADES,
  type PartGradeLedger,
} from "../../src/english/english-grades";

const PARTS_DIR = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../../data/english/parts",
);

interface BankPart {
  key: string;
  move: string;
  text: string;
  kind?: string;
  origin?: string;
  shippable?: boolean;
  bearing?: string;
  tag?: { move?: string; key?: string };
  uses?: {
    subject?: string;
    role?: string;
    choice?: string;
    requiresFacts?: string[];
  }[];
}

export interface Bank {
  register: string;
  slots?: Record<string, string>;
  parts: BankPart[];
}

export interface HeldItem {
  i: number;
  bank: string;
  register: string;
  move: string;
  /** The shared move the coverage table counts it under (tag-moves.ts). */
  sharedMove?: string;
  key?: string;
  bearing?: string;
  text: string;
  /** The one part the line is; a grade counts against it alone. */
  parts: [string];
  slots: { name: string; from: string }[];
  /** The record facts a use needs before the line may be said. */
  requires: string[];
  usedFor: string[];
}

const SLOT = /\{([a-z_-]+)\}/gi;

const graded = (key: string, ledger: PartGradeLedger): boolean => {
  const c = ledger.parts[key];
  return (
    !!c && c.good + c.bad + c.fix + c.sharedGood + c.sharedBad + c.sharedFix > 0
  );
};

/**
 * The held, ungraded authored parts of the banks, one item each, ordered by
 * bank and move so every line of one move sits together on the page.
 */
export function heldItems(
  banks: readonly { name: string; bank: Bank }[],
  options: { ledger?: PartGradeLedger; keys?: ReadonlySet<string> } = {},
): HeldItem[] {
  const ledger = options.ledger ?? PART_GRADES;
  const rows: Omit<HeldItem, "i">[] = [];
  for (const { name, bank } of banks)
    for (const part of bank.parts) {
      if (part.origin !== "authored" || part.shippable !== false) continue;
      if (options.keys ? !options.keys.has(part.key) : graded(part.key, ledger))
        continue;
      const slots = [
        ...new Set([...part.text.matchAll(SLOT)].map((m) => m[1]!)),
      ];
      rows.push({
        bank: name,
        register: bank.register,
        move: part.move,
        ...(part.tag?.move ? { sharedMove: part.tag.move } : {}),
        ...(part.tag?.key ? { key: part.tag.key } : {}),
        ...(part.bearing ? { bearing: part.bearing } : {}),
        text: part.text,
        parts: [part.key],
        slots: slots.map((slot) => ({
          name: slot,
          from: bank.slots?.[slot] ?? "no slot note in the bank",
        })),
        requires: [
          ...new Set((part.uses ?? []).flatMap((u) => u.requiresFacts ?? [])),
        ],
        usedFor: [
          ...new Set(
            (part.uses ?? []).map((u) =>
              [u.subject, u.role, u.choice].filter(Boolean).join(" / "),
            ),
          ),
        ].filter(Boolean),
      });
    }
  rows.sort(
    (a, b) =>
      a.bank.localeCompare(b.bank) ||
      a.move.localeCompare(b.move) ||
      a.parts[0].localeCompare(b.parts[0]),
  );
  return rows.map((row, i) => ({ i, ...row }));
}

/** The grading page: one section per bank, one group per move, each line numbered. */
export function heldPage(id: string, items: readonly HeldItem[]): string {
  const banks = [...new Set(items.map((item) => item.bank))];
  const moves = new Set(items.map((item) => `${item.bank}:${item.move}`));
  const words = (name: string) => name.replace(/[-.]/g, " ");
  const out: string[] = [
    `# Words ${words(id)}: the hand-written lines waiting for grades`,
    "",
    `${items.length} lines in ${moves.size} moves across ${banks.length} banks. Each was written by hand for the English engine and is held out of play until you grade it. A grade carries to every scene that uses the line's move.`,
    "",
    "Grade each line good, bad or fix by its number. Curly braces mark what the game fills in from the records, with where each comes from underneath.",
    "",
  ];
  for (const bank of banks) {
    const inBank = items.filter((item) => item.bank === bank);
    out.push(`## ${words(bank.replace(/\.json$/, ""))} (${inBank.length})`, "");
    for (const move of [...new Set(inBank.map((item) => item.move))]) {
      const lines = inBank.filter((item) => item.move === move);
      const first = lines[0]!;
      out.push(
        `### ${words(first.sharedMove ?? move)}${first.key ? `, ${words(first.key)}` : ""} (\`${move}\`)`,
        "",
      );
      for (const item of lines) {
        out.push(
          `- **${item.i}** · **${item.text}**${item.bearing ? ` (${item.bearing})` : ""}`,
        );
        for (const slot of item.slots)
          out.push(`  - {${slot.name}}: ${slot.from}`);
        if (item.requires.length)
          out.push(
            `  - Said only when the record holds: ${item.requires.join(", ")}`,
          );
      }
      out.push("");
    }
  }
  return `${out.join("\n").trimEnd()}\n`;
}

const main = () => {
  const args = process.argv.slice(2);
  const option = (name: string) => {
    const at = args.indexOf(`--${name}`);
    return at >= 0 ? args[at + 1] : undefined;
  };
  const id = option("id");
  if (!id)
    throw new Error(
      "usage: held-parts-batch.ts --id batch-N [--keys <file.json>]",
    );
  const keysFile = option("keys");
  const keys = keysFile
    ? new Set(JSON.parse(readFileSync(keysFile, "utf8")) as string[])
    : undefined;
  const banks = readdirSync(PARTS_DIR)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => ({
      name: file,
      bank: JSON.parse(readFileSync(join(PARTS_DIR, file), "utf8")) as Bank,
    }));
  const items = heldItems(banks, keys ? { keys } : {});
  if (keys && items.length !== keys.size)
    throw new Error(
      `${keys.size - items.length} of the listed keys are not held authored parts`,
    );
  writeFileSync(
    `data/english/batches/${id}.json`,
    `${JSON.stringify({ id, title: `Words ${id}: held hand-written lines`, kind: "held-parts-by-move", items }, null, 2)}\n`,
  );
  writeFileSync(`docs/grading/words-${id}.md`, heldPage(id, items));
  console.log(`${items.length} held lines -> docs/grading/words-${id}.md`);
};

if (import.meta.url === `file://${process.argv[1]}`) main();
