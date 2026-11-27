/**
 * Splits one big module into a base and the parts named by their entry
 * points, with no import cycle. Re-runnable: it reads the file as it stands,
 * so the CTO can run it again on a newer tree after other branches land.
 *
 *   node --import tsx scripts/world/split-file.ts <file> --roots <roots.json> --prefix <name-> [--write]
 *
 * `roots.json` maps each part to the declarations it starts from, plus a
 * `__place` map of declarations that no root reaches to the part they go to.
 * A declaration only one part reaches goes to that part; one two parts reach
 * (and everything a shared declaration needs) goes to the `base` file; what is
 * not reached stays in the original file, which re-exports every part so no
 * importer changes. Without `--write` it only prints the plan.
 *
 * Structure only: no declaration's text changes except an added `export` on
 * one another file now reads. See docs/coordination/refactor/press-split-plan-2026-11-27.md.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const args = process.argv.slice(2);
const flag = (name: string) => args.indexOf(`--${name}`);
const value = (name: string) => (flag(name) >= 0 ? args[flag(name) + 1]! : "");
const file = path.resolve(args.find((a) => !a.startsWith("--"))!);
const rootsFile = value("roots");
const prefix = value("prefix");
const write = flag("write") >= 0;
if (!file || !rootsFile || !prefix)
  throw new Error(
    "usage: split-file.ts <file> --roots <json> --prefix <name-> [--write]",
  );

const loaded = JSON.parse(readFileSync(rootsFile, "utf8")) as Record<
  string,
  unknown
>;
const placeMap = (loaded["__place"] ?? {}) as Record<string, string>;
delete loaded["__place"];
/** Parts that import nothing of the file (constants): any part may use them, the base included. */
const leaves = new Set((loaded["__leaves"] ?? []) as string[]);
delete loaded["__leaves"];
const spec = loaded as Record<string, string[]>;

const program = ts.createProgram([file], {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  resolveJsonModule: true,
  allowArbitraryExtensions: true,
  esModuleInterop: true,
  strict: true,
  skipLibCheck: true,
  noEmit: true,
  types: [],
});
const checker = program.getTypeChecker();
const sf = program.getSourceFile(file)!;
const text = sf.getFullText();

interface Node {
  name: string;
  statements: ts.Statement[];
  uses: Set<string>;
  imports: Set<ts.ImportDeclaration>;
  importNames: Map<ts.ImportDeclaration, Set<string>>;
}
const typeOnlyNames = new Set<string>();
const hoistDecl = new Map<string, ts.ImportDeclaration>();
const nodes = new Map<string, Node>();
const stmtNode = new Map<ts.Statement, Node>();
const imports: ts.ImportDeclaration[] = [];
const kept: ts.Statement[] = [];

function declaredNames(stmt: ts.Statement): string[] {
  if (ts.isVariableStatement(stmt))
    return stmt.declarationList.declarations.flatMap((d) =>
      ts.isIdentifier(d.name) ? [d.name.text] : [],
    );
  if (
    (ts.isFunctionDeclaration(stmt) ||
      ts.isClassDeclaration(stmt) ||
      ts.isInterfaceDeclaration(stmt) ||
      ts.isTypeAliasDeclaration(stmt) ||
      ts.isEnumDeclaration(stmt)) &&
    stmt.name
  )
    return [stmt.name.text];
  return [];
}

for (const stmt of sf.statements) {
  if (ts.isImportDeclaration(stmt)) {
    imports.push(stmt);
    continue;
  }
  const names = declaredNames(stmt);
  if (!names.length) {
    kept.push(stmt);
    continue;
  }
  // A statement declaring several names, or a name declared by several
  // statements (overloads, an interface beside a const), is one node.
  let node = nodes.get(names[0]!);
  if (!node) {
    node = {
      name: names[0]!,
      statements: [],
      uses: new Set(),
      imports: new Set(),
      importNames: new Map(),
    };
  }
  node.statements.push(stmt);
  for (const name of names) {
    const other = nodes.get(name);
    if (other && other !== node) {
      node.statements.push(
        ...other.statements.filter((s) => !node!.statements.includes(s)),
      );
      for (const s of other.statements) stmtNode.set(s, node);
    }
    nodes.set(name, node);
  }
  stmtNode.set(stmt, node);
}
const nodeList = [...new Set(nodes.values())];

