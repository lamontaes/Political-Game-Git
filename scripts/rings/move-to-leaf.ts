/**
 * Moves named top-level declarations out of a hub file into a leaf file, as
 * they are, so importers that take only those names stop importing the hub
 * (the Rings work, Nov 28: the import rings in src/core2 shrink when a hub's
 * pure reads live in a leaf that imports nothing in the ring).
 *
 * Structure only: each declaration's text (its doc comment included) is cut
 * from the hub and pasted into the leaf unchanged. The hub imports back what
 * its remaining code uses and re-exports what it exported, so every other
 * caller keeps working. The importers named with --switch, or found by
 * --auto (a source file outside tests whose run-time imports from the hub
 * are all moved names), get their import's path pointed at the leaf; their
 * type imports stay on the hub.
 *
 *   node --import tsx scripts/rings/move-to-leaf.ts --hub src/core2/modules/residents.ts \
 *     --leaf src/core2/residents-reads.ts --names a,b,c --doc "One line." \
 *     [--skip file,file] [--write]
 *
 * Without --write it prints the plan. Re-runnable on a later base: it reads
 * the files as they are.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve(import.meta.dirname, "../..");
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? undefined : process.argv[i + 1];
};
const hub = arg("hub")!;
const leaf = arg("leaf")!;
const names = new Set(arg("names")!.split(","));
const skip = new Set((arg("skip") ?? "").split(",").filter(Boolean));
const doc = arg("doc") ?? "";
const write = process.argv.includes("--write");

const read = (f: string) => readFileSync(path.join(ROOT, f), "utf8");
const parse = (f: string, text = read(f)) =>
  ts.createSourceFile(f, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);

/** A relative import path from one repository file to another, as the repo writes them (no extension). */
function spec(from: string, to: string): string {
  let rel = path.posix
    .relative(path.posix.dirname(from), to)
    .replace(/\.ts$/, "");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}
function resolves(from: string, s: string, to: string): boolean {
  if (!s.startsWith(".")) return false;
  const base = path.posix.normalize(
    path.posix.join(path.posix.dirname(from), s),
  );
  return [base, `${base}.ts`, base.replace(/\.js$/, ".ts")].includes(to);
}

const hubText = read(hub);
const hubSf = parse(hub, hubText);

/** Top-level names a statement declares. */
function declared(st: ts.Statement): string[] {
  if (
    (ts.isFunctionDeclaration(st) ||
      ts.isClassDeclaration(st) ||
      ts.isEnumDeclaration(st) ||
      ts.isInterfaceDeclaration(st) ||
      ts.isTypeAliasDeclaration(st)) &&
    st.name
  )
    return [st.name.text];
  if (ts.isVariableStatement(st))
    return st.declarationList.declarations.flatMap((d) =>
      ts.isIdentifier(d.name) ? [d.name.text] : [],
    );
  return [];
}
const isExported = (st: ts.Statement) =>
  !!ts
    .getModifiers(st as ts.HasModifiers)
    ?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

const moved: ts.Statement[] = [];
const hubLocals = new Map<string, ts.Statement>();
for (const st of hubSf.statements)
  for (const n of declared(st)) hubLocals.set(n, st);
for (const n of names) {
  const st = hubLocals.get(n);
  if (!st) throw new Error(`${hub} declares no top-level ${n}`);
  if (declared(st).some((d) => !names.has(d)))
    throw new Error(
      `${n} shares its statement with ${declared(st)}; name them all`,
    );
  if (!moved.includes(st)) moved.push(st);
}
moved.sort((a, b) => a.pos - b.pos);

