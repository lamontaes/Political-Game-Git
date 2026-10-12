import { createHash } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import {
  auditCheckRangeCoverage,
  type CalibrationBlocker,
} from "./calibration-guard";
import {
  assertReleaseReady as enforceReleaseReady,
  type StopgapEntry,
} from "../stopgaps";

export { assertReleaseReady } from "../stopgaps";
export type { StopgapEntry } from "../stopgaps";

export interface TripwireDiagnostic {
  readonly code: string;
  readonly file?: string;
  readonly line?: number;
  readonly message: string;
}

export interface TripwireAudit {
  readonly openStopgapCount: number;
  readonly diagnostics: readonly TripwireDiagnostic[];
  readonly calibration: {
    readonly structuralValid: boolean;
    readonly targetReferenceCount: number;
    readonly blockerCount: number;
    readonly blockers: readonly CalibrationBlocker[];
    readonly empiricalCalibrationPass: false;
  };
}

interface SourceMarker {
  readonly id: string;
  readonly file: string;
  readonly line: number;
}

interface ParsedRegistry {
  readonly entries: readonly StopgapEntry[];
  readonly diagnostics: readonly TripwireDiagnostic[];
}

interface ParameterRow {
  readonly name: string;
  readonly jsonPath: string;
  readonly value: unknown;
}

const STOPGAP_ID = /^SG-[A-Za-z0-9][A-Za-z0-9-]*$/;
const VALID_TAGS = new Set(["SOURCED", "ESTIMATED", "TUNABLE"]);
const TEXT_FIELDS = new Set([
  "playertext",
  "narration",
  "screentext",
  "displaytext",
  "playerfacingtext",
  "uicopy",
  "text",
  "label",
  "title",
  "caption",
  "headline",
  "body",
  "description",
  "prompt",
]);
const CONTENT_FIELDS = new Set([
  "action",
  "actions",
  "option",
  "options",
  "choice",
  "choices",
  "situation",
  "situations",
  "need",
  "needs",
  "tier",
  "tiers",
  "appraisaltrait",
  "appraisaltraits",
]);
const CONTENT_COLLECTION_FIELDS = new Set([
  "actions",
  "needs",
  "tiers",
  "situations",
  "appraisaltraits",
]);
const STOPGAP_FIELDS = new Set([
  "id",
  "kind",
  "file",
  "line",
  "whatItFakes",
  "why",
  "addedBy",
  "addedAt",
  "replacement",
  "status",
]);
const PARAMETER_ROW_FIELDS = new Set([
  "value",
  "tag",
  "citation",
  "estimatedFrom",
  "spread",
  "stopgapId",
  "checkRange",
]);

/** Counts open rows in the array-form stopgap registry. */
export function countOpenStopgaps(registry: unknown): number {
  return parseRegistry(registry).entries.filter(
    (entry) => entry.status === "open",
  ).length;
}

/** Prints the owner-facing count and returns it for command-line callers. */
export function reportOpenStopgapCount(
  registry: unknown,
  write: (message: string) => void = console.log,
): number {
  const count = countOpenStopgaps(registry);
  write(`Open stopgap count: ${count}`);
  return count;
}

/**
 * Checks the P8 source boundary and both registries without importing the
 * simulation into a browser or running it. The root argument is repository
 * root; tests pass isolated temporary roots.
 */
export function auditCore2Tripwires(
  rootDirectory: string,
  registryInput?: unknown,
): TripwireAudit {
  const root = resolve(rootDirectory);
  const diagnostics: TripwireDiagnostic[] = [];
  const registryPath = join(root, "src", "core2", "data", "stopgaps.json");
  let rawRegistry = registryInput;
  if (rawRegistry === undefined) {
    try {
      rawRegistry = JSON.parse(readFileSync(registryPath, "utf8")) as unknown;
    } catch (error) {
      diagnostics.push({
        code: "stopgap-registry-unreadable",
        file: relative(root, registryPath).split(sep).join("/"),
        message: `Could not read the stopgap registry: ${errorMessage(error)}.`,
      });
    }
  }
  const parsedRegistry = parseRegistry(rawRegistry);
  diagnostics.push(...parsedRegistry.diagnostics);

  const markers: SourceMarker[] = [];
  const contentIds = new Set<string>();
  for (const filePath of listP8JsonFiles(root)) {
    const file = relative(root, filePath).split(sep).join("/");
    let sourceText: string;
    try {
      sourceText = readFileSync(filePath, "utf8");
    } catch (error) {
      diagnostics.push({
        code: "data-unreadable",
        file,
        message: `Could not read P8 data: ${errorMessage(error)}.`,
      });
      continue;
    }
    collectJsonMarkers(sourceText, file, diagnostics, markers);
    collectContentIdentifiers(sourceText, contentIds);
  }

  for (const filePath of listTypeScriptFiles(join(root, "src", "core2"))) {
    const file = relative(root, filePath).split(sep).join("/");
    let sourceText: string;
    try {
      sourceText = readFileSync(filePath, "utf8");
    } catch (error) {
      diagnostics.push({
        code: "source-unreadable",
        file,
        message: `Could not read P8 source: ${errorMessage(error)}.`,
      });
      continue;
    }
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    inspectProductionSource(sourceFile, file, diagnostics, markers, contentIds);
  }

  inspectMarkerLedger(markers, parsedRegistry.entries, diagnostics);
  inspectParameterTable(root, diagnostics);
  const calibration = inspectCalibrationCatalog(root, diagnostics);
  return {
    openStopgapCount: parsedRegistry.entries.filter(
      (entry) => entry.status === "open",
    ).length,
    diagnostics,
    calibration,
  };
}