function nodeOfDeclaration(decl: ts.Node): Node | undefined {
  if (decl.getSourceFile() !== sf) return undefined;
  let cur: ts.Node | undefined = decl;
  while (cur && cur.parent !== sf) cur = cur.parent;
  return cur ? stmtNode.get(cur as ts.Statement) : undefined;
}

function scan(
  root: ts.Node,
  node: Node | null,
  into: {
    uses: Set<string>;
    imports: Set<ts.ImportDeclaration>;
    importNames: Map<ts.ImportDeclaration, Set<string>>;
  },
) {
  const visit = (n: ts.Node) => {
    if (ts.isIdentifier(n)) {
      let sym = checker.getSymbolAtLocation(n);
      if (
        n.parent &&
        ts.isShorthandPropertyAssignment(n.parent) &&
        n.parent.name === n
      )
        sym = checker.getShorthandAssignmentValueSymbol(n.parent) ?? sym;
      if (
        n.parent &&
        ts.isExportSpecifier(n.parent) &&
        !n.parent.parent.parent.moduleSpecifier
      )
        sym = checker.getExportSpecifierLocalTargetSymbol(n.parent) ?? sym;
      for (const decl of sym?.declarations ?? []) {
        if (decl.getSourceFile() !== sf) continue;
        if (
          ts.isImportSpecifier(decl) ||
          ts.isImportClause(decl) ||
          ts.isNamespaceImport(decl)
        ) {
          const imp = ts.findAncestor(decl, ts.isImportDeclaration)!;
          into.imports.add(imp);
          if (ts.isImportSpecifier(decl)) {
            const aliased = sym && checker.getAliasedSymbol(sym);
            if (aliased && !(aliased.flags & ts.SymbolFlags.Value))
              typeOnlyNames.add(decl.name.text);
            hoistDecl.set(decl.name.text, imp);
          }
          (
            into.importNames.get(imp) ??
            into.importNames.set(imp, new Set()).get(imp)!
          ).add(
            ts.isImportSpecifier(decl)
              ? decl.name.text
              : ts.isNamespaceImport(decl)
                ? `* as ${decl.name.text}`
                : `default ${decl.name!.text}`,
          );
          continue;
        }
        const other = nodeOfDeclaration(decl);
        if (other && other !== node) into.uses.add(other.name);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(root);
}
for (const node of nodeList)
  for (const s of node.statements) scan(s, node, node);

const byName = (name: string) => nodes.get(name);
for (const parts of Object.values(spec))
  for (const r of parts)
    if (!byName(r))
      throw new Error(`No declaration ${r} in ${path.basename(file)}`);

// Which part reaches which declaration, not walking through another part's root.
const rootOwner = new Map<string, string>();
for (const [part, names] of Object.entries(spec))
  for (const n of names) rootOwner.set(byName(n)!.name, part);
for (const [name, part] of Object.entries(placeMap)) {
  if (!byName(name)) throw new Error(`__place names no declaration: ${name}`);
  rootOwner.set(byName(name)!.name, part);
  (spec[part] ??= []).push(name);
}
const reached = new Map<string, Set<string>>();
for (const [part, names] of Object.entries(spec)) {
  const seen = new Set<string>();
  const walk = (name: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    for (const use of byName(name)!.uses) {
      const other = rootOwner.get(byName(use)!.name);
      if (other && other !== part) continue;
      walk(use);
    }
  };
  for (const n of names) walk(byName(n)!.name);
  for (const n of seen)
    (reached.get(n) ?? reached.set(n, new Set()).get(n)!).add(part);
}
const owner = new Map<string, string>();
for (const node of nodeList) {
  const parts = reached.get(node.name);
  if (!parts) owner.set(node.name, "");
  else if (parts.size === 1) owner.set(node.name, [...parts][0]!);
  else owner.set(node.name, "base");
}
// Everything a shared declaration needs is shared; a part's root a base
// declaration reads is shared too. Repeat until nothing moves.
for (let moved = true; moved;) {
  moved = false;
  for (const node of nodeList)
    if (owner.get(node.name) === "base")
      for (const use of node.uses)
        if (
          owner.get(byName(use)!.name) !== "base" &&
          !leaves.has(owner.get(byName(use)!.name)!)
        ) {
          owner.set(byName(use)!.name, "base");
          moved = true;
        }
}
for (const node of nodeList)
  if (leaves.has(owner.get(node.name)!) && node.uses.size)
    throw new Error(
      `${node.name} is in the leaf ${owner.get(node.name)} but uses ${[...node.uses].join(", ")}`,
    );
// A kept (unreached) declaration may use anything; a part must not use a kept one.
for (const node of nodeList) {
  const mine = owner.get(node.name)!;
  if (!mine) continue;
  for (const use of node.uses)
    if (owner.get(byName(use)!.name) === "")
      throw new Error(
        `${node.name} (${mine}) uses ${use}, which no part holds: name it in roots or __place`,
      );
}
// Part-to-part edges must run one way.
const edges = new Map<string, Set<string>>();
for (const node of nodeList) {
  const from = owner.get(node.name)!;
  if (!from) continue;
  for (const use of node.uses) {
    const to = owner.get(byName(use)!.name)!;
    if (to && to !== from)
      (edges.get(from) ?? edges.set(from, new Set()).get(from)!).add(to);
  }
}
const two = [...edges].flatMap(([a, tos]) =>
  [...tos]
    .filter((b) => edges.get(b)?.has(a) && a < b)
    .map((b) => `${a} <-> ${b}`),
);
const lines = (n: Node) =>
  n.statements.reduce((c, s) => c + s.getText().split("\n").length, 0);
const members = new Map<string, Node[]>();
for (const node of nodeList)
  (
    members.get(owner.get(node.name)! || "(kept)") ??
    members
      .set(owner.get(node.name)! || "(kept)", [])
      .get(owner.get(node.name)! || "(kept)")!
  ).push(node);
for (const [part, list] of [...members].sort(
  (a, b) =>
    b[1].reduce((c, n) => c + lines(n), 0) -
    a[1].reduce((c, n) => c + lines(n), 0),
))
  console.log(
    `${part}: ${list.length} declarations, ${list.reduce((c, n) => c + lines(n), 0)} lines`,
  );
for (const [from, tos] of edges)
  console.log(`${from} -> ${[...tos].sort().join(", ")}`);
console.log(`two-way edges: ${two.join("; ") || "none"}`);
if (two.length)
  throw new Error("two-way edges: move a root or a declaration to __place");

if (!write) process.exit(0);

// --- write ---
const dir = path.dirname(file);
const fileOf = (part: string) => path.join(dir, `${prefix}${part}.ts`);
const importText = (imp: ts.ImportDeclaration) =>
  (imp.moduleSpecifier as ts.StringLiteral).text;
/** Statement text with its leading comments, `export` added when another file reads it. */
function textOf(stmt: ts.Statement, needsExport: boolean): string {
  const start = stmt.getFullStart();
  const comments = ts.getLeadingCommentRanges(text, start) ?? [];
  const from = comments.length ? comments[0]!.pos : stmt.getStart();
  let out = text.slice(from, stmt.getStart());
  let body = text.slice(stmt.getStart(), stmt.end);
  if (needsExport && !/^export\b/.test(body)) body = `export ${body}`;
  out += body;
  return out;
}
/** Drops import names the new file's code never uses (a name that only a comment mentioned). */
function pruneImports(code: string): string {
  const made = ts.createSourceFile("x.ts", code, ts.ScriptTarget.ES2022, true);
  const used = new Set<string>();
  const walk = (n: ts.Node) => {
    if (ts.isImportDeclaration(n)) return;
    if (ts.isIdentifier(n)) used.add(n.text);
    ts.forEachChild(n, walk);
  };
  made.statements.forEach(walk);
  let out = code;
  for (const imp of made.statements.filter(ts.isImportDeclaration)) {
    const clause = imp.importClause;
    const named = clause?.namedBindings;
    if (!clause || !named || !ts.isNamedImports(named)) continue;
    const keep = named.elements.filter((e) => used.has(e.name.text));
    if (keep.length === named.elements.length) continue;
    const def =
      clause.name && used.has(clause.name.text) ? clause.name.text : "";
    const bits = [
      def,
      keep.length ? `{ ${keep.map((e) => e.getText()).join(", ")} }` : "",
    ].filter(Boolean);
    const replacement = bits.length
      ? `import ${clause.isTypeOnly ? "type " : ""}${bits.join(", ")} from ${imp.moduleSpecifier.getText()};`
      : "";
    out = out.replace(imp.getText(), replacement);
  }
  return out;
}
const readByOther = new Set<string>();
for (const node of nodeList) {
  const mine = owner.get(node.name)!;
  for (const use of node.uses)
    if (owner.get(byName(use)!.name) !== mine)
      readByOther.add(byName(use)!.name);
}
/**
 * A name from another module that two or more of the new files read is
 * imported once, by the base, and re-exported from there: the families and
 * import-cycle guards count each file's imports, so a split that repeated
 * them would raise both counts.
 */
function reachesInside(imp: ts.ImportDeclaration): boolean {
  return importText(imp).startsWith(".");
}
const nameOwners = new Map<string, Set<string>>();
const addOwner = (n: string, who: string) =>
  (nameOwners.get(n) ?? nameOwners.set(n, new Set()).get(n)!).add(who);
const named = (n: string) =>
  !n.startsWith("default ") && !n.startsWith("* as ");
for (const node of nodeList)
  for (const [imp, names] of node.importNames)
    for (const n of names)
      if (named(n) && reachesInside(imp))
        addOwner(n, owner.get(node.name)! || "(kept)");
for (const stmt of kept) {
  const it = {
    uses: new Set<string>(),
    imports: new Set<ts.ImportDeclaration>(),
    importNames: new Map<ts.ImportDeclaration, Set<string>>(),
  };
  scan(stmt, null, it);
  for (const [imp, names] of it.importNames)
    for (const n of names)
      if (named(n) && reachesInside(imp)) addOwner(n, "(kept)");
}
const hoisted = new Set(
  [...nameOwners].filter(([, o]) => o.size >= 2).map(([n]) => n),
);
function importsFor(
  items: {
    uses: Set<string>;
    imports: Set<ts.ImportDeclaration>;
    importNames: Map<ts.ImportDeclaration, Set<string>>;
  }[],
  self: string,
): string {
  const out: string[] = [];
  const bySpec = new Map<
    string,
    { imp: ts.ImportDeclaration; names: Set<string> }[]
  >();
  for (const it of items)
    for (const imp of it.imports) {
      const rec =
        bySpec.get(importText(imp)) ??
        bySpec.set(importText(imp), []).get(importText(imp))!;
      let slot = rec.find((r) => r.imp === imp);
      if (!slot) rec.push((slot = { imp, names: new Set() }));
      for (const n of it.importNames.get(imp) ?? [])
        if (self === "base" || !hoisted.has(n)) slot.names.add(n);
    }
  if (self === "base")
    for (const n of hoisted) {
      const imp = hoistDecl.get(n)!;
      const rec =
        bySpec.get(importText(imp)) ??
        bySpec.set(importText(imp), []).get(importText(imp))!;
      let slot = rec.find((r) => r.imp === imp);
      if (!slot) rec.push((slot = { imp, names: new Set() }));
      slot.names.add(n);
    }
  for (const [, slots] of bySpec)
    for (const { imp, names } of slots) {
      if (!names.size) continue;
      const clause = imp.importClause!;
      const typeOnly = clause.isTypeOnly;
      const parts: string[] = [];
      let def = "";
      let ns = "";
      for (const n of names) {
        if (n.startsWith("default ")) def = n.slice(8);
        else if (n.startsWith("* as ")) ns = n;
        else {
          const el = (
            clause.namedBindings as ts.NamedImports | undefined
          )?.elements?.find((e) => e.name.text === n);
          parts.push(el ? el.getText() : n);
        }
      }
      const bits = [
        def,
        ns,
        parts.length ? `{ ${parts.join(", ")} }` : "",
      ].filter(Boolean);
      out.push(
        `import ${typeOnly ? "type " : ""}${bits.join(", ")} from "${importText(imp)}";`,
      );
    }
  // the other parts
  const need = new Map<string, Set<string>>();
  for (const it of items)
    for (const use of it.uses) {
      const to = owner.get(byName(use)!.name)!;
      if (to !== self)
        (need.get(to) ?? need.set(to, new Set()).get(to)!).add(use);
    }
  if (self !== "base") {
    for (const it of items)
      for (const names of it.importNames.values())
        for (const n of names)
          if (hoisted.has(n))
            (need.get("base") ?? need.set("base", new Set()).get("base")!).add(
              n,
            );
  }
  for (const [to, names] of need)
    out.push(
      `import { ${[...names].sort().join(", ")} } from "./${prefix}${to}";`,
    );
  return out.join("\n");
}
for (const part of [...members.keys()].filter((p) => p !== "(kept)")) {
  const list = members
    .get(part)!
    .sort((a, b) => a.statements[0]!.getStart() - b.statements[0]!.getStart());
  const body = list
    .flatMap((n) => n.statements)
    .sort((a, b) => a.getStart() - b.getStart())
    .map((s) => textOf(s, readByOther.has(stmtNode.get(s)!.name)))
    .join("\n\n");
  const reexport =
    part === "base" && hoisted.size
      ? `\n\n${
          [...hoisted].some((n) => !typeOnlyNames.has(n))
            ? `export { ${[...hoisted]
                .filter((n) => !typeOnlyNames.has(n))
                .sort()
                .join(", ")} };\n`
            : ""
        }${
          [...hoisted].some((n) => typeOnlyNames.has(n))
            ? `export type { ${[...hoisted]
                .filter((n) => typeOnlyNames.has(n))
                .sort()
                .join(", ")} };\n`
            : ""
        }`
      : "";
  writeFileSync(
    fileOf(part),
    pruneImports(`${importsFor(list, part)}\n\n${body}${reexport}\n`),
  );
}
// the original: header, the imports its own statements need, a re-export per part, what stays
const keptNodes = members.get("(kept)") ?? [];
const keptItems = [
  ...keptNodes,
  ...kept.map((s) => {
    const it = {
      uses: new Set<string>(),
      imports: new Set<ts.ImportDeclaration>(),
      importNames: new Map<ts.ImportDeclaration, Set<string>>(),
    };
    scan(s, null, it);
    return it;
  }),
];
const first = sf.statements[0]!;
const header = text.slice(0, first.getStart());
const keptStatements = [
  ...keptNodes.flatMap((n) => n.statements),
  ...kept,
].sort((a, b) => a.getStart() - b.getStart());
const exports = [...members.keys()]
  .filter((p) => p !== "(kept)")
  .sort()
  .map((p) => `export * from "./${prefix}${p}";`);
writeFileSync(
  file,
  pruneImports(
    `${header}${importsFor(keptItems, "(kept)")}\n\n${exports.join("\n")}\n\n${keptStatements.map((s) => textOf(s, false)).join("\n\n")}\n`,
  ),
);
console.log(
  `wrote ${members.size - (members.has("(kept)") ? 1 : 0)} part files beside ${path.basename(file)}`,
);
