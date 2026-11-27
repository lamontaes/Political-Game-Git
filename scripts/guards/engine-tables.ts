/**
 * Measures one engine opening another engine's records (core review K8,
 * Nov 26): a file in one family that opens a module table another family owns
 * (`api.moduleState(ID)`), puts or removes a row in it, or writes straight
 * into a state map another engine owns (`core.jobs.set(...)`).
 *
 * The owner of a module table is the file whose module object holds both the
 * module's `id` and its `state` tables; the caller's engine is the family of
 * the file the call is in (tests/guards/families.json). Module rows are
 * frozen when they are put and read, so a row cannot be edited in place; the
 * write kinds measured here are `put`, `putOwned`, `remove` and `restore`,
 * followed from the table back to the `moduleState` call it came from
 * through variables. A table handed to a function as an argument is followed
 * no further, and is counted as a write the scan cannot place.
 *
 * Read by tests/guards/engine-tables.test.ts. About 30 seconds: it builds a
 * type-checker program over the game's source.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { familyOf } from "./families";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

/** `core.<map>` state maps: the engine that owns each. The core's own maps are not listed. */
export const STATE_MAP_OWNER: Readonly<Record<string, string>> = {
  people: "people",
  husks: "people",
  households: "people",
  relationships: "people",
  familyLinks: "people",
  memberships: "people",
  jobs: "jobs-businesses",
  organizations: "jobs-businesses",
  publicOrganizations: "elections",
};
const WRITE_ON_MAP = new Set(["set", "delete", "clear"]);
const WRITE_ON_TABLE = new Set(["put", "putOwned", "remove", "restore"]);

export type Counts = Record<string, Record<string, number>>;
export interface Measurement {
  /** caller file -> owning family -> tables opened. */
  opens: Counts;
  /** caller file -> owning family -> rows put, removed or restored in another family's table. */
  writes: Counts;
  /** caller file -> state map -> direct writes into another engine's map. */
  mapWrites: Counts;
  /** caller file -> `moduleState` calls whose module id is not a constant. */
  dynamic: Record<string, number>;
}

