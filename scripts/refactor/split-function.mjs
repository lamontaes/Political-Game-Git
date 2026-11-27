// usage: node scripts/refactor/split-function.mjs <file> <functionName> <prefix> <startLine:name>...
// Splits a function's top-level statements into named phase functions that pass a context object.
import fs from "node:fs";
import process from "node:process";
import ts from "typescript";
const [file, fnName, prefix, ...cuts] = process.argv.slice(2);
const text = fs.readFileSync(file, "utf8");
const program = ts.createProgram([file], {
  noResolve: true,
  target: ts.ScriptTarget.ES2022,
  allowJs: false,
  noEmit: true,
  skipLibCheck: true,
  types: [],
});
const sf2 = program.getSourceFile(file);
const checker = program.getTypeChecker();
let fn;
ts.forEachChild(sf2, (n) => {
  if (ts.isFunctionDeclaration(n) && n.name?.text === fnName) fn = n;
});
if (!fn) throw new Error("no function " + fnName);
const stmts = fn.body.statements;
const lineOf = (pos) => sf2.getLineAndCharacterOfPosition(pos).line + 1;
const parsed = cuts.map((c) => {
  const [l, name] = c.split(":");
  return { line: Number(l), name };
});
// phase boundaries: index of the statement starting at each cut line
const starts = parsed.map((c) => {
  const i = stmts.findIndex((s) => lineOf(s.getStart(sf2)) === c.line);
  if (i < 0)
    throw new Error(
      "no statement starts at line " +
        c.line +
        "; starts: " +
        stmts.map((s) => lineOf(s.getStart(sf2))).join(","),
    );
  return i;
});
const phases = parsed.map((c, k) => ({
  name: c.name,
  from: starts[k],
  to: k + 1 < starts.length ? starts[k + 1] : stmts.length,
}));
if (starts[0] !== 0)
  throw new Error(
    "first cut must be at the first statement; first starts at " +
      lineOf(stmts[0].getStart(sf2)),
  );
// which phase declares each symbol
const declPhase = new Map();
const phaseOfStmt = (idx) =>
  phases.findIndex((p) => idx >= p.from && idx < p.to);
