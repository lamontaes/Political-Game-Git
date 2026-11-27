/**
 * Splits one big module into named files by concern, structure only
 * (Elections item 6, EL4). Driven by a manifest of contiguous spans, each from
 * one declaration's name to another's. The script moves whole top-level
 * statements by name (never by line), unlisted names stay, and a listed name
 * that is missing fails the run.
 *
 *   node --import tsx scripts/elections/split-module.ts <manifest.json>
 *   node --import tsx scripts/elections/split-module.ts <manifest.json> --verify <git-ref>
 *
 * The first form rewrites the source and writes the part files (run prettier on
 * them after). The second form proves the move: every moved statement's text,
 * apart from an added `export`, is present once in the parts and the entry,
 * and nothing else changed; it reads the source as it was at <git-ref>.
 *
 * What moves where:
 * - A span's statements go to its part file in the source's folder, so every
 *   relative import path in them stays right.
 * - What the parts need from what stays in the entry goes to a base leaf
 *   (`base`), together with what that needs, so no part imports the entry.
 * - The entry keeps its imports (those it still uses), its module object, and
 *   re-exports each moved export by name, so no importer changes.
 * - A name used across files gains `export`; nothing else in the text changes.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { format } from "prettier";
import ts from "typescript";

interface Manifest {
  readonly source: string;
  readonly base: string;
  /** Names that stay in the entry; a part needing one is an error. */
  readonly entryOnly?: readonly string[];
  /**
   * Module specifiers whose imports are made once, in the base, and re-exported
   * from it: the parts and the entry import those names from the base, so the
   * split adds no new import of another family's file (the families guard
   * counts each file's own).
   */
  readonly funnel?: readonly string[];
  /**
   * A leaf with no imports for the source's dependency-free constants: every
   * top-level `const` that refers to no import and no other top-level
   * declaration (a kind name, a literal table, an empty cache) moves there, so
   * no file's load order can leave one uninitialized.
   */
  readonly leaf?: { readonly file: string; readonly about: string };
  readonly parts: readonly {
    readonly file: string;
    readonly about: string;
    readonly spans: readonly (readonly [string, string])[];
  }[];
}

const args = process.argv.slice(2);
const manifestPath = args[0];
if (!manifestPath)
  throw new Error("usage: split-module.ts <manifest.json> [--verify <ref>]");
const verifyRef = args.includes("--verify")
  ? args[args.indexOf("--verify") + 1]
  : undefined;
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
const ROOT = process.cwd();

function parse(file: string, text: string): ts.SourceFile {
  return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
}

/** The names a top-level statement declares. */
function declaredNames(st: ts.Statement): string[] {
  if (
    (ts.isFunctionDeclaration(st) ||
      ts.isInterfaceDeclaration(st) ||
      ts.isTypeAliasDeclaration(st) ||
      ts.isClassDeclaration(st) ||
      ts.isEnumDeclaration(st)) &&
    st.name
  )
    return [st.name.text];
  if (ts.isVariableStatement(st))
    return st.declarationList.declarations.flatMap((d) =>
      ts.isIdentifier(d.name) ? [d.name.text] : [],
    );
  return [];
}

const isTypeOnly = (st: ts.Statement) =>
  ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st);
const isExported = (st: ts.Statement) =>
  !!(
    ts.getCombinedModifierFlags(st as ts.Declaration) & ts.ModifierFlags.Export
  );

function stripExport(text: string): string {
  return text.replace(
    /^(\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*)export\s+(?!default\b)/,
    "$1",
  );
}

const sourcePath = path.join(ROOT, manifest.source);

