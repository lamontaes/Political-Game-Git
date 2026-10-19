/**
 * The coverage table: for every situation type in the director's catalog
 * (src/director/data/situation-types.json), every role, every move the role
 * may make and every register the situation's lines are composed in, how
 * many bank parts (data/english/parts/) carry that move in that register and
 * fit that situation's key, and how many of them the owner's grades pass.
 * Zero cells are the mining and authoring list. It also counts the catalog by
 * endpoint (money, a bill, political life, personal).
 *
 *   npm run words:coverage            print the totals, write docs/grading/coverage.md
 *
 * Development tooling: it reads data and writes a page; it words nothing.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import { heldByGrades, PART_GRADES } from "../../src/english/english-grades";
import {
  SITUATION_LIBRARY,
  type SituationType,
} from "../../src/director/scheduling";
import { MOVES, readBanks, type BankFile } from "../english-corpus/tag-moves";

/** The tag the catalog carries on each situation type. */
export interface SituationTag {
  key: string;
  endpoint: string;
  registers: string[];
}

export interface CoverageCell {
  situation: string;
  role: string;
  move: string;
  register: string;
  key: string;
  endpoint: string;
  parts: number;
  passed: number;
}

/** The narrator's role name in a narrated register's cells. */
export const NARRATOR = "(narrator)";

export function tagOf(type: SituationType): SituationTag {
  const tag = (type as SituationType & { tag?: SituationTag }).tag;
  if (!tag) throw new Error(`Situation type ${type.key} has no tag.`);
  return tag;
}

/** A part's coverage register: its bank's, split by occasion where the bank holds several. */
export function partRegister(
  bank: Pick<BankFile, "register">,
  part: BankFile["parts"][number],
): string {
  if (!MOVES.registers.splitBySubject.includes(bank.register))
    return bank.register;
  const subject = part.uses?.[0]?.subject;
  return subject ? `${bank.register}/${subject}` : bank.register;
}

/** Whether the owner's grades pass a part: graded good and not held back. */
export function passed(partKey: string): boolean {
  const counts = PART_GRADES.parts[partKey];
  if (!counts) return false;
  return (counts.good > 0 || counts.sharedGood > 0) && !heldByGrades(partKey);
}

export function coverageCells(
  types: readonly SituationType[] = SITUATION_LIBRARY.types,
  banks: readonly BankFile[] = readBanks(),
): CoverageCell[] {
  // Index: register|move -> parts, each with its key.
  const index = new Map<string, { key?: string; partKey: string }[]>();
  for (const bank of banks)
    for (const part of bank.parts) {
      if (!part.tag) throw new Error(`Part ${part.key} has no tag.`);
      const at = `${partRegister(bank, part)}|${part.tag.move}`;
      const list = index.get(at) ?? [];
      list.push({ key: part.tag.key, partKey: part.key });
      index.set(at, list);
    }
  const cells: CoverageCell[] = [];
  for (const type of types) {
    const tag = tagOf(type);
    const add = (role: string, move: string, register: string) => {
      const fits = (index.get(`${register}|${move}`) ?? []).filter(
        (row) => row.key === undefined || row.key === tag.key,
      );
      cells.push({
        situation: type.key,
        role,
        move,
        register,
        key: tag.key,
        endpoint: tag.endpoint,
        parts: fits.length,
        passed: fits.filter((row) => passed(row.partKey)).length,
      });
    };
    for (const register of tag.registers) {
      const narrated = MOVES.registers.narrated[register];
      if (narrated) {
        for (const move of narrated) add(NARRATOR, move, register);
        continue;
      }
      for (const role of type.roles)
        for (const move of role.moves) add(role.key, move, register);
    }
  }
  return cells;
}

