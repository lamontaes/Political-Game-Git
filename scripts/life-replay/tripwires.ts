import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import registry from "../../data/life-replay/stopgaps.json";
import { ONE, ZERO, parameterProblems, parameterTable } from "./parameters";

export interface StopgapEntry {
  id: string;
  kind: string;
  file: string;
  line: number;
  whatItFakes: string;
  why: string;
  who: string;
  when: string;
  replacement: string;
  status: "open" | "replaced";
}

export type StopgapBanner = { tone: "red"; id: string; message: string };
export type StopgapSink = (banner: StopgapBanner) => void;

export function stopgap(id: string, sink: StopgapSink): void {
  const entry = (registry.entries as StopgapEntry[]).find(
    (row) => row.id === id,
  );
  if (!entry || entry.status !== "open")
    throw new Error(`Unregistered active stopgap: ${id}`);
  emitStopgap(entry, sink);
}

export function emitStopgap(entry: StopgapEntry, sink: StopgapSink): void {
  if (entry.status !== "open") throw new Error(`Inactive stopgap: ${entry.id}`);
  sink({ tone: "red", id: entry.id, message: blockedStopgap(entry) });
}

export function blockedStopgap(entry: StopgapEntry): string {
  return `Blocked: ${entry.id}, ${entry.kind} in ${entry.file} line ${entry.line}, added ${entry.when} by ${entry.who}, because ${entry.why}. Replace with ${entry.replacement}.`;
}

