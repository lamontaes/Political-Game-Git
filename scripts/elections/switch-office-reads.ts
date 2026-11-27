/**
 * Elections item 5, the office reads: a read of the offices module's tables
 * (`api.moduleState(OFFICES_MODULE_ID).table("terms").query(...)`) becomes a
 * call to the offices engine's own door (`termsOfPerson(api, id)`), for every
 * read shape that has a door. Re-runnable: a second run finds nothing to do.
 *
 *   node --import tsx scripts/elections/switch-office-reads.ts [--check] <file>...
 *
 * Shapes (table, call, door):
 *   offices .get(id)                      officeById(api, id)
 *   seats   .get(id)                      seatById(api, id)
 *   terms   .get(id)                      termById(api, id)
 *   vacancies .get(id)                    vacancyById(api, id)
 *   terms   .query("byPerson", [p])       termsOfPerson(api, p)
 *   terms   .query("bySeatStatus", [s, "serving"])     servingTermsOnSeat(api, s)
 *   terms   .query("byOfficeStatus", [o, "serving"])   servingTermsOfOffice(api, o)
 *   terms   .query("byStatus", ["serving"])            servingTerms(api)
 *   offices .query("byJurisdiction", [j]) officesInJurisdiction(api, j)
 *   seats   .query("byOffice", [o])       officeSeats(api, o)
 *   offices/seats/terms .rows()           allOffices / allSeats / allTerms (api)
 *
 * A table held in a local `const` is rewritten only when every use of that
 * constant is one of these reads; a table that is also written (`put`) or read
 * another way is left alone, whole. Imports are added to the file's offices
 * import, and an import the rewrite leaves unused is dropped.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const check = process.argv.includes("--check");
const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));

type Door = (api: string, args: string[]) => string;
const SERVING = (e: ts.Expression) =>
  ts.isStringLiteral(e) && e.text === "serving";

/** The door for a read, from its table, method and arguments; null where none fits. */
function doorFor(
  table: string,
  method: string,
  args: readonly ts.Expression[],
  sf: ts.SourceFile,
): { name: string; make: Door } | null {
  const text = (e: ts.Expression) => e.getText(sf);
  const list = (e: ts.Expression | undefined) =>
    e && ts.isArrayLiteralExpression(e) ? e.elements : null;
  if (method === "get" && args.length === 1) {
    const name = {
      offices: "officeById",
      seats: "seatById",
      terms: "termById",
      vacancies: "vacancyById",
    }[table];
    return name ? { name, make: (api, a) => `${name}(${api}, ${a[0]})` } : null;
  }
  if (method === "rows" && args.length === 0) {
    const name = {
      offices: "allOffices",
      seats: "allSeats",
      terms: "allTerms",
    }[table];
    return name ? { name, make: (api) => `${name}(${api})` } : null;
  }
  if (method !== "query" || args.length !== 2 || !ts.isStringLiteral(args[0]!))
    return null;
  const index = (args[0] as ts.StringLiteral).text;
  const keys = list(args[1]);
  if (!keys) return null;
  const k = keys.map(text);
  if (table === "terms" && index === "byPerson" && keys.length === 1)
    return {
      name: "termsOfPerson",
      make: (api) => `termsOfPerson(${api}, ${k[0]})`,
    };
  if (
    table === "terms" &&
    index === "bySeatStatus" &&
    keys.length === 2 &&
    SERVING(keys[1]!)
  )
    return {
      name: "servingTermsOnSeat",
      make: (api) => `servingTermsOnSeat(${api}, ${k[0]})`,
    };
  if (
    table === "terms" &&
    index === "byOfficeStatus" &&
    keys.length === 2 &&
    SERVING(keys[1]!)
  )
    return {
      name: "servingTermsOfOffice",
      make: (api) => `servingTermsOfOffice(${api}, ${k[0]})`,
    };
  if (
    table === "terms" &&
    index === "byStatus" &&
    keys.length === 1 &&
    SERVING(keys[0]!)
  )
    return { name: "servingTerms", make: (api) => `servingTerms(${api})` };
  if (table === "offices" && index === "byJurisdiction" && keys.length === 1)
    return {
      name: "officesInJurisdiction",
      make: (api) => `officesInJurisdiction(${api}, ${k[0]})`,
    };
  if (table === "seats" && index === "byOffice" && keys.length === 1)
    return {
      name: "officeSeats",
      make: (api) => `officeSeats(${api}, ${k[0]})`,
    };
  return null;
}