/** Problems with the tie itself: an unknown key, endpoint, register or move. */
export function catalogProblems(
  types: readonly SituationType[] = SITUATION_LIBRARY.types,
  banks: readonly BankFile[] = readBanks(),
): string[] {
  const problems: string[] = [];
  const registers = new Set<string>();
  for (const bank of banks)
    for (const part of bank.parts) registers.add(partRegister(bank, part));
  for (const type of types) {
    const tag = (type as SituationType & { tag?: SituationTag }).tag;
    if (!tag) {
      problems.push(`${type.key}: no tag`);
      continue;
    }
    if (!(tag.key in MOVES.keys)) problems.push(`${type.key}: key ${tag.key}`);
    if (!(tag.endpoint in MOVES.endpoints))
      problems.push(`${type.key}: endpoint ${tag.endpoint}`);
    for (const register of tag.registers)
      if (!registers.has(register))
        problems.push(`${type.key}: register ${register}`);
    for (const role of type.roles)
      for (const move of role.moves)
        if (!(move in MOVES.moves))
          problems.push(`${type.key}.${role.key}: move ${move}`);
  }
  return problems;
}

const sum = (
  rows: readonly CoverageCell[],
  pick: (row: CoverageCell) => number,
) => rows.reduce((total, row) => total + pick(row), 0);