if (verifyRef) {
  // Proof mode: the source as it was, against the parts and the entry as they are.
  const before = parse(
    manifest.source,
    execFileSync("git", ["show", `${verifyRef}:${manifest.source}`], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 1 << 28,
    }),
  );
  const files = [
    manifest.source,
    manifest.base,
    ...(manifest.leaf ? [manifest.leaf.file] : []),
    ...manifest.parts.map((p) => p.file),
  ];
  const body = (sf: ts.SourceFile) =>
    sf.statements
      .filter(
        (st) => !ts.isImportDeclaration(st) && !ts.isExportDeclaration(st),
      )
      .map((st) =>
        stripExport(
          sf.text
            .slice(st.getFullStart(), st.getEnd())
            .replace(/^\s*\/\*\*[^]*?split-module\.ts[^]*?\*\/\s*/, ""),
        ).trim(),
      );
  const was = body(before).sort();
  const now = files
    .flatMap((f) => body(parse(f, readFileSync(path.join(ROOT, f), "utf8"))))
    .sort();
  // The added `export` can make prettier reflow a long line, so both sides are
  // formatted the same way before they are compared.
  const norm = async (list: string[]) =>
    Promise.all(
      list.map(async (t) => {
        try {
          return (await format(t, { parser: "typescript" })).trim();
        } catch {
          return t.replace(/\s+/g, " ");
        }
      }),
    );
  const a = (await norm(was)).sort();
  const b = (await norm(now)).sort();
  const missing = a.filter((s, i) => s !== b[i]);
  if (a.length !== b.length || missing.length) {
    const left = new Map<string, number>();
    for (const s of a) left.set(s, (left.get(s) ?? 0) + 1);
    for (const s of b) left.set(s, (left.get(s) ?? 0) - 1);
    const diff = [...left].filter(([, n]) => n !== 0);
    console.error(
      `verify: ${diff.length} statement(s) differ (${a.length} before, ${b.length} after)`,
    );
    for (const [s] of diff.slice(0, 5)) console.error(`  ${s.slice(0, 160)}`);
    process.exit(1);
  }
  console.log(
    `verify: ${a.length} statements, each moved text identical to its text at ${verifyRef}`,
  );
  process.exit(0);
}

const text = readFileSync(sourcePath, "utf8");
const sf = parse(manifest.source, text);
const sts = [...sf.statements];

// The anchors must exist; a run on an already-split source says so and stops.
const firstIndex = (name: string) =>
  sts.findIndex((st) => declaredNames(st).includes(name));
const lastIndex = (name: string) => {
  for (let i = sts.length - 1; i >= 0; i -= 1)
    if (declaredNames(sts[i]!).includes(name)) return i;
  return -1;
};
const missingAnchors = manifest.parts.flatMap((p) =>
  p.spans.flatMap(([from, to]) => [from, to].filter((n) => firstIndex(n) < 0)),
);
if (
  missingAnchors.length === manifest.parts.flatMap((p) => p.spans.flat()).length
) {
  console.log(
    `${manifest.source} holds none of the listed names: already split`,
  );
  process.exit(0);
}
if (missingAnchors.length)
  throw new Error(
    `listed names not found in ${manifest.source}: ${missingAnchors.join(", ")}`,
  );

/** owner[i]: the file a statement belongs to. */
const ENTRY = manifest.source;
const owner: string[] = sts.map(() => ENTRY);
for (const part of manifest.parts)
  for (const [from, to] of part.spans) {
    const a = firstIndex(from);
    const b = lastIndex(to);
    if (a < 0 || b < a)
      throw new Error(`span ${from}..${to} is empty or backwards`);
    for (let i = a; i <= b; i += 1) {
      const st = sts[i]!;
      if (ts.isImportDeclaration(st) || ts.isExportDeclaration(st))
        throw new Error(
          `span ${from}..${to} holds an import or export declaration`,
        );
      if (owner[i] !== ENTRY)
        throw new Error(`${from}..${to} overlaps ${owner[i]}`);
      owner[i] = part.file;
    }
  }

// Resolve each identifier to a top-level statement or an import specifier.
const host = ts.createCompilerHost({});
const baseGet = host.getSourceFile.bind(host);
host.getSourceFile = (name, lang) =>
  name === sourcePath ? sf : baseGet(name, lang);