function sourceFiles(): string[] {
  return execFileSync("git", ["ls-files", "src"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\n")
    .filter(
      (file) =>
        /\.(ts|tsx)$/.test(file) &&
        !/\.(test|spec|browser)\.(ts|tsx)$/.test(file) &&
        !/\.d\.ts$/.test(file) &&
        !file.startsWith("src/core2/tooling/"),
    );
}

function bump(counts: Counts, file: string, key: string): void {
  const row = (counts[file] ??= {});
  row[key] = (row[key] ?? 0) + 1;
}

export function measure(): Measurement {
  const files = sourceFiles();
  const program = ts.createProgram(
    files.map((file) => path.join(ROOT, file)),
    {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      skipLibCheck: true,
      noEmit: true,
      strict: true,
      resolveJsonModule: true,
      types: [],
    },
  );
  const checker = program.getTypeChecker();
  const mine = new Set(files.map((file) => path.join(ROOT, file)));
  const rel = (file: string) => path.relative(ROOT, file);
  const literal = (node: ts.Node): string | null => {
    const type = checker.getTypeAtLocation(node);
    return type.isStringLiteral() ? type.value : null;
  };
  const isModuleStateCall = (node: ts.Node): node is ts.CallExpression =>
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === "moduleState" &&
    node.arguments.length === 1;

  const owner = new Map<string, string>();
  const calls: { file: string; node: ts.CallExpression }[] = [];
  const tableWrites: { file: string; receiver: ts.Expression }[] = [];
  const mapWrites: { file: string; map: string }[] = [];

  for (const source of program.getSourceFiles()) {
    if (!mine.has(source.fileName)) continue;
    const file = rel(source.fileName);
    const visit = (node: ts.Node): void => {
      if (isModuleStateCall(node)) calls.push({ file, node });
      if (ts.isObjectLiteralExpression(node)) {
        const has = (key: string) =>
          node.properties.some(
            (property) =>
              (ts.isPropertyAssignment(property) ||
                ts.isShorthandPropertyAssignment(property) ||
                ts.isMethodDeclaration(property)) &&
              property.name.getText() === key,
          );
        if (has("id") && has("state")) {
          const id = node.properties.find(
            (property): property is ts.PropertyAssignment =>
              ts.isPropertyAssignment(property) &&
              property.name.getText() === "id",
          );
          const value = id && literal(id.initializer);
          if (value) {
            const known = owner.get(value);
            if (
              !known ||
              (!known.includes("/modules/") && file.includes("/modules/"))
            )
              owner.set(value, file);
          }
        }
      }
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression)
      ) {
        const method = node.expression.name.text;
        const receiver = node.expression.expression;
        if (WRITE_ON_TABLE.has(method)) tableWrites.push({ file, receiver });
        if (
          WRITE_ON_MAP.has(method) &&
          ts.isPropertyAccessExpression(receiver) &&
          STATE_MAP_OWNER[receiver.name.text] !== undefined &&
          checker.getTypeAtLocation(receiver.expression).symbol?.name ===
            "CoreState"
        )
          mapWrites.push({ file, map: receiver.name.text });
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  const out: Measurement = {
    opens: {},
    writes: {},
    mapWrites: {},
    dynamic: {},
  };
  const crosses = (file: string, ownerFile: string | undefined) => {
    if (!ownerFile) return null;
    const to = familyOf(ownerFile);
    if (!to || to === "shared") return null;
    return familyOf(file) === to ? null : to;
  };

  for (const { file, node } of calls) {
    const id = literal(node.arguments[0]!);
    if (id === null) {
      bump(out.opens, file, "dynamic");
      out.dynamic[file] = (out.dynamic[file] ?? 0) + 1;
      continue;
    }
    const to = crosses(file, owner.get(id));
    if (to) bump(out.opens, file, to);
  }

  /** The `moduleState` call a table or store value came from, followed through variables. */
  const originOf = (
    expression: ts.Expression,
    depth = 0,
  ): ts.CallExpression | null => {
    let at: ts.Expression = expression;
    for (;;) {
      if (isModuleStateCall(at)) return at;
      if (ts.isCallExpression(at) && ts.isIdentifier(at.expression)) {
        // A helper such as `table(api, "rows")`: follow what it returns.
        const callee = checker.getSymbolAtLocation(
          at.expression,
        )?.valueDeclaration;
        const fn =
          callee && ts.isVariableDeclaration(callee)
            ? callee.initializer
            : callee;
        if (
          depth > 4 ||
          !fn ||
          !(
            ts.isFunctionDeclaration(fn) ||
            ts.isArrowFunction(fn) ||
            ts.isFunctionExpression(fn)
          )
        )
          return null;
        const returns: ts.Expression[] = [];
        if (fn.body && !ts.isBlock(fn.body)) returns.push(fn.body);
        else if (fn.body) {
          const find = (node: ts.Node): void => {
            if (ts.isReturnStatement(node) && node.expression)
              returns.push(node.expression);
            else if (!ts.isFunctionLike(node) || node === fn)
              ts.forEachChild(node, find);
          };
          find(fn.body);
        }
        for (const returned of returns) {
          const found = originOf(returned, depth + 1);
          if (found) return found;
        }
        return null;
      }
      if (
        ts.isCallExpression(at) &&
        ts.isPropertyAccessExpression(at.expression)
      )
        at = at.expression.expression;
      else if (ts.isPropertyAccessExpression(at) || ts.isNonNullExpression(at))
        at = at.expression;
      else if (ts.isParenthesizedExpression(at) || ts.isAsExpression(at))
        at = at.expression;
      else break;
    }
    if (!ts.isIdentifier(at) || depth > 4) return null;
    const declaration = checker.getSymbolAtLocation(at)?.valueDeclaration;
    if (
      declaration &&
      ts.isVariableDeclaration(declaration) &&
      declaration.initializer
    )
      return originOf(declaration.initializer, depth + 1);
    return null;
  };

  for (const { file, receiver } of tableWrites) {
    const type = checker.getTypeAtLocation(receiver).symbol?.name;
    if (type !== "ModuleTable" && type !== "ModuleStateStore") continue;
    const call = originOf(receiver);
    if (!call) {
      bump(out.writes, file, "unplaced");
      continue;
    }
    const id = literal(call.arguments[0]!);
    if (id === null) {
      bump(out.writes, file, "dynamic");
      continue;
    }
    const to = crosses(file, owner.get(id));
    if (to) bump(out.writes, file, to);
  }

  for (const { file, map } of mapWrites) {
    const to = STATE_MAP_OWNER[map]!;
    if (familyOf(file) !== to) bump(out.mapWrites, file, map);
  }

  const sorted = (counts: Counts): Counts =>
    Object.fromEntries(
      Object.keys(counts)
        .sort()
        .map((file) => [
          file,
          Object.fromEntries(
            Object.entries(counts[file]!).sort(([a], [b]) =>
              a.localeCompare(b),
            ),
          ),
        ]),
    );
  return {
    opens: sorted(out.opens),
    writes: sorted(out.writes),
    mapWrites: sorted(out.mapWrites),
    dynamic: Object.fromEntries(Object.entries(out.dynamic).sort()),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = measure();
  const total = (counts: Counts) =>
    Object.values(counts).reduce(
      (sum, row) => sum + Object.values(row).reduce((a, b) => a + b, 0),
      0,
    );
  console.error(
    `tables opened across families: ${total(result.opens)} in ${Object.keys(result.opens).length} files; ` +
      `rows written: ${total(result.writes)} in ${Object.keys(result.writes).length} files; ` +
      `state maps written: ${total(result.mapWrites)} in ${Object.keys(result.mapWrites).length} files`,
  );
  console.log(JSON.stringify(result, null, 2));
}