function filesUnder(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

export function sourceProblems(path: string, text: string): string[] {
  const problems: string[] = [];
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const visit = (node: ts.Node): void => {
    const line =
      source.getLineAndCharacterOfPosition(node.getStart(source)).line + ONE;
    if (ts.isNumericLiteral(node))
      problems.push(
        `${path}:${line}: numeric literal outside the parameter table`,
      );
    if (
      ts.isPropertyAssignment(node) &&
      /^(?:playerText|playerProse|screenMessage)$/.test(
        node.name.getText(source).replace(/['"]/g, ""),
      )
    )
      problems.push(`${path}:${line}: player words outside the English engine`);
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(source).replace(/['"]/g, "") === "choices" &&
      ts.isArrayLiteralExpression(node.initializer)
    )
      problems.push(`${path}:${line}: authored choices defined in code`);
    if (
      ts.isBinaryExpression(node) &&
      ts.isPropertyAccessExpression(node.left) &&
      /^(?:innerHTML|innerText|textContent)$/.test(node.left.name.text)
    )
      problems.push(
        `${path}:${line}: player DOM text outside the English engine`,
      );
    if (
      ts.isBinaryExpression(node) &&
      ts.isPropertyAccessExpression(node.left) &&
      /^(?:mechanism|placeKey|stateCode|personId|actKind|needId|traitId|lawId|situationKey)$/.test(
        node.left.name.text,
      ) &&
      ts.isStringLiteral(node.right)
    )
      problems.push(`${path}:${line}: content-specific branch in code`);
    if (
      ts.isPropertyAssignment(node) &&
      ["options", "situations", "actKinds"].includes(
        node.name.getText(source).replace(/['"]/g, ""),
      )
    ) {
      problems.push(`${path}:${line}: situation or option defined in code`);
    }
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node))
      problems.push(`${path}:${line}: player rendering in diagnostic code`);
    if (
      ts.isCallExpression(node) &&
      /(?:playerText|renderPlayerText|innerHTML|dangerouslySetInnerHTML)$/.test(
        node.expression.getText(source),
      )
    ) {
      problems.push(`${path}:${line}: string bypasses the English engine`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return problems;
}

export function registryProblems(
  entries: readonly StopgapEntry[],
  sources: ReadonlyMap<string, string>,
): string[] {
  const problems: string[] = [];
  const markers = new Map<string, { file: string; line: number }[]>();
  for (const [file, source] of sources) {
    for (const match of source.matchAll(
      /(?:stopgap\(['"]|STOPGAP:|"stopgapId"\s*:\s*")(SG-[A-Z\d-]+)/g,
    )) {
      const id = match[ONE];
      const line = source.slice(ZERO, match.index).split("\n").length;
      const locations = markers.get(id) ?? [];
      locations.push({ file, line });
      markers.set(id, locations);
    }
  }
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id))
      problems.push(`${entry.id}: duplicate registry entry`);
    ids.add(entry.id);
    if (
      ![
        entry.id,
        entry.kind,
        entry.file,
        entry.whatItFakes,
        entry.why,
        entry.who,
        entry.when,
        entry.replacement,
      ].every(Boolean) ||
      !Number.isInteger(entry.line) ||
      entry.line < ONE
    ) {
      problems.push(`${entry.id}: incomplete stopgap entry`);
    }
    const found = markers
      .get(entry.id)
      ?.some(
        (location) =>
          location.file === entry.file && location.line === entry.line,
      );
    if (entry.status === "open" && !found)
      problems.push(
        `${entry.id}: stale entry; no marker at the registered file and line`,
      );
    if (entry.status === "replaced" && markers.has(entry.id))
      problems.push(`${entry.id}: replaced entry still has an active marker`);
    if (!["open", "replaced"].includes(entry.status))
      problems.push(`${entry.id}: invalid registry status`);
  }
  for (const id of markers.keys())
    if (!ids.has(id)) problems.push(`${id}: marker has no registry entry`);
  return problems;
}

export function releaseProblems(entries: readonly StopgapEntry[]): string[] {
  return entries.filter((row) => row.status === "open").map(blockedStopgap);
}

export function replayTripwires(
  root: string,
  release = false,
  entries = registry.entries as StopgapEntry[],
): string[] {
  const sources = new Map(
    filesUnder(join(root, "scripts/life-replay"))
      .filter((path) => path.endsWith(".ts") && !path.endsWith(".test.ts"))
      .map((path) => [relative(root, path), readFileSync(path, "utf8")]),
  );
  const problems = [...parameterProblems(parameterTable)];
  const parametersPath = "data/life-replay/parameters.json";
  const parameterSources = new Map(sources);
  parameterSources.set(
    parametersPath,
    readFileSync(join(root, parametersPath), "utf8"),
  );
  problems.push(...registryProblems(entries, parameterSources));
  for (const [id, row] of Object.entries(parameterTable))
    if (
      row.tag === "TUNABLE" &&
      (!row.stopgapId ||
        !entries.some(
          (entry) => entry.id === row.stopgapId && entry.status === "open",
        ))
    )
      problems.push(`${id}: tunable has no registered open stopgap`);
  for (const [path, source] of sources)
    problems.push(...sourceProblems(path, source));
  for (const path of filesUnder(join(root, "src")).filter(
    (file) => /\.[cm]?[jt]sx?$/.test(file) && !file.endsWith(".test.ts"),
  )) {
    const source = readFileSync(path, "utf8");
    if (playerImportProblems(relative(root, path), source).length > ZERO) {
      problems.push(
        `${relative(root, path)}: developer replay facts must not enter the player application`,
      );
    }
  }
  if (release) problems.push(...releaseProblems(entries));
  return problems;
}

/** P8 may import the pure API types. A runtime import or LifeFile type is forbidden. */
export function playerImportProblems(path: string, text: string): string[] {
  const problems: string[] = [];
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const forbiddenTypes = new Set([
    "LifeFile",
    "LifeStep",
    "RunReceipt",
    "StepReceipt",
  ]);
  const visit = (node: ts.Node): void => {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text.includes("life-replay")
    ) {
      const bindings = node.importClause?.namedBindings;
      const allowed =
        node.importClause?.isTypeOnly &&
        /life-replay\/contract(?:\.ts)?$/.test(node.moduleSpecifier.text) &&
        bindings &&
        ts.isNamedImports(bindings) &&
        bindings.elements.every(
          (element) =>
            !forbiddenTypes.has((element.propertyName ?? element.name).text),
        );
      if (!allowed)
        problems.push(
          `${path}: replay facts or runtime code imported into the player application`,
        );
    }
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text.includes("life-replay") &&
      !node.isTypeOnly
    )
      problems.push(
        `${path}: replay runtime exported into the player application`,
      );
    if (
      ts.isCallExpression(node) &&
      node.arguments.some(
        (argument) =>
          ts.isStringLiteral(argument) && argument.text.includes("life-replay"),
      ) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        node.expression.getText(source) === "require")
    )
      problems.push(
        `${path}: replay runtime loaded into the player application`,
      );
    ts.forEachChild(node, visit);
  };
  visit(source);
  return problems;
}

export function stopgapCount(): number {
  return registry.entries.filter((row: StopgapEntry) => row.status === "open")
    .length;
}
