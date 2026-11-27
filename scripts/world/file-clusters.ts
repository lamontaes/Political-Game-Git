/**
 * Read-only: how a big file's top-level declarations depend on each other,
 * so a split by concern can be drawn from the code, not from names. Re-run:
 *
 *   node --import tsx scripts/world/file-clusters.ts <file> [--md]
 *
 * It prints, for the file: each top-level declaration with its line range and
 * size; the declarations it keeps state in (module-level `let`, and caches
 * made with `new Map`, `new WeakMap` or `new Set`); what runs when the file
 * loads (a top-level call or `new` outside a function); the strongly
 * connected groups of declarations that depend on each other, which cannot be
 * put in separate files without an import cycle; and, for a chosen split
 * (`--split name=prefix` lines in a JSON file given as `--map`), the edges
 * between the files the split would make. It changes nothing.
 */
import { readFileSync } from "node:fs";
import ts from "typescript";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"))!;
const mapFlag = args.indexOf("--map");
const mapFile = mapFlag >= 0 ? args[mapFlag + 1] : undefined;
if (!file) throw new Error("usage: file-clusters.ts <file> [--map split.json]");

const text = readFileSync(file, "utf8");
const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);

interface Decl {
  name: string;
  kind: string;
  from: number;
  to: number;
  exported: boolean;
  stateful: boolean;
  atLoad: boolean;
  node: ts.Node;
  uses: Set<string>;
}
const decls: Decl[] = [];
const byName = new Map<string, Decl>();
const line = (pos: number) =>
  source.getLineAndCharacterOfPosition(pos).line + 1;
const exportedOf = (n: ts.Node) =>
  !!(
    ts.getCombinedModifierFlags(n as ts.Declaration) & ts.ModifierFlags.Export
  );

function runsAtLoad(init: ts.Expression | undefined): boolean {
  if (!init) return false;
  let found = false;
  const visit = (n: ts.Node) => {
    if (
      ts.isArrowFunction(n) ||
      ts.isFunctionExpression(n) ||
      ts.isClassExpression(n)
    )
      return; // the body runs later
    if (ts.isCallExpression(n) || ts.isNewExpression(n)) found = true;
    ts.forEachChild(n, visit);
  };
  visit(init);
  return found;
}

for (const stmt of source.statements) {
  if (ts.isImportDeclaration(stmt)) continue;
  if (ts.isVariableStatement(stmt)) {
    const isLet = !(stmt.declarationList.flags & ts.NodeFlags.Const);
    for (const d of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(d.name)) continue;
      const init = d.initializer;
      const cache =
        !!init &&
        ts.isNewExpression(init) &&
        /^(Map|WeakMap|Set|WeakSet)$/.test(init.expression.getText());
      const decl: Decl = {
        name: d.name.text,
        kind: isLet ? "let" : "const",
        from: line(stmt.getStart()),
        to: line(stmt.end),
        exported: exportedOf(stmt),
        stateful: isLet || cache,
        atLoad: runsAtLoad(init) && !cache,
        node: d,
        uses: new Set(),
      };
      decls.push(decl);
      byName.set(decl.name, decl);
    }
    continue;
  }
  const named =
    ts.isFunctionDeclaration(stmt) ||
    ts.isInterfaceDeclaration(stmt) ||
    ts.isTypeAliasDeclaration(stmt) ||
    ts.isClassDeclaration(stmt) ||
    ts.isEnumDeclaration(stmt);
  if (!named || !stmt.name) continue;
  const decl: Decl = {
    name: stmt.name.text,
    kind: ts.isFunctionDeclaration(stmt)
      ? "function"
      : ts.isInterfaceDeclaration(stmt)
        ? "interface"
        : ts.isTypeAliasDeclaration(stmt)
          ? "type"
          : "class",
    from: line(stmt.getStart()),
    to: line(stmt.end),
    exported: exportedOf(stmt),
    stateful: false,
    atLoad: false,
    node: stmt,
    uses: new Set(),
  };
  decls.push(decl);
  byName.set(decl.name, decl);
}

for (const decl of decls) {
  const visit = (n: ts.Node) => {
    if (ts.isIdentifier(n) && byName.has(n.text) && n.text !== decl.name)
      decl.uses.add(n.text);
    ts.forEachChild(n, visit);
  };
  visit(decl.node);
}

// Tarjan's strongly connected groups.
let index = 0;
const idx = new Map<string, number>();
const low = new Map<string, number>();
const stack: string[] = [];
const onStack = new Set<string>();
const groups: string[][] = [];
function connect(name: string) {
  idx.set(name, index);
  low.set(name, index);
  index += 1;
  stack.push(name);
  onStack.add(name);
  for (const next of byName.get(name)!.uses) {
    if (!idx.has(next)) {
      connect(next);
      low.set(name, Math.min(low.get(name)!, low.get(next)!));
    } else if (onStack.has(next))
      low.set(name, Math.min(low.get(name)!, idx.get(next)!));
  }
  if (low.get(name) === idx.get(name)) {
    const group: string[] = [];
    let top: string;
    do {
      top = stack.pop()!;
      onStack.delete(top);
      group.push(top);
    } while (top !== name);
    groups.push(group);
  }
}
for (const d of decls) if (!idx.has(d.name)) connect(d.name);

const size = (d: Decl) => d.to - d.from + 1;
const total = text.split("\n").length;
console.log(
  `# ${file}: ${total} lines, ${decls.length} top-level declarations\n`,
);
console.log("## State kept at module level (`let`, caches)");
for (const d of decls.filter((x) => x.stateful))
  console.log(
    `- ${d.name} (${d.kind}, line ${d.from}), used by ${
      decls
        .filter((x) => x.uses.has(d.name))
        .map((x) => x.name)
        .join(", ") || "nothing here"
    }`,
  );