const program = ts.createProgram(
  [sourcePath],
  {
    noResolve: true,
    noLib: true,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    skipLibCheck: true,
  },
  host,
);
const checker = program.getTypeChecker();
const programSf = program.getSourceFile(sourcePath)!;
const stIndexOf = new Map<ts.Node, number>();
programSf.statements.forEach((st, i) => stIndexOf.set(st, i));

interface Ref {
  readonly stmts: Set<number>;
  readonly imports: Set<
    ts.ImportSpecifier | ts.ImportClause | ts.NamespaceImport
  >;
}
const refsOf: Ref[] = sts.map(() => ({ stmts: new Set(), imports: new Set() }));
/** writes[i]: top-level statements whose binding statement i assigns (a `let` is only assigned in its own file). */
const writes: Set<number>[] = sts.map(() => new Set());
const topOf = (node: ts.Node): ts.Node | undefined => {
  let n: ts.Node | undefined = node;
  while (n && n.parent && n.parent !== programSf) n = n.parent;
  return n && n.parent === programSf ? n : undefined;
};
/** Whether an identifier is the target of an assignment or an increment. */
function isAssignedTo(id: ts.Identifier): boolean {
  const p = id.parent;
  if (
    ts.isBinaryExpression(p) &&
    p.left === id &&
    p.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
    p.operatorToken.kind <= ts.SyntaxKind.LastAssignment
  )
    return true;
  return (
    (ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p)) &&
    (p.operator === ts.SyntaxKind.PlusPlusToken ||
      p.operator === ts.SyntaxKind.MinusMinusToken)
  );
}
function visit(node: ts.Node, index: number): void {
  if (ts.isIdentifier(node)) {
    let symbol = checker.getSymbolAtLocation(node);
    if (node.parent && ts.isShorthandPropertyAssignment(node.parent))
      symbol = checker.getShorthandAssignmentValueSymbol(node.parent) ?? symbol;
    // `export { name }` of a local or an import names that binding.
    if (
      node.parent &&
      ts.isExportSpecifier(node.parent) &&
      !node.parent.parent.parent.moduleSpecifier
    )
      symbol =
        checker.getExportSpecifierLocalTargetSymbol(node.parent) ?? symbol;
    for (const decl of symbol?.declarations ?? []) {
      if (
        ts.isImportSpecifier(decl) ||
        ts.isImportClause(decl) ||
        ts.isNamespaceImport(decl)
      )
        refsOf[index]!.imports.add(decl);
      else {
        const top = topOf(decl);
        if (top && isAssignedTo(node)) {
          const at = stIndexOf.get(top);
          if (at !== undefined && at !== index) writes[index]!.add(at);
        }
        // Only a binding that is itself a top-level declaration counts, never
        // a member of one (a property read off a typed value).
        const direct =
          top !== undefined &&
          (decl === top ||
            (ts.isVariableDeclaration(decl) && decl.parent.parent === top));
        const at = top && direct ? stIndexOf.get(top) : undefined;
        if (at !== undefined && at !== index) refsOf[index]!.stmts.add(at);
      }
    }
  }
  ts.forEachChild(node, (child) => visit(child, index));
}
programSf.statements.forEach((st, i) => {
  if (!ts.isImportDeclaration(st)) visit(st, i);
});

// The dependency-free constants go to the leaf, wherever they sat.
const LEAF = manifest.leaf?.file;
if (LEAF)
  sts.forEach((st, i) => {
    if (
      ts.isVariableStatement(st) &&
      st.declarationList.flags & ts.NodeFlags.Const &&
      refsOf[i]!.stmts.size === 0 &&
      refsOf[i]!.imports.size === 0 &&
      !declaredNames(st).some((n) => (manifest.entryOnly ?? []).includes(n))
    )
      owner[i] = LEAF;
  });