/** Throws a readable diagnostic if any source or registry tripwire fails. */
export function assertCore2Tripwires(
  rootDirectory: string,
  registryInput?: unknown,
): TripwireAudit {
  const audit = auditCore2Tripwires(rootDirectory, registryInput);
  if (audit.diagnostics.length > 0) {
    throw new Error(
      audit.diagnostics
        .map((diagnostic) => {
          const location = diagnostic.file
            ? `${diagnostic.file}${diagnostic.line === undefined ? "" : `:${diagnostic.line}`}: `
            : "";
          return `${location}${diagnostic.message}`;
        })
        .join("\n"),
    );
  }
  return audit;
}

export interface TripwireCliOptions {
  readonly release?: boolean;
  readonly write?: (message: string) => void;
  readonly writeError?: (message: string) => void;
}

/** Runs the source audit; open stopgaps block only an explicit release check. */
export function runTripwiresCli(
  rootDirectory = projectRoot(),
  options: TripwireCliOptions = {},
): number {
  const audit = auditCore2Tripwires(rootDirectory);
  const release =
    options.release ?? process.argv.slice(2).includes("--release");
  const write = options.write ?? console.log;
  const writeError = options.writeError ?? console.error;
  let registry: unknown = [];
  try {
    registry = readJsonRegistry(
      join(rootDirectory, "src", "core2", "data", "stopgaps.json"),
    );
  } catch {
    // The audit below already reports a missing or unreadable registry.
  }
  reportOpenStopgapCount(registry, write);
  write(
    `Calibration references: ${audit.calibration.targetReferenceCount}; blockers: ${audit.calibration.blockerCount}; empirical pass: no.`,
  );
  for (const blocker of audit.calibration.blockers) {
    const subject = blocker.parameter ?? blocker.target ?? "target";
    write(`Calibration pending (${subject}): ${blocker.message}`);
  }
  for (const diagnostic of audit.diagnostics) {
    const location = diagnostic.file
      ? `${diagnostic.file}${diagnostic.line === undefined ? "" : `:${diagnostic.line}`}: `
      : "";
    writeError(`${location}${diagnostic.message}`);
  }
  let failures = audit.diagnostics.length;
  if (release) {
    try {
      enforceReleaseReady(parseRegistry(registry).entries);
    } catch (error) {
      writeError(errorMessage(error));
      failures += 1;
    }
  }
  return failures;
}

function projectRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
}