/** Every identifier a node mentions, with whether it sits in a type position. */
function mentions(node: ts.Node): Map<string, "value" | "type"> {
  const out = new Map<string, "value" | "type">();
  const visit = (n: ts.Node, inType: boolean) => {
    const typeHere = inType || ts.isTypeNode(n) || ts.isHeritageClause(n);
    if (ts.isIdentifier(n)) {
      const p = n.parent;
      const isName =
        (ts.isPropertyAccessExpression(p) && p.name === n) ||
        (ts.isQualifiedName(p) && p.right === n) ||
        ((ts.isPropertyAssignment(p) ||
          ts.isPropertyDeclaration(p) ||
          ts.isMethodDeclaration(p) ||
          ts.isPropertySignature(p) ||
          ts.isMethodSignature(p) ||
          ts.isGetAccessor(p) ||
          ts.isSetAccessor(p) ||
          ts.isEnumMember(p) ||
          ts.isParameter(p) ||
          ts.isBindingElement(p) ||
          ts.isVariableDeclaration(p) ||
          ts.isFunctionDeclaration(p) ||
          ts.isTypeParameterDeclaration(p)) &&
          (p as { name?: ts.Node }).name === n);
      if (!isName || ts.isShorthandPropertyAssignment(p)) {
        const prior = out.get(n.text);
        if (prior !== "value") out.set(n.text, typeHere ? "type" : "value");
      }
      // A binding element's property name (`{ a: b }`) is not a reference.
    }
    ts.forEachChild(n, (c) => visit(c, typeHere));
  };
  visit(node, false);
  return out;
}

/** The hub's imports: local name -> where it comes from and whether it is type-only. */
type Binding = {
  module: string;
  imported: string;
  typeOnly: boolean;
  decl: ts.ImportDeclaration;
};
const hubImports = new Map<string, Binding>();
for (const st of hubSf.statements) {
  if (!ts.isImportDeclaration(st) || !st.importClause) continue;
  const module = (st.moduleSpecifier as ts.StringLiteral).text;
  const cl = st.importClause;
  if (cl.name)
    hubImports.set(cl.name.text, {
      module,
      imported: "default",
      typeOnly: cl.isTypeOnly,
      decl: st,
    });
  const nb = cl.namedBindings;
  if (nb && ts.isNamedImports(nb))
    for (const e of nb.elements)
      hubImports.set(e.name.text, {
        module,
        imported: (e.propertyName ?? e.name).text,
        typeOnly: cl.isTypeOnly || e.isTypeOnly,
        decl: st,
      });
  if (nb && ts.isNamespaceImport(nb))
    hubImports.set(nb.name.text, {
      module: `* as ${nb.name.text}|${module}`,
      imported: "*",
      typeOnly: cl.isTypeOnly,
      decl: st,
    });
}

// What the moved code needs.
const need = new Map<string, "value" | "type">();
for (const st of moved)
  for (const [n, k] of mentions(st))
    if (need.get(n) !== "value") need.set(n, k);
const leafImports = new Map<
  string,
  Map<string, { local: string; typeOnly: boolean }>
>();
const addLeafImport = (
  module: string,
  imported: string,
  local: string,
  typeOnly: boolean,
) => {
  const m = leafImports.get(module) ?? new Map();
  const prior = m.get(local);
  m.set(local, {
    local: imported === local ? local : `${imported} as ${local}`,
    typeOnly: typeOnly && (prior?.typeOnly ?? true),
  });
  leafImports.set(module, m);
};
const problems: string[] = [];
for (const [n, kind] of need) {
  if (names.has(n)) continue;
  const b = hubImports.get(n);
  if (b) {
    if (b.imported === "*") problems.push(`namespace import ${n}`);
    const module = b.module.startsWith(".")
      ? spec(
          leaf,
          path.posix.normalize(
            path.posix.join(path.posix.dirname(hub), b.module),
          ),
        )
      : b.module;
    // A name the hub imports from the leaf itself is already there.
    if (module === spec(leaf, leaf)) continue;
    addLeafImport(module, b.imported, n, b.typeOnly || kind === "type");
    continue;
  }
  const local = hubLocals.get(n);
  if (local) {
    const isType =
      ts.isInterfaceDeclaration(local) || ts.isTypeAliasDeclaration(local);
    if (!isType || kind === "value")
      problems.push(`moved code uses ${n}, which stays in the hub`);
    else if (!isExported(local))
      problems.push(`moved code uses the hub's unexported type ${n}`);
    else addLeafImport(spec(leaf, hub), n, n, true);
  }
}

