/* global console, process, URL */
/**
 * Screens item 5 (SC4 of docs/coordination/refactor/screens-2026-11-27.md): the play server's route table,
 * one route file per screen, as a re-runnable script (the CTO re-runs it on main after Story's split
 * lands in src/bench/handler.ts).
 *
 *   node scripts/screens/split-routes.mjs          write the split
 *   node scripts/screens/split-routes.mjs --check  plan it and run the probe, write nothing
 *
 * What it does, on the table as it stands:
 *   - each route of `ROUTES` in src/bench/handler.ts moves to src/bench/routes/<screen>.ts, the screen
 *     named by the first part of its path (SCREENS below; a path no screen names stops the script);
 *   - the routes that need the session operations (start a life, load, save, replay) stay in handler.ts,
 *     which Core's item 9 takes; so do the declarations those operations need;
 *   - the shared state and the few helpers the moved routes call move to src/bench/session-state.ts, which
 *     both handler.ts and the route files import (a route file never imports handler.ts);
 *   - imports are carried to whichever file uses them and dropped where nothing does.
 * The probe then asks every path the routes name (and one beneath each prefix) which routes match it,
 * before and after, and requires the same routes in the same order, so the split changes no answer.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const HANDLER = path.join(ROOT, "src/bench/handler.ts");
const check = process.argv.includes("--check");

// The screen each first path part belongs to. A new part stops the script, so a route is never filed by accident.
const SCREENS = {
  art: ["art"],
  campaign: ["campaign", "party", "announce", "file", "filing"],
  bills: ["bill", "bills", "desk", "floor", "orders", "nominations"],
  meeting: ["meeting", "seat", "office", "job", "advanced"],
  elections: ["results", "election-night", "election-day", "polling-place"],
  government: [
    "government",
    "law",
    "changes",
    "map",
    "calendar",
    "budget",
    "bank",
    "economy",
    "metrics",
    "world-panels",
  ],
  talk: [
    "talk",
    "scene",
    "scene-filter",
    "story",
    "gap",
    "gaps",
    "grade",
    "wait",
    "journal",
  ],
  town: ["goto", "opening", "openings", "known", "card", "news"],
  page: [
    "controls",
    "guide",
    "version",
    "patch-notes",
    "creator",
    "progress",
    "state",
  ],
};
// The routes that start, load, advance and save a life: Core's item 9 takes them, so they stay.
const SESSION = [
  "newlife",
  "title",
  "load",
  "advance",
  "resume",
  "play",
  "build",
  "seed",
];
// What stays in handler.ts: the session operations (Core's item 9) and the table's driver.
const STAY = new Set([
  "benchRequest",
  "answerRequest",
  "replayLife",
  "replayCommands",
  "saveLifeNow",
  "emptyBench",
  "savedLives",
  "lifeCover",
  "saveFolder",
  "savePath",
  "replaying",
  "UNRECORDED",
  "BENCH_REQUEST",
  "DEVELOPER_ROUTES",
  "BenchReply",
  "serialize",
  "ROUTES",
]);

const screenOf = (segment) => {
  for (const [screen, parts] of Object.entries(SCREENS))
    if (parts.includes(segment)) return screen;
  throw new Error(
    `No screen in scripts/screens/split-routes.mjs names the path part "${segment}".`,
  );
};
const camel = (screen) =>
  screen.replace(/-(\w)/g, (_, c) => c.toUpperCase()) + "Routes";

const text = readFileSync(HANDLER, "utf8");
if (/from "\.\/routes\//.test(text)) {
  console.log(
    "handler.ts is already split: its routes come from src/bench/routes/.",
  );
  process.exit(0);
}
const program = ts.createProgram([HANDLER], {
  noEmit: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  skipLibCheck: true,
  resolveJsonModule: true,
  allowImportingTsExtensions: true,
});
const checker = program.getTypeChecker();
const sf = program.getSourceFile(HANDLER);
const topOf = (node) => {
  let n = node;
  while (n && n.parent && !ts.isSourceFile(n.parent)) n = n.parent;
  return n && n.parent && ts.isSourceFile(n.parent) ? n : null;
};
const namesOf = (statement) =>
  ts.isVariableStatement(statement)
    ? statement.declarationList.declarations.map((d) => d.name.getText())
    : statement.name
      ? [statement.name.getText()]
      : [];
const statements = [...sf.statements];
const routesStatement = statements.find(
  (s) => ts.isVariableStatement(s) && namesOf(s).includes("ROUTES"),
);
if (!routesStatement) throw new Error("No ROUTES in handler.ts.");
const table = routesStatement.declarationList.declarations[0].initializer;
const entries = (table.elements ?? table.expression.elements).map((node) => {
  const literals = [];
  node.forEachChild(function walk(n) {
    if (ts.isStringLiteral(n) && /^\/(api|art)\//.test(n.text))
      literals.push(n.text);
    n.forEachChild(walk);
  });
  // The newspaper pictures match by a pattern kept beside the table (NEWSPAPER_ART), not by a literal.
  const pathOf =
    literals[0] ??
    (node.getText().includes("NEWSPAPER_ART")
      ? "/art/newspaper/x.jpg"
      : undefined);
  return {
    node,
    path: pathOf,
    segment: pathOf?.startsWith("/art/")
      ? "art"
      : (pathOf?.split("/")[2] ?? "?"),
  };
});
for (const entry of entries)
  if (entry.segment === "?")
    throw new Error(
      `A route with no path: ${entry.node.getText().slice(0, 80)}`,
    );

/** Top-level statements an AST node refers to (not imports, not the node's own statement). */
function refs(node, self) {
  const out = new Set();
  const imports = new Map();
  node.forEachChild(function walk(n) {
    if (ts.isIdentifier(n)) {
      const d = checker.getSymbolAtLocation(n)?.declarations?.[0];
      if (d && d.getSourceFile() === sf) {
        if (
          ts.isImportSpecifier(d) ||
          ts.isImportClause(d) ||
          ts.isNamespaceImport(d)
        )
          imports.set(n.text, d);
        else {
          const top = topOf(d);
          if (
            top &&
            top !== self &&
            top !== routesStatement &&
            !ts.isImportDeclaration(top)
          )
            out.add(top);
        }
      }
    }
    n.forEachChild(walk);
  });
  return { out, imports };
}
const stays = (statement) => namesOf(statement).some((n) => STAY.has(n));