console.log("\n## Runs when the file loads (a top-level call or `new`)");
for (const d of decls.filter((x) => x.atLoad))
  console.log(`- ${d.name} (line ${d.from})`);
console.log(
  "\n## Groups that depend on each other (more than one declaration)",
);
for (const g of groups
  .filter((x) => x.length > 1)
  .sort((a, b) => b.length - a.length)) {
  const lines = g.reduce((n, name) => n + size(byName.get(name)!), 0);
  console.log(
    `- ${g.length} declarations, ${lines} lines: ${g.slice(0, 40).join(", ")}${g.length > 40 ? ", ..." : ""}`,
  );
}
console.log(
  `\n## Declarations by size (functions over 100 lines)\n${decls
    .filter((d) => d.kind === "function" && size(d) > 100)
    .sort((a, b) => size(b) - size(a))
    .map((d) => `- ${d.name}: ${size(d)} lines, line ${d.from}`)
    .join("\n")}`,
);

/**
 * `--roots roots.json` draws the split from the code: each part names the
 * declarations it starts from (its entry points). A declaration only one
 * part reaches, without passing through another part's root, goes to that
 * part; one two parts reach goes to `base`; another part's root a part calls
 * is an edge between the two parts, not a member. Two-way edges mean the
 * roots need moving; the base's size says how much is shared.
 */
const rootsFlag = args.indexOf("--roots");
if (rootsFlag >= 0) {
  const roots = JSON.parse(
    readFileSync(args[rootsFlag + 1]!, "utf8"),
  ) as Record<string, string[]>;
  const rootOwner = new Map<string, string>();
  for (const [part, names] of Object.entries(roots))
    for (const n of names) {
      if (!byName.has(n)) throw new Error(`No declaration ${n} in ${file}`);
      rootOwner.set(n, part);
    }
  const reached = new Map<string, Set<string>>();
  const edges = new Map<string, Set<string>>();
  for (const [part, names] of Object.entries(roots)) {
    const seen = new Set<string>();
    const walk = (name: string) => {
      if (seen.has(name)) return;
      seen.add(name);
      for (const use of byName.get(name)!.uses) {
        const other = rootOwner.get(use);
        if (other && other !== part) {
          (edges.get(part) ?? edges.set(part, new Set()).get(part)!).add(other);
          continue;
        }
        walk(use);
      }
    };
    for (const n of names) walk(n);
    for (const n of seen)
      (reached.get(n) ?? reached.set(n, new Set()).get(n)!).add(part);
  }
  const members = new Map<string, string[]>();
  const place = (part: string, name: string) =>
    (members.get(part) ?? members.set(part, []).get(part)!).push(name);
  for (const d of decls) {
    const parts = reached.get(d.name);
    if (!parts) place("unreached", d.name);
    else if (parts.size === 1) place([...parts][0]!, d.name);
    else place("base", d.name);
  }
  const lines = (names: string[]) =>
    names.reduce((n, x) => n + size(byName.get(x)!), 0);
  console.log("\n## Split drawn from the roots");
  for (const [part, names] of [...members].sort(
    (a, b) => lines(b[1]) - lines(a[1]),
  ))
    console.log(
      `- ${part}: ${names.length} declarations, ${lines(names)} lines`,
    );
  console.log("\n## Edges between parts (a part calls another part's root)");
  for (const [from, tos] of edges)
    console.log(`- ${from} -> ${[...tos].sort().join(", ")}`);
  const two = [...edges].flatMap(([a, tos]) =>
    [...tos]
      .filter((b) => edges.get(b)?.has(a) && a < b)
      .map((b) => `${a} <-> ${b}`),
  );
  console.log(`\nTwo-way edges: ${two.join("; ") || "none"}`);
  console.log(
    `\nUnreached by any root: ${(members.get("unreached") ?? []).join(", ")}`,
  );
  console.log(`\nBase: ${(members.get("base") ?? []).join(", ")}`);
}

if (mapFile) {
  const split = JSON.parse(readFileSync(mapFile, "utf8")) as Record<
    string,
    string[]
  >;
  const owner = new Map<string, string>();
  // An entry is a declaration's name, or a line range "from-to" that takes every declaration starting inside it.
  for (const [part, names] of Object.entries(split))
    for (const n of names) {
      const range = /^(\d+)-(\d+)$/.exec(n);
      if (range) {
        for (const d of decls)
          if (d.from >= Number(range[1]) && d.from <= Number(range[2]))
            owner.set(d.name, part);
      } else owner.set(n, part);
    }
  const edges = new Map<string, Set<string>>();
  const unplaced: string[] = [];
  for (const d of decls) {
    const from = owner.get(d.name);
    if (!from) {
      unplaced.push(d.name);
      continue;
    }
    for (const use of d.uses) {
      const to = owner.get(use);
      if (to && to !== from)
        (edges.get(from) ?? edges.set(from, new Set()).get(from)!).add(to);
    }
  }
  console.log(
    "\n## Edges between the parts of the split (an import each way is a cycle)",
  );
  for (const [from, tos] of edges)
    console.log(`- ${from} -> ${[...tos].sort().join(", ")}`);
  const cycles = [...edges].flatMap(([a, tos]) =>
    [...tos]
      .filter((b) => edges.get(b)?.has(a) && a < b)
      .map((b) => `${a} <-> ${b}`),
  );
  console.log(`\nTwo-way edges: ${cycles.join("; ") || "none"}`);
  console.log(
    `\nNot placed by the split (${unplaced.length}): ${unplaced.slice(0, 60).join(", ")}`,
  );
}