export function coveragePage(
  cells: readonly CoverageCell[],
  types: readonly SituationType[] = SITUATION_LIBRARY.types,
): string {
  const empty = cells.filter((row) => row.parts === 0);
  const ungraded = cells.filter((row) => row.parts > 0 && row.passed === 0);
  const lines: string[] = [];
  lines.push("# Words coverage: situations, roles, moves and registers");
  lines.push("");
  lines.push(
    "Built by `npm run words:coverage` (`scripts/dialogue-batch/coverage-table.ts`) from the director's catalog (`src/director/data/situation-types.json`), the banks (`data/english/parts/`, each part tagged by `scripts/english-corpus/tag-moves.ts` from `scripts/english-corpus/moves.json`) and the owner's grades (`data/english/part-grades.json`). A cell is one situation type, one role, one move that role may make and one register the situation is composed in; a narrated register (the memoir, scene narration, headlines, a law, the minutes) has narrator cells instead. A part fits a cell when it carries the move in that register and its key is the situation's or none. **Parts** counts the fitting parts; **passed** counts those the owner graded good and the grades do not hold back.",
  );
  lines.push("");
  lines.push("## Totals");
  lines.push("");
  lines.push("| Measure | Count |");
  lines.push("|---|---|");
  lines.push(`| Situation types | ${types.length} |`);
  lines.push(`| Cells | ${cells.length} |`);
  lines.push(
    `| Cells with at least one part | ${cells.length - empty.length} |`,
  );
  lines.push(
    `| Empty cells (the mining and authoring list) | ${empty.length} |`,
  );
  lines.push(`| Cells with parts but none graded pass | ${ungraded.length} |`);
  lines.push(
    `| Cells with a part graded pass | ${cells.filter((row) => row.passed > 0).length} |`,
  );
  lines.push(
    `| Part fits counted over all cells | ${sum(cells, (row) => row.parts)} |`,
  );
  lines.push("");
  lines.push("## By endpoint");
  lines.push("");
  lines.push(
    "| Endpoint | Situation types | Cells | Empty cells | Cells with a pass |",
  );
  lines.push("|---|---|---|---|---|");
  for (const endpoint of Object.keys(MOVES.endpoints)) {
    const rows = cells.filter((row) => row.endpoint === endpoint);
    const count = types.filter(
      (type) => tagOf(type).endpoint === endpoint,
    ).length;
    lines.push(
      `| ${endpoint} | ${count} | ${rows.length} | ${rows.filter((row) => row.parts === 0).length} | ${rows.filter((row) => row.passed > 0).length} |`,
    );
  }
  lines.push("");
  lines.push("## By situation key");
  lines.push("");
  lines.push(
    "| Key | Situation types | Cells | Empty cells | Cells with a pass |",
  );
  lines.push("|---|---|---|---|---|");
  for (const key of Object.keys(MOVES.keys)) {
    const rows = cells.filter((row) => row.key === key);
    const count = types.filter((type) => tagOf(type).key === key).length;
    lines.push(
      `| ${key} | ${count} | ${rows.length} | ${rows.filter((row) => row.parts === 0).length} | ${rows.filter((row) => row.passed > 0).length} |`,
    );
  }
  lines.push("");
  lines.push("## Emptiest situations");
  lines.push("");
  lines.push("Situation types by their share of empty cells, emptiest first.");
  lines.push("");
  lines.push(
    "| Situation | Key | Endpoint | Cells | Empty | Parts fitting | Passed |",
  );
  lines.push("|---|---|---|---|---|---|---|");
  const bySituation = types
    .map((type) => {
      const rows = cells.filter((row) => row.situation === type.key);
      return {
        type,
        rows,
        empty: rows.filter((row) => row.parts === 0).length,
      };
    })
    .sort(
      (a, b) =>
        b.empty / Math.max(1, b.rows.length) -
          a.empty / Math.max(1, a.rows.length) ||
        a.type.key.localeCompare(b.type.key),
    );
  for (const { type, rows, empty: count } of bySituation) {
    const tag = tagOf(type);
    lines.push(
      `| ${type.key} | ${tag.key} | ${tag.endpoint} | ${rows.length} | ${count} | ${sum(rows, (row) => row.parts)} | ${sum(rows, (row) => row.passed)} |`,
    );
  }
  lines.push("");
  lines.push("## Every cell");
  lines.push("");
  lines.push(
    "One row per situation, role and move; each register shows parts/passed. A dash is an empty cell.",
  );
  for (const type of types) {
    const tag = tagOf(type);
    const rows = cells.filter((row) => row.situation === type.key);
    const registers = tag.registers;
    lines.push("");
    lines.push(`### ${type.key} (${tag.key}, ${tag.endpoint})`);
    lines.push("");
    lines.push(`| Role | Move | ${registers.join(" | ")} |`);
    lines.push(`|---|---|${registers.map(() => "---").join("|")}|`);
    const pairs = [...new Set(rows.map((row) => `${row.role}|${row.move}`))];
    for (const pair of pairs) {
      const [role, move] = pair.split("|") as [string, string];
      const columns = registers.map((register) => {
        const cell = rows.find(
          (row) =>
            row.role === role && row.move === move && row.register === register,
        );
        if (!cell) return "";
        return cell.parts === 0 ? "-" : `${cell.parts}/${cell.passed}`;
      });
      lines.push(`| ${role} | ${move} | ${columns.join(" | ")} |`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

/** The ten emptiest cells: empty cells on the golden path's registers first, then by situation. */
export function emptiest(
  cells: readonly CoverageCell[],
  count = 10,
): CoverageCell[] {
  const spoken = (row: CoverageCell) => (row.role === NARRATOR ? 1 : 0);
  return cells
    .filter((row) => row.parts === 0)
    .sort(
      (a, b) =>
        spoken(a) - spoken(b) ||
        (a.endpoint === "personal" ? 1 : 0) -
          (b.endpoint === "personal" ? 1 : 0) ||
        a.situation.localeCompare(b.situation) ||
        a.role.localeCompare(b.role) ||
        a.move.localeCompare(b.move) ||
        a.register.localeCompare(b.register),
    )
    .slice(0, count);
}

async function main(): Promise<void> {
  const problems = catalogProblems();
  for (const line of problems) console.error(line);
  if (problems.length) process.exit(1);
  const cells = coverageCells();
  const out = join(
    fileURLToPath(new URL(".", import.meta.url)),
    "../../docs/grading/coverage.md",
  );
  writeFileSync(out, await format(coveragePage(cells), { parser: "markdown" }));
  const empty = cells.filter((row) => row.parts === 0).length;
  console.log(
    `${SITUATION_LIBRARY.types.length} situation types, ${cells.length} cells, ${cells.length - empty} with parts, ${empty} empty, ${cells.filter((row) => row.passed > 0).length} with a part graded pass`,
  );
  console.log("Ten emptiest cells (situation / role / move / register):");
  for (const row of emptiest(cells))
    console.log(
      `  ${row.situation} / ${row.role} / ${row.move} / ${row.register}`,
    );
  console.log(`Wrote ${out}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
  main();