// What the parts need from the entry moves to the base, with what that needs.
const entryOnly = new Set(manifest.entryOnly ?? []);
const BASE = manifest.base;
let grew = true;
while (grew) {
  grew = false;
  for (let i = 0; i < sts.length; i += 1) {
    if (owner[i] === ENTRY) continue;
    for (const j of refsOf[i]!.stmts) {
      if (owner[j] !== ENTRY) continue;
      const st = sts[j]!;
      if (ts.isExportDeclaration(st))
        throw new Error(`a moved statement uses an export declaration at ${j}`);
      const names = declaredNames(st);
      const held = names.find((n) => entryOnly.has(n));
      if (held)
        throw new Error(
          `${held} is entry-only but ${declaredNames(sts[i]!).join(",")} (${owner[i]}) uses it`,
        );
      owner[j] = BASE;
      grew = true;
    }
  }
}

// A top-level binding that is assigned stays in the file that assigns it.
for (let i = 0; i < sts.length; i += 1)
  for (const j of writes[i]!)
    if (owner[j] !== owner[i])
      throw new Error(
        `${declaredNames(sts[i]!).join(",")} (${owner[i]}) assigns ${declaredNames(sts[j]!).join(",")} (${owner[j]}); keep them in one file`,
      );

// Which names cross files, so they gain `export`.
const crossed = new Set<number>();
for (let i = 0; i < sts.length; i += 1)
  for (const j of refsOf[i]!.stmts)
    if (owner[j] !== owner[i] && !isExported(sts[j]!)) crossed.add(j);

const importDecls = sts.filter(ts.isImportDeclaration);
const funnel = new Set(manifest.funnel ?? []);
const funnelled = (decl: ts.ImportDeclaration) =>
  ts.isStringLiteral(decl.moduleSpecifier) &&
  funnel.has(decl.moduleSpecifier.text);
/** The names the other files take from the base for the funnelled imports they use. */
function funnelNames(
  used: Set<ts.Node>,
  into: { value: Set<string>; type: Set<string> },
): void {
  for (const node of used) {
    const decl = ts.findAncestor(node, ts.isImportDeclaration);
    if (!decl || !funnelled(decl)) continue;
    const typeOnly = !!decl.importClause?.isTypeOnly;
    if (ts.isImportSpecifier(node)) {
      (typeOnly || node.isTypeOnly ? into.type : into.value).add(
        node.getText().replace(/^type\s+/, ""),
      );
    } else {
      throw new Error(`funnel supports named imports only: ${decl.getText()}`);
    }
  }
}
function importText(
  decl: ts.ImportDeclaration,
  used: Set<ts.Node>,
  file: string,
): string | null {
  if (funnelled(decl) && file !== manifest.base) return null;
  const clause = decl.importClause;
  const spec = decl.moduleSpecifier.getText();
  const attrs = decl.attributes ? ` ${decl.attributes.getText()}` : "";
  if (!clause) return null; // a side-effect import stays in the entry only
  const parts: string[] = [];
  if (clause.name && used.has(clause)) parts.push(clause.name.text);
  const nb = clause.namedBindings;
  if (nb && ts.isNamespaceImport(nb) && used.has(nb))
    parts.push(`* as ${nb.name.text}`);
  if (nb && ts.isNamedImports(nb)) {
    const keep = nb.elements.filter((e) => used.has(e)).map((e) => e.getText());
    if (keep.length) parts.push(`{ ${keep.join(", ")} }`);
  }
  if (!parts.length) return null;
  return `import ${clause.isTypeOnly ? "type " : ""}${parts.join(", ")} from ${spec}${attrs};`;
}

/** Every import some file other than the base uses. */
const usedOutsideBase = new Set<ts.Node>();
sts.forEach((st, i) => {
  if (owner[i] !== BASE && !ts.isImportDeclaration(st))
    for (const imp of refsOf[i]!.imports) usedOutsideBase.add(imp);
});

const out = new Map<string, string>();
const fileOf = (name: string) => `./${path.basename(name, ".ts")}`;