function declNames(node, out) {
  if (ts.isIdentifier(node)) out.push(node);
  else if (ts.isObjectBindingPattern(node) || ts.isArrayBindingPattern(node))
    for (const e of node.elements)
      if (!ts.isOmittedExpression(e)) declNames(e.name, out);
}
const declared = phases.map(() => []);
stmts.forEach((s, idx) => {
  const ph = phaseOfStmt(idx);
  const names = [];
  if (ts.isVariableStatement(s))
    for (const d of s.declarationList.declarations) declNames(d.name, names);
  else if (ts.isFunctionDeclaration(s) && s.name) names.push(s.name);
  for (const n of names) {
    const sym = checker.getSymbolAtLocation(n);
    if (sym) {
      declPhase.set(sym, ph);
      declared[ph].push(n.text);
    }
  }
});
// params belong to "phase -1": they travel in ctx as well
const paramNames = fn.parameters.map((p) => p.name.getText(sf2));
const paramSyms = new Map();
for (const p of fn.parameters) {
  const s = checker.getSymbolAtLocation(p.name);
  if (s) paramSyms.set(s, p.name.getText(sf2));
}
const uses = phases.map(() => new Set());
const problems = [];
function visit(node, ph) {
  if (ts.isIdentifier(node)) {
    const parent = node.parent;
    if (parent && ts.isPropertyAccessExpression(parent) && parent.name === node)
      return;
    if (parent && ts.isPropertyAssignment(parent) && parent.name === node)
      return;
    if (parent && ts.isBindingElement(parent) && parent.propertyName === node)
      return;
    let sym = checker.getSymbolAtLocation(node);
    if (
      parent &&
      ts.isShorthandPropertyAssignment(parent) &&
      parent.name === node
    )
      sym = checker.getShorthandAssignmentValueSymbol(parent);
    if (!sym) return;
    if (declPhase.has(sym) && declPhase.get(sym) !== ph) {
      if (declPhase.get(sym) > ph)
        problems.push(
          `${node.text} used in phase ${ph} before declared in ${declPhase.get(sym)}`,
        );
      else {
        uses[ph].add(node.text);
        // reassignment across phases?
        const p = node.parent;
        if (
          (ts.isBinaryExpression(p) &&
            p.left === node &&
            p.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            p.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
          ts.isPostfixUnaryExpression(p) ||
          (ts.isPrefixUnaryExpression(p) &&
            [
              ts.SyntaxKind.PlusPlusToken,
              ts.SyntaxKind.MinusMinusToken,
            ].includes(p.operator))
        )
          problems.push(
            `${node.text} reassigned in phase ${ph}, declared in ${declPhase.get(sym)}`,
          );
      }
    } else if (paramSyms.has(sym)) uses[ph].add(paramSyms.get(sym));
  }
  ts.forEachChild(node, (c) => visit(c, ph));
}
stmts.forEach((s, idx) => visit(s, phaseOfStmt(idx)));
if (problems.length) {
  process.stderr.write(
    "PROBLEMS:\n" + [...new Set(problems)].join("\n") + "\n",
  );
  process.exit(2);
}
// emit
const full = (a, b) => text.slice(a, b);
const bodyEnd = fn.body.getEnd() - 1;
const segText = phases.map((p) =>
  full(
    stmts[p.from].getFullStart(),
    p.to < stmts.length ? stmts[p.to].getFullStart() : bodyEnd,
  ),
);
const last = phases.length - 1;
const ctxType = (k) =>
  k === 0 ? null : `ReturnType<typeof ${prefix}${cap(phases[k - 1].name)}>`;
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const fnHeader = text.slice(fn.getStart(sf2), fn.body.getStart(sf2));
const newFns = [];
phases.forEach((p, k) => {
  let body = segText[k];
  const need = [...uses[k]];
  const destructure = need.length
    ? `  const { ${need.join(", ")} } = ctx;\n`
    : "";
  let tail;
  if (k === last) tail = "";
  else {
    const mine = declared[k];
    tail = `\n  return { ...ctx, ${mine.join(", ")} };\n`;
  }
  const params =
    k === 0
      ? fn.parameters.map((q) => q.getText(sf2)).join(", ")
      : `ctx: ${ctxType(k)}`;
  const retAnn = k === last && fn.type ? `: ${fn.type.getText(sf2)}` : "";
  let head = k === 0 ? "" : destructure;
  if (k === 0) {
    // first phase: params are its own; make ctx contain them
    tail = `\n  return { ${[...new Set([...paramNames, ...declared[0]])].join(", ")} };\n`;
  }
  newFns.push(
    `function ${prefix}${cap(p.name)}(${params})${k === last ? retAnn : ""} {\n${head}${body.replace(/^\n+/, "")}${tail}}\n`,
  );
});
// the wrapper
const wrapperBody = phases
  .map((p, k) =>
    k === 0
      ? `  const ctx0 = ${prefix}${cap(p.name)}(${paramNames.join(", ")});`
      : k === last
        ? `  return ${prefix}${cap(p.name)}(ctx${k - 1});`
        : `  const ctx${k} = ${prefix}${cap(p.name)}(ctx${k - 1});`,
  )
  .join("\n");
const wrapper = `${fnHeader}{\n${wrapperBody}\n}\n`;
const before = text.slice(0, fn.getFullStart());
const after = text.slice(fn.getEnd());
const docText = fn
  .getFullText(sf2)
  .slice(0, fn.getStart(sf2) - fn.getFullStart());
fs.writeFileSync(
  file,
  before + docText + wrapper + "\n" + newFns.join("\n") + after,
);
process.stderr.write(
  `phases: ${phases
    .map(
      (p, k) =>
        `${p.name}(${declared[k].length} declared, uses ${uses[k].size})`,
    )
    .join(", ")}\n`,
);