// Text pieces: each moved statement with its leading doc comment.
const pieceStart = (st: ts.Statement) => {
  const ranges = ts.getLeadingCommentRanges(hubText, st.pos) ?? [];
  // Keep the comments right above the declaration (no blank line between).
  let start = st.getStart(hubSf);
  for (let i = ranges.length - 1; i >= 0; i--) {
    const between = hubText.slice(ranges[i]!.end, start);
    if (/\n\s*\n/.test(between)) break;
    start = ranges[i]!.pos;
  }
  return start;
};
const pieces = moved.map((st) => {
  const start = pieceStart(st);
  const text = hubText.slice(start, st.getEnd());
  return { start, end: st.getEnd(), text, st };
});

// The hub without the moved pieces.
let rest = hubText;
for (const p of [...pieces].reverse()) {
  let end = p.end;
  while (rest[end] === "\n" && rest[end + 1] === "\n") end++;
  rest = rest.slice(0, p.start) + rest.slice(end);
}
const restSf = parse(hub, rest);
const restMentions = new Map<string, "value" | "type">();
for (const st of restSf.statements) {
  // `export { a } from "./b"` names b's a, not the hub's import of a.
  if (
    ts.isImportDeclaration(st) ||
    (ts.isExportDeclaration(st) && st.moduleSpecifier)
  )
    continue;
  for (const [n, k] of mentions(st))
    if (restMentions.get(n) !== "value") restMentions.set(n, k);
}
const exportedMoved = moved.filter(isExported).flatMap(declared);
const usedBack = [...names].filter((n) => restMentions.has(n));

// Drop hub imports that nothing left uses.
const dropSpecifiers = new Set<string>();
for (const [n] of hubImports) if (!restMentions.has(n)) dropSpecifiers.add(n);
// Names re-exported by an `export { x }` without a source count as used.
for (const st of restSf.statements)
  if (
    ts.isExportDeclaration(st) &&
    !st.moduleSpecifier &&
    st.exportClause &&
    ts.isNamedExports(st.exportClause)
  )
    for (const e of st.exportClause.elements)
      dropSpecifiers.delete((e.propertyName ?? e.name).text);

function rewriteImports(text: string): string {
  const sf = parse(hub, text);
  const edits: { start: number; end: number; text: string }[] = [];
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !st.importClause) continue;
    const cl = st.importClause;
    const nb = cl.namedBindings;
    const defaultGone = cl.name && dropSpecifiers.has(cl.name.text);
    if (nb && ts.isNamedImports(nb)) {
      const keep = nb.elements.filter((e) => !dropSpecifiers.has(e.name.text));
      if (keep.length === nb.elements.length && !defaultGone) continue;
      if (keep.length === 0 && (!cl.name || defaultGone)) {
        let end = st.getEnd();
        if (text[end] === "\n") end++;
        edits.push({ start: st.getStart(sf), end, text: "" });
      } else {
        edits.push({
          start: nb.getStart(sf),
          end: nb.getEnd(),
          text: `{ ${keep.map((e) => e.getText(sf)).join(", ")} }`,
        });
        if (defaultGone)
          problems.push(`default import ${cl.name!.text} unused but kept`);
      }
    } else if (
      defaultGone ||
      (nb && ts.isNamespaceImport(nb) && dropSpecifiers.has(nb.name.text))
    ) {
      let end = st.getEnd();
      if (text[end] === "\n") end++;
      edits.push({ start: st.getStart(sf), end, text: "" });
    }
  }
  for (const e of edits.sort((a, b) => b.start - a.start))
    text = text.slice(0, e.start) + e.text + text.slice(e.end);
  return text;
}
rest = rewriteImports(rest);

// Insert the hub's import of the leaf (and re-export) after its last import.
{
  const sf = parse(hub, rest);
  const lastImport = [...sf.statements].filter(ts.isImportDeclaration).pop();
  const at = lastImport ? lastImport.getEnd() : 0;
  const leafSpec = spec(hub, leaf);
  const lines: string[] = [];
  // A moved type comes back with `type`, so the import and re-export erase it.
  const isTypeName = (n: string) => {
    const st = hubLocals.get(n)!;
    return ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st);
  };
  const named = (list: string[]) =>
    list
      .sort()
      .map((n) => (isTypeName(n) ? `type ${n}` : n))
      .join(", ");
  if (usedBack.length)
    lines.push(`import { ${named(usedBack)} } from "${leafSpec}";`);
  if (exportedMoved.length)
    lines.push(`export { ${named(exportedMoved)} } from "${leafSpec}";`);
  rest = rest.slice(0, at) + "\n" + lines.join("\n") + rest.slice(at);
}