// Which routes stay: those whose closure touches a staying declaration.
const closureOf = (start) => {
  const seen = new Set();
  const queue = [...start];
  while (queue.length) {
    const s = queue.pop();
    if (seen.has(s)) continue;
    seen.add(s);
    for (const r of refs(s, s).out) queue.push(r);
  }
  return seen;
};
for (const entry of entries) {
  const closure = closureOf(refs(entry.node, null).out);
  entry.stays = SESSION.includes(entry.segment) || [...closure].some(stays);
  entry.closure = closure;
  entry.screen = entry.stays ? "session" : screenOf(entry.segment);
}
const moved = entries.filter((e) => !e.stays);
const movedDecls = new Set();
for (const entry of moved) for (const s of entry.closure) movedDecls.add(s);
// What a moved route needs and a staying one does not need leaves handler.ts for session-state.ts, which
// handler.ts imports back for the routes and the driver that stay.
const toSession = [...movedDecls].filter((s) => !stays(s));
// The route types go with the state: the route files and handler.ts both name them.
for (const s of statements)
  if (namesOf(s).includes("Route") && !toSession.includes(s)) toSession.push(s);
const sessionStatements = statements.filter((s) => toSession.includes(s));
const sessionNames = new Set(sessionStatements.flatMap(namesOf));

// ---- the probe's before picture
const matchers = entries.map((e) => {
  const m = e.node.properties.find((p) => p.name?.getText() === "match");
  return { entry: e, source: m.initializer.getText() };
});
const NEWSPAPER_ART = /^\/art\/newspaper\/([a-z0-9-]+\.jpg)$/;
const compiled = matchers.map(({ source }) =>
  new Function(
    "NEWSPAPER_ART",
    `return (${ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText.replace(/;\s*$/, "")})`,
  )(NEWSPAPER_ART),
);
const paths = new Set();
for (const e of entries) {
  paths.add(e.path);
  paths.add(`${e.path}x`);
  paths.add(`${e.path}/x`);
}
const matching = (order) => {
  const out = new Map();
  for (const method of ["GET", "POST"])
    for (const p of paths) {
      const request = { method };
      const url = new URL(p, "http://bench");
      out.set(
        `${method} ${p}`,
        order.filter((i) => compiled[i]({ request, url })).join(","),
      );
    }
  return out;
};
const original = entries.map((_, i) => i);