/** `<api>.moduleState(OFFICES_MODULE_ID).table("<t>")` or `offices(<api>).table("<t>")`: the api text and table name. */
function officesTable(
  e: ts.Node,
  sf: ts.SourceFile,
): { api: string; table: string } | null {
  if (!ts.isCallExpression(e) || !ts.isPropertyAccessExpression(e.expression))
    return null;
  if (e.expression.name.text !== "table" || e.arguments.length !== 1)
    return null;
  const arg = e.arguments[0]!;
  if (!ts.isStringLiteral(arg)) return null;
  const recv = e.expression.expression;
  if (!ts.isCallExpression(recv)) return null;
  if (
    ts.isPropertyAccessExpression(recv.expression) &&
    recv.expression.name.text === "moduleState" &&
    ts.isIdentifier(recv.expression.expression) &&
    recv.arguments.length === 1 &&
    /^OFFICES_MODULE(_ID)?$/.test(recv.arguments[0]!.getText(sf))
  )
    return { api: recv.expression.expression.text, table: arg.text };
  if (
    ts.isIdentifier(recv.expression) &&
    recv.expression.text === "offices" &&
    recv.arguments.length === 1 &&
    ts.isIdentifier(recv.arguments[0]!)
  )
    return { api: recv.arguments[0]!.getText(sf), table: arg.text };
  return null;
}

interface Edit {
  start: number;
  end: number;
  text: string;
}

