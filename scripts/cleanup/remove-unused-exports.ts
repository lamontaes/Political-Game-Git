import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";

type Finding = { name: string };
type Row = {
  file: string;
  files: Finding[];
  exports: Finding[];
  types: Finding[];
  nsExports: Finding[];
  nsTypes: Finding[];
  unresolved: Finding[];
};
const [, , inventory, engine] = process.argv;
if (!inventory || !engine)
  throw new Error(
    "Usage: remove-unused-exports.ts KNIP-REPORT.json PATH-PREFIX [--apply]",
  );
const apply = process.argv.includes("--apply");
const pendingUses = new Set([
  "candidateLean",
  "campaignMentorOf",
  "placeLeanRow",
  "declineInterview",
  "CABINET_POSTS",
  "decideDeskItems",
  "pushOpinion",
]);
const declarationTypes = new Set([
  "MoneyLine",
  "LawChainLevel",
  "LawReachSide",
  "OutlookPoint",
  "HealthCase",
  "PlayerOfferV1",
  "PlayerStopV1",
  "SavedEarnedPeriodCauseV1",
  "SavedPaymentCauseV1",
  "SavedSourceResolutionV1",
  "OpeningIncomeRecipient",
]);
const { issues } = JSON.parse(readFileSync(inventory, "utf8")) as {
  issues: Row[];
};
const git = (...args: string[]) =>
  execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
process.chdir(git("rev-parse", "--show-toplevel").trim());
const tracked = new Set(
  git("ls-files", "-z")
    .split("\0")
    .filter((file) => !!file && existsSync(file)),
);
const own = (file: string) =>
  file === engine || file.startsWith(engine.replace(/\/$/, "") + "/");
const rows = issues.filter((row) => own(row.file));
const names = new Set(
  rows.flatMap((row) => [...row.exports, ...row.types].map(({ name }) => name)),
);
const owners = new Map<string, Set<string>>();
for (const row of rows)
  for (const { name } of [...row.exports, ...row.types]) {
    const files = owners.get(name) ?? new Set();
    files.add(row.file);
    owners.set(name, files);
  }
const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const references = names.size
  ? new RegExp(
      `(?<![\\w$])(?:${[...names]
        .sort((a, b) => b.length - a.length)
        .map(escape)
        .join("|")})(?![\\w$])`,
      "g",
    )
  : /(?!) /g;
const elsewhere = new Map<string, Set<string>>();
for (const file of tracked) {
  if (
    !/\.(?:[cm]?[jt]sx?|html|ya?ml|json|md)$/i.test(file) ||
    file.startsWith("docs/") ||
    file.startsWith("data/") ||
    file.includes(".generated.")
  )
    continue;
  const contents = readFileSync(file, "utf8");
  for (const [name] of contents.matchAll(references)) {
    const declarations = owners.get(name);
    if (!declarations || (declarations.size === 1 && declarations.has(file)))
      continue;
    const found = elsewhere.get(name) ?? new Set();
    if (found.size < 8) found.add(file);
    elsewhere.set(name, found);
  }
}
const results: {
  file: string;
  name: string;
  result: string;
  reason?: string;
}[] = [];
const note = (file: string, name: string, result: string, reason?: string) =>
  results.push({ file, name, result, ...(reason ? { reason } : {}) });