function build(file: string, header: string): string {
  const mine = sts.map((_, i) => i).filter((i) => owner[i] === file);
  const used = new Set<ts.Node>();
  const siblings = new Map<string, { value: Set<string>; type: Set<string> }>();
  for (const i of mine) {
    for (const imp of refsOf[i]!.imports) used.add(imp);
    for (const j of refsOf[i]!.stmts) {
      if (owner[j] === file) continue;
      const entry = siblings.get(owner[j]!) ?? {
        value: new Set(),
        type: new Set(),
      };
      for (const n of declaredNames(sts[j]!))
        (isTypeOnly(sts[j]!) ? entry.type : entry.value).add(n);
      siblings.set(owner[j]!, entry);
    }
  }
  if (file !== BASE) {
    const f = { value: new Set<string>(), type: new Set<string>() };
    funnelNames(used, f);
    if (f.value.size || f.type.size) {
      const e = siblings.get(BASE) ?? {
        value: new Set<string>(),
        type: new Set<string>(),
      };
      f.value.forEach((n) => e.value.add(n));
      f.type.forEach((n) => e.type.add(n));
      siblings.set(BASE, e);
    }
  }
  const lines: string[] = [];
  const baseExports: string[] = [];
  if (file === BASE) {
    // One statement per funnelled module: the base imports what the others
    // use and exports it by name, so the families guard counts it once.
    for (const decl of importDecls) {
      if (!funnelled(decl)) continue;
      const mine = [...usedOutsideBase].filter(
        (n) => ts.findAncestor(n, ts.isImportDeclaration) === decl,
      );
      for (const n of mine) used.add(n);
      const names = { value: new Set<string>(), type: new Set<string>() };
      funnelNames(new Set(mine), names);
      if (names.value.size)
        baseExports.push(`export { ${[...names.value].sort().join(", ")} };`);
      if (names.type.size)
        baseExports.push(
          `export type { ${[...names.type].sort().join(", ")} };`,
        );
    }
  }
  for (const decl of importDecls) {
    const t = importText(decl, used, file);
    if (t) lines.push(t);
  }
  for (const [other, names] of [...siblings].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (names.value.size)
      lines.push(
        `import { ${[...names.value].sort().join(", ")} } from "${fileOf(other)}";`,
      );
    if (names.type.size)
      lines.push(
        `import type { ${[...names.type].sort().join(", ")} } from "${fileOf(other)}";`,
      );
  }
  const bodies = mine.map((i) => {
    const st = sts[i]!;
    let t = text.slice(st.getFullStart(), st.getEnd());
    if (crossed.has(i)) {
      // Add `export` to the statement itself, after its leading comments.
      const at = st.getStart() - st.getFullStart();
      t = `${t.slice(0, at)}export ${t.slice(at)}`;
    }
    return t;
  });
  return `${header}\n${lines.join("\n")}\n${baseExports.join("\n")}\n${bodies.join("")}\n`;
}

for (const part of manifest.parts)
  out.set(
    part.file,
    build(
      part.file,
      `/**\n * ${part.about}\n *\n * Split out of ${path.basename(manifest.source)} by scripts/elections/split-module.ts (structure only);\n * ${path.basename(manifest.source)} re-exports every export of this file by name.\n */`,
    ),
  );
if (LEAF && owner.includes(LEAF))
  out.set(
    LEAF,
    build(
      LEAF,
      `/**\n * ${manifest.leaf!.about}\n *\n * Imports nothing, so no load order can find one of these uninitialized (scripts/elections/split-module.ts).\n * ${path.basename(manifest.source)} re-exports every export of this file by name.\n */`,
    ),
  );
if (owner.includes(BASE) || funnel.size)
  out.set(
    BASE,
    build(
      BASE,
      `/**\n * What the parts of ${path.basename(manifest.source)} share: the declarations more than one of\n * them read, moved here so no part imports the entry (scripts/elections/split-module.ts).\n */`,
    ),
  );