// The leaf.
const importLines = [...leafImports]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([module, m]) => {
    const all = [...m.values()];
    const def = all.find((x) => x.local.startsWith("default as "));
    if (def) {
      if (all.length > 1)
        problems.push(`default and named imports from ${module}`);
      const attr = module.endsWith(".json") ? ` with { type: "json" }` : "";
      return `import ${def.local.slice("default as ".length)} from "${module}"${attr};`;
    }
    if (all.every((x) => x.typeOnly))
      return `import type { ${all.map((x) => x.local).join(", ")} } from "${module}";`;
    return `import { ${all.map((x) => (x.typeOnly ? `type ${x.local}` : x.local)).join(", ")} } from "${module}";`;
  });
const leafPath = path.join(ROOT, leaf);
const appending = process.argv.includes("--append");
if (appending && !existsSync(leafPath))
  throw new Error(`--append needs ${leaf} to exist`);
const movedText = pieces
  .map((p) =>
    // An unexported declaration the hub still uses is exported for it.
    !isExported(p.st) && declared(p.st).some((n) => usedBack.includes(n))
      ? p.text.replace(
          /^((?:\/\*[\s\S]*?\*\/|\/\/[^\n]*)\s*)*/,
          (m) => `${m}export `,
        )
      : p.text,
  )
  .join("\n\n");
/** Appending to a leaf that exists adds the imports it lacks and the pieces at its end. */
function appendTo(existing: string): string {
  const sf = parse(leaf, existing);
  const lastImport = [...sf.statements].filter(ts.isImportDeclaration).pop();
  // With no import yet, the new ones go after the leaf's opening doc comment.
  const leadingDoc = /^\/\*\*[\s\S]*?\*\/\n/.exec(existing);
  const at = lastImport
    ? lastImport.getEnd()
    : leadingDoc
      ? leadingDoc[0].length - 1
      : 0;
  // A name the leaf already imports is not imported twice.
  const have = new Set<string>();
  for (const st of sf.statements)
    if (ts.isImportDeclaration(st) && st.importClause) {
      const cl = st.importClause;
      if (cl.name) have.add(cl.name.text);
      if (cl.namedBindings && ts.isNamedImports(cl.namedBindings))
        for (const e of cl.namedBindings.elements) have.add(e.name.text);
    }
  const added = [...leafImports]
    .map(([module, m]) => {
      const fresh = [...m.values()].filter(
        (x) => !have.has(x.local.split(" as ").pop()!),
      );
      if (!fresh.length) return "";
      return fresh.every((x) => x.typeOnly)
        ? `import type { ${fresh.map((x) => x.local).join(", ")} } from "${module}";`
        : `import { ${fresh.map((x) => (x.typeOnly ? `type ${x.local}` : x.local)).join(", ")} } from "${module}";`;
    })
    .filter(Boolean);
  return (
    existing.slice(0, at) +
    (added.length ? "\n" + added.join("\n") : "") +
    existing.slice(at).replace(/\n*$/, "\n\n") +
    movedText +
    "\n"
  );
}
const leafText = appending
  ? appendTo(readFileSync(leafPath, "utf8"))
  : [`/**\n * ${doc}\n */`, ...importLines, "", movedText, ""].join("\n");

// Importers to switch.
const files = execFileSync("git", ["ls-files", "src"], {
  cwd: ROOT,
  encoding: "utf8",
})
  .split("\n")
  .filter(
    (f) =>
      /\.(ts|tsx)$/.test(f) &&
      !/\.d\.ts$/.test(f) &&
      !/\.(test|spec|browser)\.(ts|tsx)$/.test(f) &&
      f !== hub &&
      f !== leaf,
  );
const switchFile = arg("switch-from");
const only = switchFile
  ? readFileSync(switchFile, "utf8").split("\n").filter(Boolean)
  : arg("switch")?.split(",");