const identifiers = (node: ts.Node, counts: Map<string, number>) => {
  if (ts.isIdentifier(node))
    counts.set(node.text, (counts.get(node.text) ?? 0) + 1);
  ts.forEachChild(node, (child) => identifiers(child, counts));
};
function namesOf(node: ts.Statement): string[] {
  if (ts.isVariableStatement(node))
    return node.declarationList.declarations.flatMap((d) =>
      ts.isIdentifier(d.name) ? [d.name.text] : [""],
    );
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isClassDeclaration(node) ||
    ts.isEnumDeclaration(node)
  )
    return node.name ? [node.name.text] : [];
  return [];
}
for (const row of rows) {
  const { file } = row;
  const direct = new Set(
    [...row.exports, ...row.types].map(({ name }) => name),
  );
  for (const { name } of row.files)
    note(
      file,
      name,
      "keep",
      "File reachability needs an entrypoint, path, or old-test check.",
    );
  for (const { name } of [...row.nsTypes, ...row.nsExports])
    note(
      file,
      name,
      "keep",
      "Namespace membership can be read through a runtime index.",
    );
  for (const { name } of row.unresolved)
    note(
      file,
      name,
      "keep",
      "Resolve the loader's runtime route before treating this as a missing subject.",
    );
  for (const name of direct)
    if (pendingUses.has(name)) {
      direct.delete(name);
      note(
        file,
        name,
        "keep",
        "Named in an active builder or producer work item.",
      );
    }
  for (const name of direct)
    if (declarationTypes.has(name)) {
      direct.delete(name);
      note(
        file,
        name,
        "keep",
        "TypeScript needs this name for emitted public declarations.",
      );
    }
  if (!direct.size || !tracked.has(file)) continue;
  if (
    /\.(?:test|node-test|spec|browser|d)\.|\.generated\.|(?:^|\/)(?:bank|banks|scene|scenes)[-/]|\/mined\/|\/data\//.test(
      file,
    ) ||
    /^src\/(?:bench\/ui|director)\//.test(file)
  ) {
    for (const name of direct)
      note(
        file,
        name,
        "keep",
        "Protected authoring, test, generated, scene, or dynamic UI surface.",
      );
    continue;
  }
  const source = readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const counts = new Map<string, number>();
  identifiers(ast, counts);
  const edits: { from: number; to: number }[] = [];
  for (const statement of ast.statements) {
    const names = namesOf(statement);
    const modifiers = ts.canHaveModifiers(statement)
      ? ts.getModifiers(statement)
      : undefined;
    const marker = modifiers?.find(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword,
    );
    if (
      !marker ||
      !names.length ||
      !names.every((name) => direct.has(name) && !elsewhere.has(name)) ||
      modifiers?.some(
        (m) =>
          m.kind === ts.SyntaxKind.DefaultKeyword ||
          m.kind === ts.SyntaxKind.DeclareKeyword,
      )
    )
      continue;
    const pure =
      (ts.isFunctionDeclaration(statement) && !!statement.body) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement);
    // Strictly literal initializers can also go if the binding has no other mention.
    const literal =
      ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.every(
        (d) =>
          d.initializer &&
          (ts.isStringLiteral(d.initializer) ||
            ts.isNumericLiteral(d.initializer) ||
            [
              ts.SyntaxKind.TrueKeyword,
              ts.SyntaxKind.FalseKeyword,
              ts.SyntaxKind.NullKeyword,
            ].includes(d.initializer.kind)),
      );
    const start = statement.getStart(ast);
    const attached = ts
      .getLeadingCommentRanges(source, statement.getFullStart())
      ?.at(-1);
    const doc =
      attached &&
      source.startsWith("/**", attached.pos) &&
      /^\r?\n[ \t]*$/.test(source.slice(attached.end, start))
        ? attached
        : undefined;
    const protectedDoc =
      doc &&
      /\b(?:owner|CTO|ruling|SG-|stopgap)\b/i.test(
        source.slice(doc.pos, doc.end),
      );
    const authoringText =
      /^(?:src\/english|src\/director)\//.test(file) &&
      /["'`]/.test(statement.getText(ast));
    const gone =
      !/^(?:scripts|tests)\//.test(file) &&
      !authoringText &&
      !protectedDoc &&
      (pure || literal) &&
      names.every(
        (name) =>
          counts.get(name) === 1 &&
          [
            ...source.matchAll(
              new RegExp(`(?<![\\w$])${escape(name)}(?![\\w$])`, "g"),
            ),
          ].length === 1,
      );
    const from = gone ? (doc?.pos ?? start) : marker.getStart(ast);
    const end = gone ? statement.end : marker.end;
    const following = source.slice(end);
    const trim = gone
      ? (/^[ \t]*\r?\n/.exec(following)?.[0].length ?? 0)
      : (/^[ \t]+/.exec(following)?.[0].length ?? 0);
    edits.push({ from, to: end + trim });
    for (const name of names) {
      direct.delete(name);
      note(file, name, gone ? "remove declaration" : "make local");
    }
  }
  for (const name of direct) {
    const found = elsewhere.get(name);
    note(
      file,
      name,
      "keep",
      found
        ? `Matching identifier outside its declaration: ${[...found].join(", ")}`
        : "Export shape or declaration needs manual verification.",
    );
  }
  if (apply && edits.length) {
    let output = source;
    for (const { from, to } of edits.reverse())
      output = output.slice(0, from) + output.slice(to);
    if (!/(?:\r?\n){2,}$/.test(source))
      output = output.replace(
        /(?:\r?\n){2,}$/,
        source.endsWith("\r\n") ? "\r\n" : "\n",
      );
    writeFileSync(file, output);
  }
}
console.log(JSON.stringify(results, null, 2));
