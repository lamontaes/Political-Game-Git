/**
 * Splits one long function that runs as a pipeline into named steps, as a
 * text move (People item 3).
 *
 *   node --import tsx scripts/people/split-pipeline.ts <file> <function> \
 *     <name>@<line> <name>@<line> ...
 *
 * Each `name@line` starts a step at the top-level statement that begins on that
 * line (1-based); the first step starts at the function's first statement.
 * The function's own top-level locals (`const`, `let`, `function`) are found
 * with the type checker's own symbols, and a local made in one step and read in
 * a later one is returned by the step that makes it and handed to the steps
 * that read it, so no name is passed by hand and no statement is rewritten.
 * Steps are module-level functions named `<function>` + the step's name. The
 * original function keeps its signature and calls the steps in order; its last
 * step is the one holding the final `return`.
 *
 * It refuses, and changes nothing, when a step cannot be moved as text:
 *   - a local made in one step is assigned in a later one (a `let` carried
 *     across steps needs an owner, which is a person's call);
 *   - an early `return` sits in a step other than the last;
 *   - the function uses `this` or `arguments`.
 * Prettier and eslint are run afterwards by the caller.
 */
import { readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";

const [file, fnName, ...starts] = process.argv.slice(2);
const listOnly = starts[0] === "--list";
if (!file || !fnName || (!listOnly && starts.length < 2))
  throw new Error("usage: split-pipeline <file> <function> <name>@<line>...");
const cuts = (listOnly ? [] : starts).map((s) => {
  const [name, line] = s.split("@");
  return { name: name!, line: Number(line) };
});

const text = readFileSync(file, "utf8");
const program = ts.createProgram([file], {
  noEmit: true,
  allowJs: false,
  resolveJsonModule: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  skipLibCheck: true,
  noResolve: true,
});
const source = program.getSourceFile(file)!;
const checker = program.getTypeChecker();

let fn: ts.FunctionDeclaration | undefined;
source.forEachChild((node) => {
  if (ts.isFunctionDeclaration(node) && node.name?.text === fnName) fn = node;
});
if (!fn?.body) throw new Error(`no function ${fnName} in ${file}`);
const body = fn.body;
const lineOf = (pos: number) =>
  source.getLineAndCharacterOfPosition(pos).line + 1;

const statements = [...body.statements];
if (listOnly) {
  for (const st of statements)
    console.log(
      `${lineOf(st.getStart())}: ${st.getText(source).split("\n")[0]!.slice(0, 90)}`,
    );
  process.exit(0);
}
const stepOf = (stmt: ts.Statement): number => {
  const line = lineOf(stmt.getStart());
  let at = 0;
  cuts.forEach((cut, i) => {
    if (line >= cut.line) at = i;
  });
  return at;
};
for (const cut of cuts)
  if (!statements.some((s) => lineOf(s.getStart()) === cut.line))
    throw new Error(`no top-level statement starts at line ${cut.line}`);
if (lineOf(statements[0]!.getStart()) < cuts[0]!.line)
  throw new Error("the first step must start at the first statement");

// Top-level locals, each with the step that makes it.
const madeIn = new Map<string, number>();
const symbolsMade = new Map<ts.Symbol, string>();
const bindingNames = (name: ts.BindingName, out: ts.Identifier[]) => {
  if (ts.isIdentifier(name)) out.push(name);
  else
    for (const el of name.elements)
      if (ts.isBindingElement(el)) bindingNames(el.name, out);
};
for (const stmt of statements) {
  const step = stepOf(stmt);
  const ids: ts.Identifier[] = [];
  if (ts.isVariableStatement(stmt))
    for (const d of stmt.declarationList.declarations)
      bindingNames(d.name, ids);
  else if (ts.isFunctionDeclaration(stmt) && stmt.name) ids.push(stmt.name);
  for (const id of ids) {
    madeIn.set(id.text, step);
    const symbol = checker.getSymbolAtLocation(id);
    if (symbol) symbolsMade.set(symbol, id.text);
  }
}

// Parameters each step reads.
const paramSymbols = new Map<ts.Symbol, number>();
fn.parameters.forEach((p, i) => {
  const symbol = checker.getSymbolAtLocation(p.name);
  if (symbol) paramSymbols.set(symbol, i);
});
const paramUsedBy = fn.parameters.map(() => new Set<number>());

// Which steps read each local, and whether a later step assigns it.
const readBy = new Map<string, Set<number>>();
const assignedInClosure = new Set<string>();
const fail = (why: string): never => {
  throw new Error(`refused: ${why}`);
};
const visit = (node: ts.Node, step: number, stmt: ts.Statement) => {
  if (node.kind === ts.SyntaxKind.ThisKeyword) fail("uses this");
  if (ts.isIdentifier(node) && node.text === "arguments")
    fail("uses arguments");
  if (ts.isReturnStatement(node)) {
    // A return belongs to this function only outside nested functions.
    let p: ts.Node | undefined = node.parent;
    let nested = false;
    while (p && p !== body) {
      if (ts.isFunctionLike(p)) nested = true;
      p = p.parent;
    }
    if (!nested && step !== cuts.length - 1)
      fail("an early return outside the last step");
  }
  if (ts.isIdentifier(node)) {
    // A shorthand property reads the local through its value symbol.
    const target = ts.isShorthandPropertyAssignment(node.parent)
      ? checker.getShorthandAssignmentValueSymbol(node.parent)
      : checker.getSymbolAtLocation(node);
    const paramAt = target ? paramSymbols.get(target) : undefined;
    if (paramAt !== undefined) paramUsedBy[paramAt]!.add(step);
    const name = target ? symbolsMade.get(target) : undefined;
    if (name !== undefined && node !== undefined) {
      const made = madeIn.get(name)!;
      const isDeclaration =
        (ts.isVariableDeclaration(node.parent) && node.parent.name === node) ||
        (ts.isBindingElement(node.parent) && node.parent.name === node) ||
        (ts.isFunctionDeclaration(node.parent) && node.parent.name === node);
      if (!isDeclaration) {
        const parent = node.parent;
        const assignedHere =
          (ts.isBinaryExpression(parent) &&
            parent.left === node &&
            parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
          ((ts.isPrefixUnaryExpression(parent) ||
            ts.isPostfixUnaryExpression(parent)) &&
            (parent.operator === ts.SyntaxKind.PlusPlusToken ||
              parent.operator === ts.SyntaxKind.MinusMinusToken));
        if (assignedHere) {
          for (
            let q: ts.Node | undefined = node.parent;
            q && q !== stmt;
            q = q.parent
          )
            if (ts.isFunctionLike(q)) assignedInClosure.add(name);
        }
      }
      if (!isDeclaration && step !== made) {
        if (step < made)
          fail(`${name} is read in an earlier step than the one making it`);
        (readBy.get(name) ?? readBy.set(name, new Set()).get(name)!).add(step);
        const parent = node.parent;
        const assigned =
          (ts.isBinaryExpression(parent) &&
            parent.left === node &&
            parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
          ((ts.isPrefixUnaryExpression(parent) ||
            ts.isPostfixUnaryExpression(parent)) &&
            (parent.operator === ts.SyntaxKind.PlusPlusToken ||
              parent.operator === ts.SyntaxKind.MinusMinusToken));
        if (assigned)
          fail(`${name} is made in one step and assigned in a later one`);
      }
    }
  }
  node.forEachChild((child) => visit(child, step, stmt));
};
for (const stmt of statements) visit(stmt, stepOf(stmt), stmt);
for (const name of assignedInClosure)
  if (readBy.has(name))
    fail(
      `${name} is assigned inside a closure and read by a later step, so a copy handed on would go stale`,
    );

// Build the steps.
const params = fn.parameters.map((p) => p.getText(source));
const paramNames = fn.parameters.map((p) => p.name.getText(source));
const typeParams = fn.typeParameters
  ? `<${fn.typeParameters.map((t) => t.getText(source)).join(", ")}>`
  : "";
const stepFn = (i: number) =>
  `${fnName}${cuts[i]!.name[0]!.toUpperCase()}${cuts[i]!.name.slice(1)}`;
const returnedBy = (i: number) =>
  [...madeIn]
    .filter(
      ([name, step]) =>
        step === i && [...(readBy.get(name) ?? [])].some((s) => s > i),
    )
    .map(([name]) => name);
const readsFrom = (i: number, earlier: number) =>
  [...readBy]
    .filter(([name, steps]) => madeIn.get(name) === earlier && steps.has(i))
    .map(([name]) => name);

const out: string[] = [];
const calls: string[] = [];
const returnType = fn.type ? fn.type.getText(source) : undefined;
for (let i = 0; i < cuts.length; i += 1) {
  const mine = statements.filter((s) => stepOf(s) === i);
  const first = mine[0]!.getFullStart();
  const last = mine[mine.length - 1]!.getEnd();
  const code = text.slice(first, last);
  const carried: string[] = [];
  const handed: string[] = [];
  for (let e = 0; e < i; e += 1) {
    const names = readsFrom(i, e);
    if (names.length) {
      carried.push(
        `  const { ${names.join(", ")} } = from${cuts[e]!.name[0]!.toUpperCase()}${cuts[e]!.name.slice(1)};`,
      );
      handed.push(
        `from${cuts[e]!.name[0]!.toUpperCase()}${cuts[e]!.name.slice(1)}: ReturnType<typeof ${stepFn(e)}>`,
      );
    }
  }
  const names = returnedBy(i);
  const lastStep = i === cuts.length - 1;
  const ret = lastStep
    ? ""
    : names.length
      ? `\n  return { ${names.join(", ")} };`
      : "";
  const sig = [
    ...params.filter((_, k) => paramUsedBy[k]!.has(i)),
    ...handed,
  ].join(", ");
  out.push(
    `${i === 0 ? "" : ""}function ${stepFn(i)}${typeParams}(${sig})${lastStep && returnType ? `: ${returnType}` : ""} {\n${carried.join("\n")}${code}${ret}\n}\n`,
  );
  const passed: string[] = paramNames.filter((_, k) => paramUsedBy[k]!.has(i));
  for (let e = 0; e < i; e += 1)
    if (readsFrom(i, e).length)
      passed.push(
        `from${cuts[e]!.name[0]!.toUpperCase()}${cuts[e]!.name.slice(1)}`,
      );
  calls.push(
    lastStep
      ? `  return ${stepFn(i)}(${passed.join(", ")});`
      : names.length
        ? `  const from${cuts[i]!.name[0]!.toUpperCase()}${cuts[i]!.name.slice(1)} = ${stepFn(i)}(${passed.join(", ")});`
        : `  ${stepFn(i)}(${passed.join(", ")});`,
  );
}
const header = text.slice(fn.getStart(source), body.getStart() + 1);
const original = `${header}\n${calls.join("\n")}\n}`;
const lead = text.slice(0, fn.getFullStart());
const trail = text.slice(fn.getEnd());
const docs = text.slice(fn.getFullStart(), fn.getStart(source));
writeFileSync(file, `${lead}${out.join("\n")}\n${docs}${original}${trail}`);
console.log(
  `${fnName}: ${statements.length} statements into ${cuts.length} steps; ` +
    cuts
      .map((c, i) => `${stepFn(i)} returns ${returnedBy(i).length}`)
      .join(", "),
);
