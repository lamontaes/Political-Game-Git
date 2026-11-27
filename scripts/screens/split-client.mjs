/* global console, process */
/**
 * Screens item 4 (SC5 of docs/coordination/refactor/screens-2026-11-27.md): the client's big screen builders
 * move out of src/bench/play.mjs into one ui module each, as a re-runnable script (the CTO re-runs it on main
 * after Story's split lands in play.mjs).
 *
 *   node scripts/screens/split-client.mjs          write the split
 *   node scripts/screens/split-client.mjs --check  plan it and print what each moved builder reaches
 *
 * A builder cannot simply be copied: it reads and assigns the page's module variables (`me`, `controls`, the
 * screen results) and calls the page's helpers (`api`, `post`, `closeSheet`, `showPerson`). So each moved
 * builder takes one context object as its first argument, and every reference to one of the page's own names
 * becomes `ctx.<name>`; play.mjs keeps a function of the same name that calls the module with its context.
 * The context reads and writes the page's variables through getters and setters, so a builder sees the
 * current value on every read and an assignment lands in the page's own variable. A name the builder imports
 * is imported by the new module instead. Nothing else changes: the screens draw the same nodes.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as espree from "espree";
import * as eslintScope from "eslint-scope";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);
const PLAY = path.join(ROOT, "src/bench/play.mjs");
const check = process.argv.includes("--check");

// The builders that move, and the ui module each goes to. Add a row to move another.
const MOVES = [
  { name: "campaignParts", module: "campaign-screen.mjs" },
  { name: "seatRows", module: "seat-screen.mjs" },
  { name: "openBillPaper", module: "bill-paper-screen.mjs" },
  { name: "officeParts", module: "office-screen.mjs" },
  { name: "personCardNode", module: "person-card-screen.mjs" },
];

const source = readFileSync(PLAY, "utf8");
// The browser globals the page declares on its first line; a moved builder declares the ones it uses.
const PAGE_GLOBALS = new Set(
  (/^\/\* global ([^*]*)\*\//.exec(source)?.[1] ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean),
);
if (source.includes("screenContext")) {
  console.log("play.mjs is already split: it holds a screenContext.");
  process.exit(0);
}
const ast = espree.parse(source, {
  ecmaVersion: 2024,
  sourceType: "module",
  range: true,
  comment: true,
});
const scopes = eslintScope.analyze(ast, {
  ecmaVersion: 2024,
  sourceType: "module",
});
const moduleScope = scopes.scopes.find((s) => s.type === "module");

const declarationOf = (name) =>
  ast.body.find(
    (n) =>
      (n.type === "FunctionDeclaration" && n.id.name === name) ||
      (n.type === "ExportNamedDeclaration" &&
        n.declaration?.type === "FunctionDeclaration" &&
        n.declaration.id.name === name),
  );

const importOf = (variable) => {
  const def = variable.defs[0];
  return def?.type === "ImportBinding" ? def : null;
};

// What each moved builder reaches in the page's own scope.
const plans = MOVES.map((move) => {
  const node = declarationOf(move.name);
  if (!node)
    throw new Error(`play.mjs has no top-level function ${move.name}.`);
  const fnScope = scopes.acquire(node);
  const edits = []; // [start, end, text]
  const reached = new Map(); // name -> { kind, assigned }
  const imports = new Map(); // local name -> import def
  const visit = (scope) => {
    for (const ref of scope.references) {
      const variable = ref.resolved;
      if (!variable || variable.scope !== moduleScope) continue;
      const name = variable.name;
      if (name === move.name) continue;
      const imported = importOf(variable);
      if (imported) {
        imports.set(name, imported);
        continue;
      }
      const def = variable.defs[0];
      const kind =
        def?.type === "FunctionName"
          ? "function"
          : def?.node?.init?.type?.includes("Function")
            ? "arrow"
            : (def?.parent?.kind ?? "var");
      const entry = reached.get(name) ?? { kind, assigned: false };
      if (ref.isWrite()) entry.assigned = true;
      reached.set(name, entry);
      const id = ref.identifier;
      const parent = id.parent;
      // `{ name }` shorthand needs its key kept.
      const shorthand =
        parent?.type === "Property" && parent.shorthand && parent.value === id;
      edits.push([
        id.range[0],
        id.range[1],
        shorthand ? `${name}: ctx.${name}` : `ctx.${name}`,
      ]);
    }
    scope.childScopes.forEach(visit);
  };
  visit(fnScope);
  // The browser globals the builder reaches (it has no declaration for them): named on a `global` line.
  const globals = new Set();
  const through = (scope) => {
    for (const ref of scope.references)
      if (!ref.resolved && PAGE_GLOBALS.has(ref.identifier.name))
        globals.add(ref.identifier.name);
    scope.childScopes.forEach(through);
  };
  through(fnScope);
  return { move, node, edits, reached, imports, globals };
});

// Parents are not set by espree: fill them in so shorthand properties are found.
(function link(node, parent) {
  node.parent = parent;
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const value = node[key];
    if (Array.isArray(value))
      value.forEach(
        (child) => child && typeof child.type === "string" && link(child, node),
      );
    else if (value && typeof value.type === "string") link(value, node);
  }
})(ast, null);
// Re-plan now that parents exist (the first pass built edits without them).
for (const plan of plans) {
  plan.edits.length = 0;
  const fnScope = scopes.acquire(plan.node);
  const visit = (scope) => {
    for (const ref of scope.references) {
      const variable = ref.resolved;
      if (!variable || variable.scope !== moduleScope || importOf(variable))
        continue;
      const id = ref.identifier;
      const parent = id.parent;
      if (variable.name === plan.move.name) {
        // A call to itself passes the context along, since the moved function takes it first.
        if (parent?.type === "CallExpression" && parent.callee === id) {
          const open = source.indexOf("(", id.range[1]);
          plan.edits.push([
            open + 1,
            open + 1,
            parent.arguments.length ? "ctx, " : "ctx",
          ]);
        } else
          plan.edits.push([
            id.range[0],
            id.range[1],
            `((...args) => ${plan.move.name}(ctx, ...args))`,
          ]);
        continue;
      }
      const shorthand =
        parent?.type === "Property" && parent.shorthand && parent.value === id;
      plan.edits.push([
        id.range[0],
        id.range[1],
        shorthand
          ? `${variable.name}: ctx.${variable.name}`
          : `ctx.${variable.name}`,
      ]);
    }
    scope.childScopes.forEach(visit);
  };
  visit(fnScope);
}

const allReached = new Map();
for (const plan of plans)
  for (const [name, info] of plan.reached) {
    const entry = allReached.get(name) ?? { ...info };
    entry.assigned ||= info.assigned;
    allReached.set(name, entry);
  }
// A builder another moved builder calls is reached through the context too (play.mjs keeps its wrapper).
for (const plan of plans) {
  console.log(
    `${plan.move.name}: ${plan.node.loc ? "" : ""}${source.slice(plan.node.range[0], plan.node.range[1]).split("\n").length} lines -> ui/${plan.move.module}; reaches ${plan.reached.size} page names (${[...plan.reached.keys()].join(", ")}), imports ${plan.imports.size}.`,
  );
}
const assigned = [...allReached]
  .filter(([, info]) => info.assigned)
  .map(([name]) => name);
console.log(
  `${allReached.size} names in the context; ${assigned.length} assigned by a builder (${assigned.join(", ")}).`,
);
if (check) process.exit(0);

// ---- write the modules
const importLine = (def) => {
  const decl = def.parent;
  const from = decl.source.value;
  let spec = from;
  // play.mjs sits in src/bench; a ui module sits in src/bench/ui.
  if (spec.startsWith("./ui/")) spec = `./${spec.slice(5)}`;
  else if (spec.startsWith("./")) spec = `../${spec.slice(2)}`;
  else if (spec.startsWith("../")) spec = `../../${spec.slice(3)}`;
  const node = def.node;
  let clause;
  if (node.type === "ImportDefaultSpecifier") clause = node.local.name;
  else if (node.type === "ImportNamespaceSpecifier")
    clause = `* as ${node.local.name}`;
  else
    clause =
      node.imported.name === node.local.name
        ? `{ ${node.local.name} }`
        : `{ ${node.imported.name} as ${node.local.name} }`;
  return { spec, clause, kind: node.type };
};

const rewrite = (plan) => {
  const [start, end] = plan.node.range;
  let text = source.slice(start, end);
  for (const [s, e, replacement] of [...plan.edits].sort((a, b) => b[0] - a[0]))
    text = text.slice(0, s - start) + replacement + text.slice(e - start);
  // The function takes the context first; the name gets a suffix the page's wrapper does not use.
  return text.replace(
    /^(async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/,
    (_, a, name) =>
      `export ${a ?? ""}function ${name}(ctx${plan.node.params.length ? ", " : ""}`,
  );
};

const wrappers = [];
for (const plan of plans) {
  const byModule = new Map();
  for (const [, def] of plan.imports) {
    const { spec, clause, kind } = importLine(def);
    const record = byModule.get(spec) ?? { named: [], def: null, ns: null };
    if (kind === "ImportDefaultSpecifier") record.def = clause;
    else if (kind === "ImportNamespaceSpecifier") record.ns = clause;
    else record.named.push(clause.replace(/^\{ | \}$/g, ""));
    byModule.set(spec, record);
  }
  const lines = [...byModule].map(([spec, r]) => {
    const parts = [
      r.def,
      r.ns,
      r.named.length ? `{ ${r.named.join(", ")} }` : null,
    ].filter(Boolean);
    return `import ${parts.join(", ")} from "${spec}";`;
  });
  const globalLine = plan.globals.size
    ? `/* global ${[...plan.globals].sort().join(", ")} */\n`
    : "";
  const header = `${globalLine}// Moved out of src/bench/play.mjs by scripts/screens/split-client.mjs: ${plan.move.name} takes the page's context first.\n`;
  const body = `${header}${lines.join("\n")}\n\n${rewrite(plan)}\n`;
  writeFileSync(path.join(ROOT, "src/bench/ui", plan.move.module), body);
  wrappers.push(plan);
}