function rewrite(
  file: string,
  source: string,
): { out: string; doors: string[] } {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const edits: Edit[] = [];
  const doors = new Set<string>();

  /** The call a table expression is the receiver of: `<table>.method(args)`. */
  const readOf = (tableExpr: ts.Node) => {
    const access = tableExpr.parent;
    if (
      !access ||
      !ts.isPropertyAccessExpression(access) ||
      access.expression !== tableExpr
    )
      return null;
    const call = access.parent;
    if (!call || !ts.isCallExpression(call) || call.expression !== access)
      return null;
    return { call, method: access.name.text };
  };

  const visit = (node: ts.Node): void => {
    const t = officesTable(node, sf);
    if (t) {
      const read = readOf(node);
      const door =
        read && doorFor(t.table, read.method, read.call.arguments, sf);
      if (read && door) {
        doors.add(door.name);
        edits.push({
          start: read.call.getStart(sf),
          end: read.call.getEnd(),
          text: door.make(
            t.api,
            read.call.arguments.map((a) => a.getText(sf)),
          ),
        });
        return;
      }
      // An alias: `const v = <table>`; rewrite it only when every use of v is a read with a door.
      const decl = node.parent;
      if (
        decl &&
        ts.isVariableDeclaration(decl) &&
        decl.initializer === node &&
        ts.isIdentifier(decl.name)
      ) {
        const name = decl.name.text;
        const scope = decl.parent.parent.parent; // the block holding the statement
        const uses: ts.Identifier[] = [];
        const find = (n: ts.Node): void => {
          if (ts.isIdentifier(n) && n.text === name && n !== decl.name)
            uses.push(n);
          ts.forEachChild(n, find);
        };
        find(scope);
        const planned = uses.map((u) => {
          const read = readOf(u);
          const d =
            read && doorFor(t.table, read.method, read.call.arguments, sf);
          return read && d ? { read, d } : null;
        });
        const stmt = decl.parent.parent;
        if (
          uses.length > 0 &&
          planned.every(Boolean) &&
          ts.isVariableStatement(stmt) &&
          stmt.declarationList.declarations.length === 1
        ) {
          for (const p of planned) {
            doors.add(p!.d.name);
            edits.push({
              start: p!.read.call.getStart(sf),
              end: p!.read.call.getEnd(),
              text: p!.d.make(
                t.api,
                p!.read.call.arguments.map((a) => a.getText(sf)),
              ),
            });
          }
          edits.push({
            start: stmt.getFullStart(),
            end: stmt.getEnd(),
            text: "",
          });
          return;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  // Edits that contain another edit wait for the next run.
  const kept = edits.filter(
    (e) =>
      !edits.some(
        (o) =>
          o !== e &&
          o.start >= e.start &&
          o.end <= e.end &&
          (o.start > e.start || o.end < e.end),
      ),
  );
  let out = source;
  for (const e of [...kept].sort((a, b) => b.start - a.start))
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return { out, doors: [...doors] };
}

/** Add door names to the offices import (or make one) and drop imports the rewrite left unused. */
function fixImports(
  file: string,
  before: string,
  after: string,
  doors: string[],
): string {
  const sf = ts.createSourceFile(file, after, ts.ScriptTarget.Latest, true);
  const rel = (() => {
    const r = path.posix.relative(
      path.posix.dirname(file),
      "src/core2/modules/offices",
    );
    return r.startsWith(".") ? r : `./${r}`;
  })();
  const offices = sf.statements.find(
    (s): s is ts.ImportDeclaration =>
      ts.isImportDeclaration(s) &&
      ts.isStringLiteral(s.moduleSpecifier) &&
      /(^|\/)offices$/.test(s.moduleSpecifier.text) &&
      !!s.importClause?.namedBindings &&
      ts.isNamedImports(s.importClause.namedBindings) &&
      !s.importClause.isTypeOnly,
  );
  let out = after;
  if (doors.length) {
    if (offices) {
      const nb = offices.importClause!.namedBindings as ts.NamedImports;
      const have = new Set(nb.elements.map((e) => e.name.text));
      const add = doors.filter((d) => !have.has(d));
      if (add.length) {
        const list = [...nb.elements.map((e) => e.getText(sf)), ...add].join(
          ", ",
        );
        out =
          out.slice(0, nb.getStart(sf)) +
          `{ ${list} }` +
          out.slice(nb.getEnd());
      }
    } else {
      const first = sf.statements.find(ts.isImportDeclaration);
      const line = `import { ${doors.sort().join(", ")} } from "${rel}";\n`;
      out = first
        ? out.slice(0, first.getFullStart()) +
          "\n" +
          line +
          out.slice(first.getFullStart())
        : line + out;
    }
  }
  // Drop a specifier whose every use the rewrite removed.
  const sf2 = ts.createSourceFile(file, out, ts.ScriptTarget.Latest, true);
  const usesIn = (text: string, name: string) => {
    const s = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    let n = 0;
    const walk = (x: ts.Node): void => {
      if (ts.isImportDeclaration(x)) return;
      if (ts.isIdentifier(x) && x.text === name) n += 1;
      ts.forEachChild(x, walk);
    };
    walk(s);
    return n;
  };
  const edits: Edit[] = [];
  for (const st of sf2.statements) {
    if (
      !ts.isImportDeclaration(st) ||
      !st.importClause?.namedBindings ||
      !ts.isNamedImports(st.importClause.namedBindings)
    )
      continue;
    const nb = st.importClause.namedBindings;
    const drop = nb.elements.filter(
      (e) => usesIn(before, e.name.text) > 0 && usesIn(out, e.name.text) === 0,
    );
    if (!drop.length) continue;
    const keep = nb.elements.filter((e) => !drop.includes(e));
    if (!keep.length && !st.importClause.name)
      edits.push({ start: st.getFullStart(), end: st.getEnd(), text: "" });
    else
      edits.push({
        start: nb.getStart(sf2),
        end: nb.getEnd(),
        text: `{ ${keep.map((e) => e.getText(sf2)).join(", ")} }`,
      });
  }
  for (const e of edits.sort((a, b) => b.start - a.start))
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return out;
}

let changed = 0;
for (const file of files) {
  const before = readFileSync(file, "utf8");
  let current = before;
  // Nested reads (a read inside another's arguments) take another pass.
  for (let pass = 0; pass < 4; pass += 1) {
    const { out, doors } = rewrite(file, current);
    if (out === current) break;
    current = fixImports(file, before, out, doors);
  }
  if (current === before) continue;
  changed += 1;
  console.log(file);
  if (!check) writeFileSync(file, current);
}
console.log(`${changed} file(s) ${check ? "to switch" : "switched"}`);
if (check && changed) process.exit(1);