function parseRegistry(value: unknown): ParsedRegistry {
  const diagnostics: TripwireDiagnostic[] = [];
  if (!Array.isArray(value)) {
    return {
      entries: [],
      diagnostics: [
        {
          code: "stopgap-registry-shape",
          message: "The stopgap registry must be an array of entries.",
        },
      ],
    };
  }

  const entries: StopgapEntry[] = [];
  const seenIds = new Set<string>();
  value.forEach((row, index) => {
    if (!isRecord(row)) {
      diagnostics.push({
        code: "stopgap-entry-shape",
        message: `Stopgap row ${index + 1} must be an object.`,
      });
      return;
    }
    const requiredStrings = [
      "id",
      "kind",
      "file",
      "whatItFakes",
      "why",
      "addedBy",
      "addedAt",
      "replacement",
    ] as const;
    const missing = requiredStrings.filter((field) => {
      const value = row[field];
      return typeof value !== "string" || value.trim() === "";
    });
    const unknown = Object.keys(row).filter(
      (field) => !STOPGAP_FIELDS.has(field),
    );
    if (missing.length > 0) {
      diagnostics.push({
        code: "stopgap-entry-fields",
        message: `Stopgap row ${index + 1} needs nonempty ${missing.join(", ")}.`,
      });
      return;
    }
    if (unknown.length > 0) {
      diagnostics.push({
        code: "stopgap-entry-fields",
        message: `Stopgap row ${index + 1} has unsupported fields ${unknown.join(", ")}.`,
      });
      return;
    }
    const id = row.id as string;
    if (!STOPGAP_ID.test(id)) {
      diagnostics.push({
        code: "stopgap-entry-id",
        message: `Stopgap row ${index + 1} has an ID that must start with SG- and contain only letters, digits, or hyphens.`,
      });
      return;
    }
    if (seenIds.has(id)) {
      diagnostics.push({
        code: "stopgap-entry-duplicate",
        message: `Stopgap ID ${id} appears more than once in the registry.`,
      });
      return;
    }
    seenIds.add(id);
    const line = row.line;
    if (!Number.isSafeInteger(line) || (line as number) < 1) {
      diagnostics.push({
        code: "stopgap-entry-line",
        message: `Stopgap ${id} needs a positive source line number.`,
      });
      return;
    }
    const status = row.status;
    if (status !== "open" && status !== "resolved") {
      diagnostics.push({
        code: "stopgap-entry-status",
        message: `Stopgap ${id} status must be open or resolved.`,
      });
      return;
    }
    entries.push({
      id,
      kind: row.kind as string,
      file: row.file as string,
      line: line as number,
      whatItFakes: row.whatItFakes as string,
      why: row.why as string,
      addedBy: row.addedBy as string,
      addedAt: row.addedAt as string,
      replacement: row.replacement as string,
      status,
    });
  });
  return { entries, diagnostics };
}