// play.mjs: the moved functions become one-line callers, and the context object is added once.
let out = source;
const cuts = plans
  .map((p) => [p.node.range[0], p.node.range[1], p])
  .sort((a, b) => b[0] - a[0]);
for (const [s, e, plan] of cuts) {
  const asyncWord = plan.node.async ? "async " : "";
  const alias = `${plan.move.name}In`;
  out = `${out.slice(0, s)}${asyncWord}function ${plan.move.name}(...args) {\n  return ${alias}(screenContext, ...args);\n}${out.slice(e)}`;
}
const getters = [...allReached.keys()]
  .sort()
  .map((name) => {
    const info = allReached.get(name);
    return info.assigned
      ? `  get ${name}() {\n    return ${name};\n  },\n  set ${name}(value) {\n    ${name} = value;\n  },`
      : `  get ${name}() {\n    return ${name};\n  },`;
  })
  .join("\n");
const imports = plans
  .map(
    (p) =>
      `import { ${p.move.name} as ${p.move.name}In } from "./ui/${p.move.module}";`,
  )
  .join("\n");
const lastImport = ast.body
  .filter((n) => n.type === "ImportDeclaration")
  .at(-1);
const insertAt = lastImport.range[1];
const adjust = (n) => n; // the cuts all lie after the imports, so offsets before them are unchanged
out = `${out.slice(0, insertAt)}\n${imports}${out.slice(insertAt)}`;
// The context follows the page's own declarations; its members are read lazily, so any place after the imports works.
out = out.replace(
  /\n(async\s+)?function api\(/,
  `\n// What the moved screen builders reach in this page (scripts/screens/split-client.mjs).\nconst screenContext = {\n${getters}\n};\n\n$1function api(`,
);
writeFileSync(PLAY, adjust(out));

// Drop the page's imports that nothing in it uses now.
{
  const text = readFileSync(PLAY, "utf8");
  const tree = espree.parse(text, {
    ecmaVersion: 2024,
    sourceType: "module",
    range: true,
  });
  const manager = eslintScope.analyze(tree, {
    ecmaVersion: 2024,
    sourceType: "module",
  });
  const top = manager.scopes.find((sc) => sc.type === "module");
  const cuts = [];
  for (const decl of tree.body.filter((n) => n.type === "ImportDeclaration")) {
    const used = decl.specifiers.filter(
      (sp) => (top.set.get(sp.local.name)?.references.length ?? 0) > 0,
    );
    if (used.length === decl.specifiers.length) continue;
    if (used.length === 0) cuts.push([decl.range[0], decl.range[1], ""]);
    else {
      const def = used
        .filter((sp) => sp.type === "ImportDefaultSpecifier")
        .map((sp) => sp.local.name);
      const ns = used
        .filter((sp) => sp.type === "ImportNamespaceSpecifier")
        .map((sp) => `* as ${sp.local.name}`);
      const named = used
        .filter((sp) => sp.type === "ImportSpecifier")
        .map((sp) =>
          sp.imported.name === sp.local.name
            ? sp.local.name
            : `${sp.imported.name} as ${sp.local.name}`,
        );
      const parts = [
        ...def,
        ...ns,
        ...(named.length ? [`{ ${named.join(", ")} }`] : []),
      ];
      cuts.push([
        decl.range[0],
        decl.range[1],
        `import ${parts.join(", ")} from ${JSON.stringify(decl.source.value)};`,
      ]);
    }
  }
  let next = text;
  for (const [a, b, replacement] of cuts.sort((x, y) => y[0] - x[0]))
    next = next.slice(0, a) + replacement + next.slice(b);
  writeFileSync(PLAY, next);
}
execFileSync(
  "npx",
  [
    "prettier",
    "--write",
    "src/bench/play.mjs",
    ...plans.map((p) => `src/bench/ui/${p.move.module}`),
  ],
  { cwd: ROOT, stdio: "ignore" },
);
try {
  execFileSync(
    "npx",
    ["eslint", "--fix", "--rule", "no-unused-vars:error", "src/bench/play.mjs"],
    { cwd: ROOT, stdio: "pipe" },
  );
} catch (error) {
  console.log(String(error.stdout).split("\n").slice(0, 20).join("\n"));
}
console.log(`Wrote ${plans.length} ui modules and the context in play.mjs.`);
