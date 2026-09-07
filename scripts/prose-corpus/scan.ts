import { readFileSync } from "node:fs";
import ts from "typescript";

/**
 * Every string literal in a production module, with where it sits.
 *
 * This is the machinery behind two different questions. Coverage asks "is
 * there player-facing text in the repository that the inventory never saw?" —
 * the old #92 corpus answered that by construction, declared itself complete,
 * and had in fact missed whole surface families. Extraction asks "what does
 * this prose-producing *function* say?", for the narration and recap surfaces
 * that compute their sentences instead of declaring them in a bank.
 *
 * Both need the same thing: the literals, and enough syntactic context to tell
 * a sentence a player reads from an identifier, a key, an import specifier or
 * a thrown developer error.
 */

export interface ScannedLiteral {
  readonly sourcePath: string;
  /** The nearest enclosing named function/const, or `<module>` at top level. */
  readonly enclosingSymbol: string;
  readonly text: string;
  readonly line: number;
  /** The property name this literal was assigned to, where it was. */
  readonly propertyName: string | null;
  /** True when the literal is an argument to `throw new Error(...)`. */
  readonly isThrownError: boolean;
  /** True when the literal is a key/identifier position rather than prose. */
  readonly isKeyPosition: boolean;
  /** True for template literals, which usually carry slots. */
  readonly isTemplate: boolean;
}

/** Property names that hold a machine key rather than something read. */
const KEY_PROPERTIES = new Set([
  "key",
  "id",
  "kind",
  "stage",
  "option",
  "fact",
  "role",
  "capability",
  "dimension",
  "hypothesisKey",
  "sourceModule",
  "sourceSymbol",
  "sourceUrl",
  "citation",
  "retrievedAt",
  "verification",
  "authority",
  "band",
  "bands",
  "agency",
  "settings",
  "relationships",
  "tags",
  "family",
  "episodeKey",
  "stageKey",
  "kernelId",
  "track",
  "register",
  "reference",
  "sourceDocument",
  "type",
  "name",
  "path",
  "field",
  "column",
  "unit",
  "state",
  "code",
]);

function enclosingName(node: ts.Node): string {
  let current: ts.Node | undefined = node;
  while (current) {
    if (ts.isFunctionDeclaration(current) && current.name) {
      return current.name.getText();
    }
    if (ts.isMethodDeclaration(current) && ts.isIdentifier(current.name)) {
      return current.name.getText();
    }
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
      return current.name.getText();
    }
    current = current.parent;
  }
  return "<module>";
}

function propertyNameOf(node: ts.Node): string | null {
  const parent = node.parent;
  if (
    parent &&
    ts.isPropertyAssignment(parent) &&
    parent.initializer === node &&
    (ts.isIdentifier(parent.name) || ts.isStringLiteral(parent.name))
  ) {
    return parent.name.text;
  }
  return null;
}

function inKeyPosition(node: ts.Node, propertyName: string | null): boolean {
  const parent = node.parent;
  if (!parent) return true;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) {
    return true;
  }
  if (ts.isPropertyAssignment(parent) && parent.name === node) return true;
  if (ts.isComputedPropertyName(parent)) return true;
  if (ts.isLiteralTypeNode(parent)) return true;
  if (ts.isCaseClause(parent)) return true;
  if (propertyName !== null && KEY_PROPERTIES.has(propertyName)) return true;
  return false;
}

/**
 * Is this literal nested inside a template expression's interpolation?
 *
 * `conversationRole(room, "briefing-lead")` inside a `${...}` hole is part of
 * the surrounding sentence's composition, and the flattened template already
 * represents it as a named slot. Emitting it a second time on its own turned
 * role keys into corpus entries and made them read as the most-duplicated
 * "prose" in the game.
 */
function insideTemplateSpan(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isTemplateSpan(current)) return true;
    current = current.parent;
  }
  return false;
}

function isThrown(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  let depth = 0;
  while (current && depth < 4) {
    if (ts.isThrowStatement(current)) return true;
    current = current.parent;
    depth += 1;
  }
  return false;
}

export function scanLiterals(sourcePath: string): readonly ScannedLiteral[] {
  const text = readFileSync(sourcePath, "utf8");
  const source = ts.createSourceFile(
    sourcePath,
    text,
    ts.ScriptTarget.ES2022,
    true,
    sourcePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: ScannedLiteral[] = [];

  const visit = (node: ts.Node): void => {
    const isPlain = ts.isStringLiteral(node);
    const isNoSub = ts.isNoSubstitutionTemplateLiteral(node);
    const isTemplateExpression = ts.isTemplateExpression(node);
    if (
      (isPlain || isNoSub || isTemplateExpression) &&
      !insideTemplateSpan(node)
    ) {
      const literalText = isTemplateExpression
        ? templateText(node)
        : (node as ts.StringLiteral).text;
      const propertyName = propertyNameOf(node);
      found.push({
        sourcePath,
        enclosingSymbol: enclosingName(node),
        text: literalText,
        line:
          source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        propertyName,
        isThrownError: isThrown(node),
        isKeyPosition: inKeyPosition(node, propertyName),
        isTemplate: isTemplateExpression || isNoSub,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

/** A template expression flattened with its holes named, not evaluated. */
function templateText(node: ts.TemplateExpression): string {
  let out = node.head.text;
  for (const span of node.templateSpans) {
    out += `{${span.expression.getText().replace(/\s+/g, "")}}`;
    out += span.literal.text;
  }
  return out;
}