// ---- the new order: groups by screen, each in its original order, the staying routes last
const screens = [...new Set(moved.map((e) => e.screen))];
const index = new Map(entries.map((e, i) => [e, i]));
const order = [
  ...screens.flatMap((s) => moved.filter((e) => e.screen === s)),
  ...entries.filter((e) => e.stays),
].map((e) => index.get(e));
const before = matching(original);
const after = matching(order);
const different = [...before].filter(
  ([key, value]) => after.get(key) !== value,
);
const counts = [...before.values()].map((v) => (v ? v.split(",").length : 0));
console.log(
  `${entries.length} routes: ${moved.length} move to ${screens.length} screen files, ${entries.length - moved.length} stay (session routes).`,
);
console.log(
  `${sessionStatements.length} declarations go to session-state.ts (${[...sessionNames].join(", ")}).`,
);
console.log(
  `probe: ${before.size} (method, path) probes; most routes matching one probe: ${Math.max(...counts)}; probes whose matches change: ${different.length}.`,
);
if (different.length) {
  for (const [key, value] of different.slice(0, 10))
    console.log(`  ${key}: ${value} became ${after.get(key)}`);
  throw new Error(
    "The split would change which route answers; fix the order in the script before writing.",
  );
}
if (check) process.exit(0);

// ---- write the files
const importsOfNodes = (nodes) => {
  // The import statements these nodes need, from handler.ts's own, as one statement per module.
  const wanted = new Map();
  for (const node of nodes)
    for (const [name, d] of refs(node, null).imports) wanted.set(name, d);
  const byModule = new Map();
  for (const d of wanted.values()) {
    const declaration =
      d.parent.parent?.kind === ts.SyntaxKind.ImportDeclaration
        ? d.parent.parent
        : (d.parent.parent?.parent ?? d.parent);
    const importDeclaration = ts.isImportDeclaration(declaration)
      ? declaration
      : declaration.parent;
    const key = importDeclaration.moduleSpecifier.getText();
    const record = byModule.get(key) ?? {
      declaration: importDeclaration,
      named: [],
      def: null,
      ns: null,
    };
    if (ts.isImportSpecifier(d)) record.named.push(d.getText());
    else if (ts.isNamespaceImport(d)) record.ns = d.getText();
    else record.def = d.name.getText();
    byModule.set(key, record);
  }
  return byModule;
};
const lines = (byModule, down) =>
  [...byModule.values()].map((r) => {
    let spec = r.declaration.moduleSpecifier.text;
    // A route file sits one folder below handler.ts.
    if (down && spec.startsWith("./")) spec = `.${spec}`;
    else if (down && spec.startsWith("../")) spec = `../${spec}`;
    const type = r.declaration.importClause?.isTypeOnly ? "type " : "";
    const parts = [];
    if (r.def) parts.push(r.def);
    if (r.ns) parts.push(r.ns);
    if (r.named.length) parts.push(`{ ${r.named.join(", ")} }`);
    const attributes = r.declaration.attributes
      ? ` ${r.declaration.attributes.getText()}`
      : "";
    return `import ${type}${parts.join(", ")} from "${spec}"${attributes};`;
  });