const switched: string[] = [];
const fileEdits = new Map<string, string>();
for (const f of only ?? files) {
  if (skip.has(f)) continue;
  const text = read(f);
  if (!text.includes(path.posix.basename(hub, ".ts"))) continue;
  const sf = parse(f, text);
  const decls = sf.statements.filter(
    (st): st is ts.ImportDeclaration | ts.ExportDeclaration =>
      (ts.isImportDeclaration(st) || ts.isExportDeclaration(st)) &&
      !!st.moduleSpecifier &&
      resolves(f, (st.moduleSpecifier as ts.StringLiteral).text, hub),
  );
  if (!decls.length) continue;
  // Run-time names this file takes from the hub.
  const valueNames: string[] = [];
  let other = false;
  for (const d of decls) {
    if (ts.isImportDeclaration(d)) {
      const cl = d.importClause;
      if (!cl || cl.isTypeOnly) continue;
      if (
        cl.name ||
        (cl.namedBindings && ts.isNamespaceImport(cl.namedBindings))
      )
        other = true;
      if (cl.namedBindings && ts.isNamedImports(cl.namedBindings))
        for (const e of cl.namedBindings.elements)
          if (!e.isTypeOnly) valueNames.push((e.propertyName ?? e.name).text);
    } else {
      if (d.isTypeOnly) continue;
      if (!d.exportClause || !ts.isNamedExports(d.exportClause)) other = true;
      else
        for (const e of d.exportClause.elements)
          if (!e.isTypeOnly) valueNames.push((e.propertyName ?? e.name).text);
    }
  }
  if (other || !valueNames.length || !valueNames.every((n) => names.has(n)))
    continue;
  // Value specifiers go to the leaf; type specifiers stay on the hub.
  const leafSpec = spec(f, leaf);
  const edits: { start: number; end: number; text: string }[] = [];
  for (const d of decls) {
    const s = d.moduleSpecifier as ts.StringLiteral;
    const elements = ts.isImportDeclaration(d)
      ? d.importClause?.namedBindings &&
        ts.isNamedImports(d.importClause.namedBindings)
        ? d.importClause.namedBindings.elements
        : undefined
      : d.exportClause && ts.isNamedExports(d.exportClause)
        ? d.exportClause.elements
        : undefined;
    const wholeType = ts.isImportDeclaration(d)
      ? d.importClause?.isTypeOnly
      : d.isTypeOnly;
    if (wholeType || !elements) continue;
    const types = elements.filter((e) => e.isTypeOnly);
    if (!types.length) {
      edits.push({
        start: s.getStart(sf),
        end: s.getEnd(),
        text: `"${leafSpec}"`,
      });
      continue;
    }
    const values = elements.filter((e) => !e.isTypeOnly);
    const kw = ts.isImportDeclaration(d) ? "import" : "export";
    const typeDecl = `${kw} type { ${types.map((e) => e.getText(sf).replace(/^type\s+/, "")).join(", ")} } from ${s.getText(sf)};`;
    const valueDecl = `${kw} { ${values.map((e) => e.getText(sf)).join(", ")} } from "${leafSpec}";`;
    edits.push({
      start: d.getStart(sf),
      end: d.getEnd(),
      text: `${typeDecl}\n${valueDecl}`,
    });
  }
  let out = text;
  for (const e of edits.sort((a, b) => b.start - a.start))
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  fileEdits.set(f, out);
  switched.push(`${f} {${valueNames.join(", ")}}`);
}

console.log(`moved ${moved.length} statements (${[...names].join(", ")})`);
console.log(`leaf imports:\n  ${importLines.join("\n  ")}`);
console.log(`hub imports back: ${usedBack.join(", ")}`);
console.log(`hub drops imports: ${[...dropSpecifiers].join(", ")}`);
console.log(`switched ${switched.length}:\n  ${switched.join("\n  ")}`);
if (problems.length) {
  console.log(`PROBLEMS:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
if (write) {
  if (!appending && existsSync(leafPath))
    throw new Error(`${leaf} exists; this script makes a new leaf`);
  writeFileSync(path.join(ROOT, leaf), leafText);
  writeFileSync(path.join(ROOT, hub), rest);
  for (const [f, t] of fileEdits) writeFileSync(path.join(ROOT, f), t);
}
