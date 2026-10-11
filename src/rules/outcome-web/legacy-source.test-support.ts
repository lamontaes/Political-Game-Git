import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const factories = new Map<string, (...values: unknown[]) => unknown>();
/** Test-only access to private legacy declarations. Their source is parsed, never edited.
 * Dependencies replace record lookup/writing only; the oracle's rule body is unchanged. */
export function legacyDeclarations<T>(
  file: string,
  names: readonly string[],
  dependencies: Readonly<Record<string, unknown>> = {},
): T {
  const keys = Object.keys(dependencies);
  const cacheKey = JSON.stringify([file, names, keys]);
  const cached = factories.get(cacheKey);
  if (cached) return cached(...keys.map((key) => dependencies[key])) as T;
  const path = fileURLToPath(
    new URL(`../../simulation/${file}`, import.meta.url),
  );
  const source = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const declarations = names
    .map((name) => {
      const node = source.statements.find(
        (statement) =>
          ("name" in statement &&
            (statement.name as ts.Identifier | undefined)?.text === name) ||
          (ts.isVariableStatement(statement) &&
            statement.declarationList.declarations.some(
              (declaration) =>
                ts.isIdentifier(declaration.name) &&
                declaration.name.text === name,
            )),
      );
      if (!node) throw new Error(`Missing legacy declaration ${file}:${name}`);
      return node.getText(source).replace(/^export\s+/, "");
    })
    .join("\n");
  const javascript = ts.transpileModule(
    declarations + `\nreturn {${names.join(",")}};`,
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.None,
      },
    },
  ).outputText;
  const factory = new Function(...keys, javascript) as (
    ...values: unknown[]
  ) => T;
  factories.set(cacheKey, factory);
  return factory(...keys.map((key) => dependencies[key]));
}
export function resultOf(action: () => unknown): unknown {
  try {
    return { value: action() };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