function inspectProductionSource(
  sourceFile: ts.SourceFile,
  file: string,
  diagnostics: TripwireDiagnostic[],
  markers: SourceMarker[],
  contentIds: ReadonlySet<string>,
): void {
  const reportAt = (code: string, node: ts.Node, message: string) => {
    const { line } = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(sourceFile),
    );
    diagnostics.push({ code, file, line: line + 1, message });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isNumericLiteral(node)) {
      reportAt(
        "numeric-literal",
        node,
        `Numeric literal ${node.getText(sourceFile)} must come from data or the parameter registry.`,
      );
    }

    if (ts.isCallExpression(node) && isStopgapCallee(node.expression)) {
      const argument = node.arguments[0];
      const id = argument && stringLiteralValue(argument);
      if (!argument) {
        reportAt(
          "malformed-stopgap-marker",
          node,
          "A stopgap lookup needs an ID argument.",
        );
      } else if (id !== undefined && !STOPGAP_ID.test(id)) {
        reportAt(
          "malformed-stopgap-marker",
          node,
          "A literal stopgap marker must use a registered SG ID shape.",
        );
      } else if (id !== undefined) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile),
        );
        markers.push({ id, file, line: line + 1 });
      }
    }

    if (
      ts.isPropertyAssignment(node) &&
      propertyName(node.name) === "stopgapId"
    ) {
      const id = stringLiteralValue(node.initializer);
      if (id !== undefined && !STOPGAP_ID.test(id)) {
        reportAt(
          "malformed-stopgap-marker",
          node,
          "A literal stopgapId marker must use a registered SG ID shape.",
        );
      } else if (id !== undefined) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile),
        );
        markers.push({ id, file, line: line + 1 });
      }
    }

    if (ts.isPropertyAssignment(node)) {
      const name = propertyName(node.name)?.toLowerCase();
      if (
        name &&
        TEXT_FIELDS.has(name) &&
        containsTextLiteral(node.initializer)
      ) {
        reportAt(
          "player-text-literal",
          node,
          `Player-facing ${propertyName(node.name)} text belongs in a content registry, not production TypeScript.`,
        );
      }
      if (
        name &&
        CONTENT_FIELDS.has(name) &&
        isStaticContentLiteral(node.initializer)
      ) {
        reportAt(
          "inline-content-registry",
          node,
          `${propertyName(node.name)} content belongs in a data registry, not production TypeScript.`,
        );
      }
    }

    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const name = node.name.text.toLowerCase();
      if (
        TEXT_FIELDS.has(name) &&
        node.initializer &&
        containsTextLiteral(node.initializer)
      ) {
        reportAt(
          "player-text-literal",
          node,
          `Player-facing ${node.name.text} text belongs in a content registry, not production TypeScript.`,
        );
      }
      if (
        /(?:actions?|actiondefinitions?|situations?|options?|choices?|needs?|tiers?|appraisaltraits?)/i.test(
          node.name.text,
        ) &&
        node.initializer &&
        isStaticContentLiteral(node.initializer)
      ) {
        reportAt(
          "inline-content-registry",
          node,
          `${node.name.text} content belongs in a data registry, not production TypeScript.`,
        );
      }
    }

    if (ts.isObjectLiteralExpression(node) && looksLikeActionDefinition(node)) {
      reportAt(
        "inline-action-definition",
        node,
        "ActionDefinition data belongs in a JSON registry, not production TypeScript.",
      );
    }

    if (
      ts.isObjectLiteralExpression(node) &&
      looksLikeModuleDataDefinition(node)
    ) {
      reportAt(
        "inline-content-registry",
        node,
        "Situation, need, tier, trait, and option definitions belong in a JSON registry, not production TypeScript.",
      );
    }

    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      TEXT_FIELDS.has(node.left.name.text.toLowerCase()) &&
      containsTextLiteral(node.right)
    ) {
      reportAt(
        "player-text-literal",
        node,
        `Player-facing ${node.left.name.text} text belongs in a content registry, not production TypeScript.`,
      );
    }

    if (ts.isSwitchStatement(node)) {
      for (const clause of node.caseBlock.clauses) {
        if (!ts.isCaseClause(clause)) continue;
        const caseId = stringLiteralValue(clause.expression);
        if (caseId && contentIds.has(caseId)) {
          reportAt(
            "inline-content-switch",
            clause,
            `Content ID ${caseId} must be selected from its data registry, not a TypeScript switch.`,
          );
        }
      }
    }

    if (
      ts.isBinaryExpression(node) &&
      isEqualityOperator(node.operatorToken.kind) &&
      ((ts.isPropertyAccessExpression(node.left) &&
        node.left.name.text === "id") ||
        (ts.isPropertyAccessExpression(node.right) &&
          node.right.name.text === "id"))
    ) {
      const comparedId = ts.isPropertyAccessExpression(node.left)
        ? stringLiteralValue(node.right)
        : stringLiteralValue(node.left);
      if (comparedId && contentIds.has(comparedId)) {
        reportAt(
          "inline-content-switch",
          node,
          `Content ID ${comparedId} must be selected from its data registry, not a TypeScript ID branch.`,
        );
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

function inspectCalibrationCatalog(
  root: string,
  diagnostics: TripwireDiagnostic[],
): TripwireAudit["calibration"] {
  const parameterPath = join(root, "src", "core2", "data", "parameters.json");
  const catalogPath = join(
    root,
    "src",
    "core2",
    "tooling",
    "calibration-targets.json",
  );
  const parameterFile = relative(root, parameterPath).split(sep).join("/");
  const catalogFile = relative(root, catalogPath).split(sep).join("/");
  let parameters: unknown;
  let catalog: unknown;
  let parameterSourceSha256: string | undefined;
  try {
    const parameterSource = readFileSync(parameterPath, "utf8");
    parameters = JSON.parse(parameterSource) as unknown;
    parameterSourceSha256 = createHash("sha256")
      .update(parameterSource, "utf8")
      .digest("hex");
  } catch (error) {
    diagnostics.push({
      code: "calibration-parameters-unreadable",
      file: parameterFile,
      message: `Could not read parameter references: ${errorMessage(error)}.`,
    });
  }
  try {
    catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as unknown;
  } catch (error) {
    diagnostics.push({
      code: "calibration-catalog-unreadable",
      file: catalogFile,
      message: `Could not read the developer-only calibration catalog: ${errorMessage(error)}.`,
    });
  }
  // Independently hash population evidence rather than trusting a repeated catalog hash.
  const empiricalManifest =
    isRecord(catalog) && isRecord(catalog.empiricalSourceFiles)
      ? catalog.empiricalSourceFiles
      : {};
  const actualEmpiricalSourceSha256s: Record<string, string> = {};
  for (const path of Object.keys(empiricalManifest)) {
    const sourcePath = resolve(root, path),
      relativePath = relative(root, sourcePath);
    if (
      !(
        path.startsWith("src/core2/data/") || path.startsWith("data/research/")
      ) ||
      path.split("/").includes("..") ||
      relativePath.startsWith(`..${sep}`) ||
      relativePath === ".."
    ) {
      diagnostics.push({
        code: "calibration-empirical-source-path",
        file: catalogFile,
        message: `Unsupported empirical source path: ${path}`,
      });
      continue;
    }
    try {
      actualEmpiricalSourceSha256s[path] = createHash("sha256")
        .update(readFileSync(sourcePath))
        .digest("hex");
    } catch (error) {
      diagnostics.push({
        code: "calibration-empirical-source-unreadable",
        file: catalogFile,
        message: `Cannot verify empirical source ${path}: ${errorMessage(error)}`,
      });
    }
  }
  const audit = auditCheckRangeCoverage(
    parameters,
    catalog,
    parameterSourceSha256,
    actualEmpiricalSourceSha256s,
  );
  diagnostics.push(
    ...audit.diagnostics.map((row) => ({
      code: row.code,
      file: row.file ?? catalogFile,
      message: row.parameter
        ? `${row.parameter}${row.target ? ` -> ${row.target}` : ""}: ${row.message}`
        : row.message,
    })),
  );
  return {
    structuralValid: audit.structuralValid,
    targetReferenceCount: audit.targetReferenceCount,
    blockerCount: audit.blockers.length,
    blockers: audit.blockers,
    empiricalCalibrationPass: false,
  };
}

function inspectParameterTable(
  root: string,
  diagnostics: TripwireDiagnostic[],
): void {
  const filePath = join(root, "src", "core2", "data", "parameters.json");
  const file = relative(root, filePath).split(sep).join("/");
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  } catch (error) {
    diagnostics.push({
      code: "parameter-table-unreadable",
      file,
      message: `Could not read the parameter table: ${errorMessage(error)}.`,
    });
    return;
  }

  const table = parameterRows(raw);
  if (!table) {
    diagnostics.push({
      code: "parameter-table-shape",
      file,
      message:
        "The parameter registry must be a table of named rows with numeric values and provenance tags.",
    });
    return;
  }
  const allowedNumericPaths = new Set<string>();
  for (const { name, jsonPath, value: row } of table) {
    if (!isRecord(row)) {
      diagnostics.push({
        code: "parameter-row-shape",
        file,
        message: `Parameter ${name} must be a metadata row, not inline content.`,
      });
      continue;
    }
    const unsupportedFields = Object.keys(row).filter(
      (field) => !PARAMETER_ROW_FIELDS.has(field),
    );
    if (unsupportedFields.length > 0) {
      diagnostics.push({
        code: "parameter-row-fields",
        file,
        message: `Parameter ${name} has unsupported fields ${unsupportedFields.join(", ")}; the registry holds numeric rows and provenance only.`,
      });
    }
    if (typeof row.value !== "number" || !Number.isFinite(row.value)) {
      diagnostics.push({
        code: "parameter-value",
        file,
        message: `Parameter ${name} needs one finite numeric value.`,
      });
    } else {
      allowedNumericPaths.add(`${jsonPath}.value`);
    }
    if (typeof row.tag !== "string" || !VALID_TAGS.has(row.tag)) {
      diagnostics.push({
        code: "parameter-tag",
        file,
        message: `Parameter ${name} needs a SOURCED, ESTIMATED, or TUNABLE tag.`,
      });
    }
    if (typeof row.citation !== "string" || row.citation.trim() === "") {
      diagnostics.push({
        code: "parameter-citation",
        file,
        message: `Parameter ${name} needs a source citation.`,
      });
    }
    if (
      row.tag === "ESTIMATED" &&
      (typeof row.estimatedFrom !== "string" || row.estimatedFrom.trim() === "")
    ) {
      diagnostics.push({
        code: "parameter-estimate-source",
        file,
        message: `Estimated parameter ${name} needs an estimatedFrom explanation.`,
      });
    }
    if (
      row.tag === "ESTIMATED" &&
      (typeof row.stopgapId !== "string" || !STOPGAP_ID.test(row.stopgapId))
    ) {
      diagnostics.push({
        code: "parameter-estimate-stopgap",
        file,
        message: `Estimated parameter ${name} needs a registered stopgapId marker.`,
      });
    }
    if (row.tag === "TUNABLE" && !isRecord(row.spread)) {
      diagnostics.push({
        code: "parameter-tunable-spread",
        file,
        message: `Tunable parameter ${name} needs a recorded spread or an explicit unmeasured reason.`,
      });
    } else if (isRecord(row.spread)) {
      if (row.tag === "TUNABLE" && row.spread.status === "unmeasured") {
        const keys = Object.keys(row.spread);
        if (
          keys.length !== 2 ||
          !keys.includes("status") ||
          !keys.includes("reason") ||
          typeof row.spread.reason !== "string" ||
          row.spread.reason.trim() === ""
        ) {
          diagnostics.push({
            code: "parameter-tunable-unmeasured-spread",
            file,
            message: `Unmeasured spread for ${name} must contain only status and a nonempty reason.`,
          });
        }
      } else {
        const low = row.spread.low;
        const high = row.spread.high;
        if (typeof low === "number" && Number.isFinite(low)) {
          allowedNumericPaths.add(`${jsonPath}.spread.low`);
        }
        if (typeof high === "number" && Number.isFinite(high)) {
          allowedNumericPaths.add(`${jsonPath}.spread.high`);
        }
        if (
          Object.keys(row.spread).length !== 4 ||
          !Object.keys(row.spread).every((field) =>
            ["low", "high", "unit", "citation"].includes(field),
          ) ||
          typeof low !== "number" ||
          !Number.isFinite(low) ||
          typeof high !== "number" ||
          !Number.isFinite(high) ||
          low > high ||
          typeof row.spread.unit !== "string" ||
          row.spread.unit.trim() === "" ||
          typeof row.spread.citation !== "string" ||
          row.spread.citation.trim() === ""
        ) {
          diagnostics.push({
            code: "parameter-spread-shape",
            file,
            message: `Numeric spread for ${name} needs finite ordered bounds, a unit, and a source citation.`,
          });
        }
      }
    }
    for (const key of Object.keys(row)) {
      if (
        CONTENT_FIELDS.has(key.toLowerCase()) ||
        TEXT_FIELDS.has(key.toLowerCase())
      ) {
        diagnostics.push({
          code: "parameter-content-field",
          file,
          message: `Parameter ${name} contains content field ${key}; content belongs in a separate data registry.`,
        });
      }
    }
  }

  const actualNumericPaths = new Set<string>();
  walkJson(raw, [], (path, value) => {
    if (typeof value === "number") actualNumericPaths.add(path.join("."));
    const field = path.at(-1)?.toLowerCase();
    if (field && (CONTENT_FIELDS.has(field) || TEXT_FIELDS.has(field))) {
      diagnostics.push({
        code: "parameter-content-field",
        file,
        message: `Parameter table field ${path.join(".")} contains content rather than numeric parameter metadata.`,
      });
    }
  });
  for (const path of actualNumericPaths) {
    if (!allowedNumericPaths.has(path)) {
      diagnostics.push({
        code: "parameter-numeric-outside-value",
        file,
        message: `Numeric value at ${path} is outside the parameter value or spread table.`,
      });
    }
  }
}

function parameterRows(value: unknown): readonly ParameterRow[] | undefined {
  if (!isRecord(value)) return undefined;
  return Object.entries(value).map(([name, row]) => ({
    name,
    jsonPath: name,
    value: row,
  }));
}

function listTypeScriptFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const files: string[] = [];
  const visit = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        if (isExcludedSourcePath(fullPath)) continue;
        visit(fullPath);
      } else if (
        (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
        !entry.name.endsWith(".d.ts") &&
        !/\.(?:test|spec)\.(?:ts|tsx)$/.test(entry.name) &&
        !isExcludedSourcePath(fullPath)
      ) {
        files.push(fullPath);
      }
    }
  };
  visit(directory);
  return files.sort();
}