// The entry: what stays, the imports it still uses, imports from the parts,
// and a re-export for every moved export.
{
  const mine = sts.map((_, i) => i).filter((i) => owner[i] === ENTRY);
  const used = new Set<ts.Node>();
  const fromFiles = new Map<
    string,
    { value: Set<string>; type: Set<string> }
  >();
  for (const i of mine) {
    const st = sts[i]!;
    if (ts.isImportDeclaration(st)) continue;
    for (const imp of refsOf[i]!.imports) used.add(imp);
    for (const j of refsOf[i]!.stmts) {
      if (owner[j] === ENTRY) continue;
      const entry = fromFiles.get(owner[j]!) ?? {
        value: new Set(),
        type: new Set(),
      };
      for (const n of declaredNames(sts[j]!))
        (isTypeOnly(sts[j]!) ? entry.type : entry.value).add(n);
      fromFiles.set(owner[j]!, entry);
    }
  }
  {
    const f = { value: new Set<string>(), type: new Set<string>() };
    funnelNames(used, f);
    if (f.value.size || f.type.size) {
      const e = fromFiles.get(BASE) ?? {
        value: new Set<string>(),
        type: new Set<string>(),
      };
      f.value.forEach((n) => e.value.add(n));
      f.type.forEach((n) => e.type.add(n));
      fromFiles.set(BASE, e);
    }
  }
  const imports: string[] = [];
  for (const decl of importDecls) {
    if (!decl.importClause) {
      imports.push(decl.getText());
      continue;
    }
    const t = importText(decl, used, ENTRY);
    if (t) imports.push(t);
  }
  for (const [other, names] of [...fromFiles].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (names.value.size)
      imports.push(
        `import { ${[...names.value].sort().join(", ")} } from "${fileOf(other)}";`,
      );
    if (names.type.size)
      imports.push(
        `import type { ${[...names.type].sort().join(", ")} } from "${fileOf(other)}";`,
      );
  }
  const reexports: string[] = [];
  for (const file of [
    ...manifest.parts.map((p) => p.file),
    ...(LEAF ? [LEAF] : []),
    BASE,
  ]) {
    const values: string[] = [];
    const types: string[] = [];
    sts.forEach((st, i) => {
      if (owner[i] !== file || !isExported(st)) return;
      for (const n of declaredNames(st))
        (isTypeOnly(st) ? types : values).push(n);
    });
    if (values.length)
      reexports.push(
        `export { ${values.sort().join(", ")} } from "${fileOf(file)}";`,
      );
    if (types.length)
      reexports.push(
        `export type { ${types.sort().join(", ")} } from "${fileOf(file)}";`,
      );
  }
  const leading = text.slice(
    0,
    sts.find((s) => !ts.isImportDeclaration(s))!.getFullStart(),
  );
  const headerEnd = importDecls.length ? importDecls[0]!.getFullStart() : 0;
  const header = text.slice(0, headerEnd);
  void leading;
  const bodies = mine
    .filter((i) => !ts.isImportDeclaration(sts[i]!))
    .map((i) => {
      const st = sts[i]!;
      let t = text.slice(st.getFullStart(), st.getEnd());
      if (crossed.has(i)) {
        const at = st.getStart() - st.getFullStart();
        t = `${t.slice(0, at)}export ${t.slice(at)}`;
      }
      return t;
    });
  out.set(
    ENTRY,
    `${header}${imports.join("\n")}\n${reexports.join("\n")}\n${bodies.join("")}\n`,
  );
}

for (const [file, content] of out)
  writeFileSync(path.join(ROOT, file), content);
const sizes = [...out].map(([f, c]) => `${f} ${c.split("\n").length}`);
console.log(`wrote ${out.size} files:\n  ${sizes.join("\n  ")}`);
if (!existsSync(path.join(ROOT, BASE)))
  console.log("no shared base was needed");
