/**
 * Points an importer's names at the file that declares them, when the hub it
 * imports them from only re-exports them (the Rings work, Nov 28). The hub
 * keeps its re-exports, so nothing else changes; the importer stops importing
 * the hub, which takes it off the hub's ring when the declaring file is not on
 * it. Structure only: no declaration moves and no name changes.
 *
 *   node --import tsx scripts/rings/redirect-importers.ts --hub <file> \
 *     --importers <file,file> [--write]
 *
 * For each importer, every run-time name it takes from the hub must be a
 * re-export there (`export { a } from "./b"`, or `export *`); otherwise the
 * importer is left as it is and the reason printed. Type imports stay on the
 * hub. A name goes into the importer's existing import of the declaring file
 * when it has one, else into a new import line.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = path.resolve(import.meta.dirname, "../..");
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? undefined : process.argv[i + 1];
};
const hub = arg("hub")!;
const importers = arg("importers")!.split(",");
const write = process.argv.includes("--write");

const read = (f: string) => readFileSync(path.join(ROOT, f), "utf8");
const parse = (f: string, text: string) =>
  ts.createSourceFile(f, text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
const exists = (f: string) => {
  try {
    read(f);
    return true;
  } catch {
    return false;
  }
};
function resolve(from: string, spec: string): string | null {
  if (!spec.startsWith(".")) return null;
  const base = path.posix.normalize(
    path.posix.join(path.posix.dirname(from), spec),
  );
  for (const c of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    base.replace(/\.js$/, ".ts"),
  ])
    if (exists(c) && c.endsWith(".ts")) return c;
  return null;
}
function spec(from: string, to: string): string {
  let rel = path.posix
    .relative(path.posix.dirname(from), to)
    .replace(/\.ts$/, "");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}
/** Top-level names a file declares itself. */
function declares(file: string): Set<string> {
  const out = new Set<string>();
  for (const st of parse(file, read(file)).statements) {
    if (
      (ts.isFunctionDeclaration(st) ||
        ts.isClassDeclaration(st) ||
        ts.isEnumDeclaration(st)) &&
      st.name
    )
      out.add(st.name.text);
    if (ts.isVariableStatement(st))
      for (const d of st.declarationList.declarations)
        if (ts.isIdentifier(d.name)) out.add(d.name.text);
  }
  return out;
}

/** Where the hub's re-exported name comes from: the file and its name there. */
const hubSf = parse(hub, read(hub));
const reexports = new Map<string, { file: string; name: string }>();
const stars: string[] = [];
for (const st of hubSf.statements) {
  if (!ts.isExportDeclaration(st) || st.isTypeOnly || !st.moduleSpecifier)
    continue;
  const target = resolve(hub, (st.moduleSpecifier as ts.StringLiteral).text);
  if (!target) continue;
  if (!st.exportClause) stars.push(target);
  else if (ts.isNamedExports(st.exportClause))
    for (const e of st.exportClause.elements)
      if (!e.isTypeOnly)
        reexports.set(e.name.text, {
          file: target,
          name: (e.propertyName ?? e.name).text,
        });
}
// `import { a } from "./b"; export { a };` re-exports b's a as well.
{
  const imported = new Map<string, { file: string; name: string }>();
  for (const st of hubSf.statements) {
    if (!ts.isImportDeclaration(st) || st.importClause?.isTypeOnly) continue;
    const target = resolve(hub, (st.moduleSpecifier as ts.StringLiteral).text);
    const nb = st.importClause?.namedBindings;
    if (target && nb && ts.isNamedImports(nb))
      for (const e of nb.elements)
        if (!e.isTypeOnly)
          imported.set(e.name.text, {
            file: target,
            name: (e.propertyName ?? e.name).text,
          });
  }
  for (const st of hubSf.statements)
    if (
      ts.isExportDeclaration(st) &&
      !st.isTypeOnly &&
      !st.moduleSpecifier &&
      st.exportClause &&
      ts.isNamedExports(st.exportClause)
    )
      for (const e of st.exportClause.elements) {
        const from = imported.get((e.propertyName ?? e.name).text);
        if (from && !e.isTypeOnly) reexports.set(e.name.text, from);
      }
}
const hubOwn = declares(hub);
/** What a file re-exports by name (its own `export { a } from` and its `import { a }; export { a }`), and its `export *` files. */
function reexportsOf(file: string): {
  named: Map<string, { file: string; name: string }>;
  stars: string[];
} {
  const sf = parse(file, read(file));
  const named = new Map<string, { file: string; name: string }>();
  const fileStars: string[] = [];
  const imported = new Map<string, { file: string; name: string }>();
  for (const st of sf.statements) {
    if (ts.isImportDeclaration(st) && !st.importClause?.isTypeOnly) {
      const t = resolve(file, (st.moduleSpecifier as ts.StringLiteral).text);
      const nb = st.importClause?.namedBindings;
      if (t && nb && ts.isNamedImports(nb))
        for (const e of nb.elements)
          if (!e.isTypeOnly)
            imported.set(e.name.text, {
              file: t,
              name: (e.propertyName ?? e.name).text,
            });
    }
    if (!ts.isExportDeclaration(st) || st.isTypeOnly) continue;
    if (st.moduleSpecifier) {
      const t = resolve(file, (st.moduleSpecifier as ts.StringLiteral).text);
      if (!t) continue;
      if (!st.exportClause) fileStars.push(t);
      else if (ts.isNamedExports(st.exportClause))
        for (const e of st.exportClause.elements)
          if (!e.isTypeOnly)
            named.set(e.name.text, {
              file: t,
              name: (e.propertyName ?? e.name).text,
            });
    } else if (st.exportClause && ts.isNamedExports(st.exportClause))
      for (const e of st.exportClause.elements) {
        const from = imported.get((e.propertyName ?? e.name).text);
        if (from && !e.isTypeOnly) named.set(e.name.text, from);
      }
  }
  return { named, stars: fileStars };
}
/** Follows re-exports to the file that declares the name. */
function declaring(
  at: { file: string; name: string },
  depth = 0,
): { file: string; name: string } {
  if (depth > 8 || declares(at.file).has(at.name)) return at;
  const { named, stars: st } = reexportsOf(at.file);
  const next = named.get(at.name);
  if (next) return declaring(next, depth + 1);
  for (const s of st)
    if (declares(s).has(at.name) || reexportsOf(s).named.has(at.name))
      return declaring({ file: s, name: at.name }, depth + 1);
  return at;
}
function source(name: string): { file: string; name: string } | null {
  const r = reexports.get(name);
  if (r) return declaring(r);
  if (hubOwn.has(name)) return null;
  for (const s of stars)
    if (declares(s).has(name)) return declaring({ file: s, name });
  return null;
}