function isExcludedSourcePath(filePath: string): boolean {
  return filePath
    .split(sep)
    .some((part) =>
      [
        "tooling",
        "fixtures",
        "__fixtures__",
        "test",
        "tests",
        "__tests__",
        "testing",
      ].includes(part),
    );
}

function listP8JsonFiles(root: string): string[] {
  const files = new Set<string>();
  const directory = join(root, "src", "core2", "data");
  if (!existsSync(directory)) return [];
  const visit = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else if (
        entry.name.endsWith(".json") &&
        !(entry.name === "stopgaps.json" && dirname(fullPath) === directory)
      ) {
        files.add(fullPath);
      }
    }
  };
  visit(directory);
  return [...files].sort();
}

function collectJsonMarkers(
  sourceText: string,
  file: string,
  diagnostics: TripwireDiagnostic[],
  markers: SourceMarker[],
): void {
  try {
    JSON.parse(sourceText);
  } catch (error) {
    diagnostics.push({
      code: "p8-data-invalid-json",
      file,
      message: `P8 data registry is not valid JSON: ${errorMessage(error)}.`,
    });
    return;
  }
  for (let cursor = 0; cursor < sourceText.length; cursor += 1) {
    if (sourceText[cursor] !== '"') continue;
    const key = readJsonString(sourceText, cursor);
    if (!key) continue;
    const colon = skipJsonWhitespace(sourceText, key.end);
    if (key.value !== "stopgapId" || sourceText[colon] !== ":") {
      cursor = key.end - 1;
      continue;
    }
    const valueStart = skipJsonWhitespace(sourceText, colon + 1);
    const value =
      sourceText[valueStart] === '"'
        ? readJsonString(sourceText, valueStart)
        : undefined;
    const line = sourceText.slice(0, cursor).split(/\r\n|\n|\r/).length;
    if (!value || !STOPGAP_ID.test(value.value)) {
      diagnostics.push({
        code: "malformed-stopgap-marker",
        file,
        line,
        message: "A stopgapId data marker must be a literal SG ID.",
      });
    } else {
      markers.push({ id: value.value, file, line });
    }
    cursor = value?.end ?? valueStart;
  }
}