/** A file lookup beside the module (`new URL("../x", import.meta.url)`) is one folder deeper in a route file. */
const deeper = (code) =>
  code.replace(
    /new\s+URL\(\s*(["'`])((?:(?!\1)[^\\])*)\1(\s*,\s*import\.meta\.url)/g,
    (_, quote, rel, tail) => {
      const next = rel.startsWith("./")
        ? `.${rel}`
        : rel.startsWith("../")
          ? `../${rel}`
          : `../${rel}`;
      return `new URL(${quote}${next}${quote}${tail}`;
    },
  );
const exported = (statement) => {
  const t = statement.getFullText();
  const trimmed = t.replace(
    /^(\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*)(?!export\b)/,
    "$1export ",
  );
  return trimmed;
};

// session-state.ts
const sessionImports = lines(importsOfNodes(sessionStatements), false);
const sessionText = [
  "// The play server's shared state and the few helpers the route files call, in the one module both handler.ts",
  "// and src/bench/routes/ import (a route file never imports handler.ts). Moved by scripts/screens/split-routes.mjs.",
  ...sessionImports,
  ...sessionStatements.map((s) => exported(s)),
].join("\n");
writeFileSync(
  path.join(ROOT, "src/bench/session-state.ts"),
  sessionText + "\n",
);

mkdirSync(path.join(ROOT, "src/bench/routes"), { recursive: true });
const sessionImportNames = (nodes) => {
  const names = new Set();
  for (const node of nodes)
    for (const s of refs(node, null).out)
      for (const n of namesOf(s)) if (sessionNames.has(n)) names.add(n);
  return [...names].sort();
};
for (const screen of screens) {
  const group = moved.filter((e) => e.screen === screen);
  const nodes = group.map((e) => e.node);
  const types = sessionImportNames(nodes);
  const body = group
    .map((e) =>
      deeper(e.node.getFullText())
        .replace(/^\s*,?/, "")
        .trimEnd()
        .replace(/,$/, ""),
    )
    .join(",\n");
  const out = [
    `// The ${screen} screen's routes of the play server, moved from handler.ts by scripts/screens/split-routes.mjs.`,
    ...lines(importsOfNodes(nodes), true),
    `import { ${[...new Set([...types, "Route"])].sort().join(", ")} } from "../session-state";`,
    "",
    `export const ${camel(screen)}: readonly Route[] = [${body}];`,
  ].join("\n");
  writeFileSync(path.join(ROOT, `src/bench/routes/${screen}.ts`), out + "\n");
}

// handler.ts: the table is the screens' arrays, then the session routes in their order
const stayEntries = entries.filter((e) => e.stays);
const tableText = `const ROUTES: readonly Route[] = [\n${screens.map((s) => `  ...${camel(s)},`).join("\n")}\n${stayEntries
  .map(
    (e) =>
      `${e.node
        .getFullText()
        .replace(/^\s*,?/, "")
        .trimEnd()
        .replace(/,$/, "")},`,
  )
  .join("\n")}\n];`;
let handler = "";
let cursor = 0;
const full = sf.getFullText();
for (const s of statements) {
  if (!toSession.includes(s) && s !== routesStatement) continue;
  handler += full.slice(cursor, s.getFullStart());
  cursor = s.end;
  if (s === routesStatement) handler += `\n${tableText}`;
}
handler += full.slice(cursor);
const newImports = [
  `import { ${[...sessionNames].sort().join(", ")} } from "./session-state";`,
  ...screens.map((s) => `import { ${camel(s)} } from "./routes/${s}";`),
].join("\n");
const firstImport = statements.find((s) => ts.isImportDeclaration(s));
handler =
  handler.slice(0, firstImport.getStart()) +
  newImports +
  "\n" +
  handler.slice(firstImport.getStart());
writeFileSync(HANDLER, handler);

// Drop the imports handler.ts no longer uses, then format.
const rewritten = ts.createSourceFile(
  HANDLER,
  handler,
  ts.ScriptTarget.ES2022,
  true,
);
const used = new Set();
rewritten.forEachChild(function walk(n) {
  if (ts.isImportDeclaration(n)) return;
  if (ts.isIdentifier(n)) used.add(n.text);
  n.forEachChild(walk);
});
let cleaned = handler;
const drops = [];
for (const s of rewritten.statements) {
  if (!ts.isImportDeclaration(s) || !s.importClause) continue;
  const { name, namedBindings } = s.importClause;
  const unusedDefault = name && !used.has(name.text);
  const spec =
    namedBindings && ts.isNamedImports(namedBindings)
      ? namedBindings.elements.filter((el) => used.has(el.name.text))
      : null;
  const all =
    namedBindings && ts.isNamedImports(namedBindings)
      ? namedBindings.elements.length
      : 0;
  if (
    (name ? unusedDefault : true) &&
    (spec
      ? spec.length === 0
      : !namedBindings || ts.isNamespaceImport(namedBindings)
        ? !(namedBindings && used.has(namedBindings.name.text))
        : true)
  )
    drops.push([s.getFullStart(), s.end, ""]);
  else if (spec && spec.length < all) {
    const keep = [
      name && !unusedDefault ? name.text : null,
      `{ ${spec.map((el) => el.getText()).join(", ")} }`,
    ]
      .filter(Boolean)
      .join(", ");
    drops.push([
      s.getStart(),
      s.end,
      `import ${s.importClause.isTypeOnly ? "type " : ""}${keep} from ${s.moduleSpecifier.getText()}${s.attributes ? ` ${s.attributes.getText()}` : ""};`,
    ]);
  }
}
for (const [start, end, replacement] of drops.sort((a, b) => b[0] - a[0]))
  cleaned = cleaned.slice(0, start) + replacement + cleaned.slice(end);
writeFileSync(HANDLER, cleaned);
execFileSync(
  "npx",
  [
    "prettier",
    "--write",
    "src/bench/handler.ts",
    "src/bench/session-state.ts",
    "src/bench/routes",
  ],
  { cwd: ROOT, stdio: "ignore" },
);
console.log(
  "Wrote src/bench/session-state.ts, src/bench/routes/*.ts and the new table in handler.ts.",
);