for (const file of importers) {
  const text = read(file);
  const sf = parse(file, text);
  // The hub's value imports; an `import type` of the hub stays as written.
  const decls = sf.statements.filter(
    (st): st is ts.ImportDeclaration =>
      ts.isImportDeclaration(st) &&
      !st.importClause?.isTypeOnly &&
      resolve(file, (st.moduleSpecifier as ts.StringLiteral).text) === hub,
  );
  const moves: { local: string; imported: string; to: string }[] = [];
  const problems: string[] = [];
  const keepTypes: string[] = [];
  for (const d of decls) {
    const cl = d.importClause;
    if (!cl || cl.isTypeOnly) continue;
    if (cl.name || (cl.namedBindings && !ts.isNamedImports(cl.namedBindings)))
      problems.push("default or namespace import of the hub");
    if (cl.namedBindings && ts.isNamedImports(cl.namedBindings))
      for (const e of cl.namedBindings.elements) {
        if (e.isTypeOnly) {
          keepTypes.push(e.getText(sf).replace(/^type\s+/, ""));
          continue;
        }
        const imported = (e.propertyName ?? e.name).text;
        const s = source(imported);
        if (!s) problems.push(`${imported} is the hub's own`);
        else
          moves.push({
            local:
              s.name === e.name.text ? s.name : `${s.name} as ${e.name.text}`,
            imported,
            to: s.file,
          });
      }
  }
  if (problems.length || !moves.length) {
    console.log(`left ${file}: ${problems.join("; ") || "nothing to move"}`);
    continue;
  }
  // Edits: each hub import becomes its type part (if any); names join the
  // importer's import of their file, or a new line after the hub import.
  const edits: { start: number; end: number; text: string }[] = [];
  const byTarget = new Map<string, string[]>();
  for (const m of moves)
    byTarget.set(m.to, [...(byTarget.get(m.to) ?? []), m.local]);
  const added: string[] = [];
  for (const [target, names] of byTarget) {
    const existing = sf.statements.find(
      (st): st is ts.ImportDeclaration =>
        ts.isImportDeclaration(st) &&
        !st.importClause?.isTypeOnly &&
        !!st.importClause?.namedBindings &&
        ts.isNamedImports(st.importClause.namedBindings) &&
        resolve(file, (st.moduleSpecifier as ts.StringLiteral).text) === target,
    );
    if (existing) {
      const nb = existing.importClause!.namedBindings as ts.NamedImports;
      const have = nb.elements.map((e) => e.getText(sf));
      edits.push({
        start: nb.getStart(sf),
        end: nb.getEnd(),
        text: `{ ${[...have, ...names.filter((n) => !have.includes(n))].join(", ")} }`,
      });
    } else
      added.push(
        `import { ${names.join(", ")} } from "${spec(file, target)}";`,
      );
  }
  decls.forEach((d, i) => {
    let end = d.getEnd();
    const replacement = [
      ...(i === 0 && keepTypes.length
        ? [
            `import type { ${keepTypes.join(", ")} } from ${d.moduleSpecifier.getText(sf)};`,
          ]
        : []),
      ...(i === 0 ? added : []),
    ].join("\n");
    if (!replacement && text[end] === "\n") end++;
    edits.push({ start: d.getStart(sf), end, text: replacement });
  });
  let out = text;
  for (const e of edits.sort((a, b) => b.start - a.start))
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  console.log(
    `${file}: ${moves.map((m) => `${m.imported} -> ${m.to}`).join(", ")}`,
  );
  if (write) writeFileSync(path.join(ROOT, file), out);
}