function collectContentIdentifiers(
  sourceText: string,
  contentIds: Set<string>,
): void {
  let data: unknown;
  try {
    data = JSON.parse(sourceText) as unknown;
  } catch {
    return;
  }
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!isRecord(value)) return;
    for (const [field, rows] of Object.entries(value)) {
      if (
        CONTENT_COLLECTION_FIELDS.has(field.toLowerCase()) &&
        Array.isArray(rows)
      ) {
        for (const row of rows) {
          if (!isRecord(row)) continue;
          for (const identityField of ["id", "traitId"]) {
            const id = row[identityField];
            if (typeof id === "string") contentIds.add(id);
          }
        }
      }
      visit(rows);
    }
  };
  visit(data);
}

function readJsonString(
  text: string,
  start: number,
): { readonly value: string; readonly end: number } | undefined {
  for (let cursor = start + 1; cursor < text.length; cursor += 1) {
    if (text[cursor] === "\\") {
      cursor += 1;
      continue;
    }
    if (text[cursor] === '"') {
      try {
        return {
          value: JSON.parse(text.slice(start, cursor + 1)) as string,
          end: cursor + 1,
        };
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

function skipJsonWhitespace(text: string, start: number): number {
  let cursor = start;
  while (/\s/.test(text[cursor] ?? "")) cursor += 1;
  return cursor;
}

function inspectMarkerLedger(
  markers: readonly SourceMarker[],
  entries: readonly StopgapEntry[],
  diagnostics: TripwireDiagnostic[],
): void {
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  const markersById = new Map<string, SourceMarker[]>();
  for (const marker of markers) {
    const rows = markersById.get(marker.id) ?? [];
    rows.push(marker);
    markersById.set(marker.id, rows);
  }

  for (const marker of markers) {
    if (!entriesById.has(marker.id)) {
      diagnostics.push({
        code: "unregistered-source-marker",
        file: marker.file,
        line: marker.line,
        message: `Source marker ${marker.id} has no stopgap registry entry.`,
      });
    }
  }

  for (const entry of entries) {
    const rows = markersById.get(entry.id);
    if (!rows) {
      diagnostics.push({
        code: "stale-stopgap-entry",
        file: entry.file,
        line: entry.line,
        message: `Stopgap registry entry ${entry.id} has no source marker at its recorded location.`,
      });
    } else if (
      !rows.some(
        (marker) => marker.file === entry.file && marker.line === entry.line,
      )
    ) {
      const actualMarker = rows[0]!;
      diagnostics.push({
        code: "stopgap-location-mismatch",
        file: actualMarker.file,
        line: actualMarker.line,
        message: `Registry entry ${entry.id} points to ${entry.file}:${entry.line}, not one of its actual source markers.`,
      });
    }
  }
}

function isStopgapCallee(expression: ts.Expression): boolean {
  return (
    (ts.isIdentifier(expression) && expression.text === "stopgap") ||
    (ts.isPropertyAccessExpression(expression) &&
      expression.name.text === "stopgap")
  );
}

function isEqualityOperator(kind: ts.SyntaxKind): boolean {
  return (
    kind === ts.SyntaxKind.EqualsEqualsToken ||
    kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
    kind === ts.SyntaxKind.ExclamationEqualsToken ||
    kind === ts.SyntaxKind.ExclamationEqualsEqualsToken
  );
}

function stringLiteralValue(node: ts.Node): string | undefined {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return undefined;
}

function isTextLiteral(node: ts.Node): boolean {
  return (
    ts.isStringLiteralLike(node) ||
    ts.isTemplateExpression(node) ||
    ts.isNoSubstitutionTemplateLiteral(node)
  );
}

function containsTextLiteral(node: ts.Node): boolean {
  if (isTextLiteral(node)) return true;
  if (ts.isElementAccessExpression(node)) {
    return containsTextLiteral(node.expression);
  }
  if (ts.isCallExpression(node) && isParameterLookup(node.expression)) {
    return node.arguments.slice(1).some(containsTextLiteral);
  }
  let found = false;
  ts.forEachChild(node, (child) => {
    if (!found && containsTextLiteral(child)) found = true;
  });
  return found;
}

function isStaticContentLiteral(node: ts.Node): boolean {
  if (
    ts.isStringLiteralLike(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isNumericLiteral(node) ||
    node.kind === ts.SyntaxKind.TrueKeyword ||
    node.kind === ts.SyntaxKind.FalseKeyword ||
    node.kind === ts.SyntaxKind.NullKeyword
  ) {
    return true;
  }
  if (ts.isArrayLiteralExpression(node)) {
    return (
      node.elements.length > 0 &&
      node.elements.every(
        (element) =>
          !ts.isSpreadElement(element) && isStaticContentLiteral(element),
      )
    );
  }
  if (ts.isObjectLiteralExpression(node)) {
    return (
      node.properties.length > 0 &&
      node.properties.every(
        (property) =>
          ts.isPropertyAssignment(property) &&
          propertyName(property.name) !== undefined &&
          isStaticContentLiteral(property.initializer),
      )
    );
  }
  return false;
}

function propertyName(name: ts.PropertyName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteralLike(name)) return name.text;
  return undefined;
}

function looksLikeActionDefinition(node: ts.ObjectLiteralExpression): boolean {
  return (
    isStringProperty(node, "id") &&
    isStringArrayProperty(node, "actKinds") &&
    isStringArrayProperty(node, "goalKinds") &&
    isStringProperty(node, "targetKind") &&
    isStringProperty(node, "effect")
  );
}

function looksLikeModuleDataDefinition(
  node: ts.ObjectLiteralExpression,
): boolean {
  const hasIdentity =
    isStringProperty(node, "id") || isStringProperty(node, "traitId");
  if (!hasIdentity) return false;

  const hasNeedShape =
    isStringProperty(node, "evaluator") &&
    isStringProperty(node, "goalKind") &&
    isStaticObjectProperty(node, "parameters");
  const hasTierShape = isStringProperty(node, "cadence");
  const hasSituationShape =
    isStringProperty(node, "goalKind") &&
    isStringProperty(node, "driveKind") &&
    isStaticStringArrayProperty(node, "requiredFields");
  const hasTraitShape =
    isStringProperty(node, "traitId") &&
    isStringProperty(node, "weightParameter") &&
    isBooleanProperty(node, "oneSided");
  if (hasNeedShape || hasTierShape || hasSituationShape || hasTraitShape) {
    return true;
  }

  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const key = propertyName(property.name)?.toLowerCase();
    if (
      (key === "kind" || key === "type") &&
      ts.isStringLiteralLike(property.initializer)
    ) {
      if (
        ["situation", "option", "choice"].includes(
          property.initializer.text.toLowerCase(),
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

function isParameterLookup(expression: ts.Expression): boolean {
  return (
    (ts.isIdentifier(expression) &&
      ["p", "parameter"].includes(expression.text)) ||
    (ts.isPropertyAccessExpression(expression) &&
      expression.name.text === "parameter")
  );
}

function propertyInitializer(
  node: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression | undefined {
  const property = node.properties.find(
    (candidate) =>
      ts.isPropertyAssignment(candidate) &&
      propertyName(candidate.name) === name,
  );
  return property && ts.isPropertyAssignment(property)
    ? property.initializer
    : undefined;
}

function isStringProperty(
  node: ts.ObjectLiteralExpression,
  name: string,
): boolean {
  const value = propertyInitializer(node, name);
  return value !== undefined && stringLiteralValue(value) !== undefined;
}

function isBooleanProperty(
  node: ts.ObjectLiteralExpression,
  name: string,
): boolean {
  const value = propertyInitializer(node, name);
  return (
    value?.kind === ts.SyntaxKind.TrueKeyword ||
    value?.kind === ts.SyntaxKind.FalseKeyword
  );
}

function isStringArrayProperty(
  node: ts.ObjectLiteralExpression,
  name: string,
): boolean {
  const value = propertyInitializer(node, name);
  return (
    value !== undefined &&
    ts.isArrayLiteralExpression(value) &&
    value.elements.every(
      (element) =>
        !ts.isSpreadElement(element) &&
        stringLiteralValue(element) !== undefined,
    )
  );
}

function isStaticStringArrayProperty(
  node: ts.ObjectLiteralExpression,
  name: string,
): boolean {
  const value = propertyInitializer(node, name);
  return (
    value !== undefined &&
    ts.isArrayLiteralExpression(value) &&
    isStaticContentLiteral(value) &&
    value.elements.every((element) => stringLiteralValue(element) !== undefined)
  );
}

function isStaticObjectProperty(
  node: ts.ObjectLiteralExpression,
  name: string,
): boolean {
  const value = propertyInitializer(node, name);
  return value !== undefined && ts.isObjectLiteralExpression(value);
}

function walkJson(
  value: unknown,
  path: readonly string[],
  visit: (path: readonly string[], value: unknown) => void,
): void {
  visit(path, value);
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      walkJson(child, [...path, String(index)], visit),
    );
  } else if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      walkJson(child, [...path, key], visit);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readJsonRegistry(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
}

function isMainModule(): boolean {
  const argvPath = process.argv[1];
  return (
    argvPath !== undefined &&
    pathToFileURL(resolve(argvPath)).href === import.meta.url
  );
}

if (isMainModule()) {
  const failures = runTripwiresCli();
  if (failures > 0) process.exitCode = 1;
}
