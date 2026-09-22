/**
 * Where the prose is in a file.
 *
 * A spelling check that reads raw source flags `sourceColour` and a saved-game
 * token like `"cancelled"`; one that reads only rendered pages misses comments,
 * docs and skill files. This finds the parts of a file a person reads as
 * English — comments, strings with a space in them, JSX text, Markdown outside
 * code — and nothing else, so the same ranges serve the enforcing test and any
 * mechanical repair.
 */
import ts from "typescript";

export type ProseRange = {
  readonly start: number;
  readonly end: number;
  readonly kind: "comment" | "string" | "jsx" | "markdown" | "json";
};

const CODE = /\.(?:[cm]?[jt]sx?)$/;
const MARKUP = /\.(?:md|mdx|txt|toml|ya?ml)$/;

export function proseKindOf(file: string): "code" | "markup" | "json" | null {
  if (CODE.test(file) && !file.endsWith(".d.ts")) return "code";
  if (MARKUP.test(file)) return "markup";
  if (file.endsWith(".json")) return "json";
  return null;
}

/**
 * A single token with no space — `"cancelled"`, `"source-colour"` — is an
 * identifier far more often than it is copy, and identifiers are persisted in
 * saves. A capitalized single word ("Colour", "Neighbours") is a label.
 */
function isProseString(text: string): boolean {
  return /\s/.test(text.trim()) || /^[A-Z][a-z]+$/.test(text);
}

function ancestorTemplate(node: ts.Node): ts.TemplateExpression | null {
  let current: ts.Node | undefined = node.parent;
  while (current && !ts.isTemplateExpression(current)) current = current.parent;
  return current ?? null;
}

function templateText(template: ts.TemplateExpression): string {
  return [
    template.head.text,
    ...template.templateSpans.map((span) => span.literal.text),
  ].join("");
}

export function codeProseRanges(source: string, file: string): ProseRange[] {
  const kind = file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const tree = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    /\.[cm]?jsx?$/.test(file) ? ts.ScriptKind.JSX : kind,
  );
  const ranges: ProseRange[] = [];
  const seenComments = new Set<number>();
  const comments = (position: number) => {
    for (const comment of [
      ...(ts.getLeadingCommentRanges(source, position) ?? []),
      ...(ts.getTrailingCommentRanges(source, position) ?? []),
    ]) {
      if (seenComments.has(comment.pos)) continue;
      seenComments.add(comment.pos);
      ranges.push({ start: comment.pos, end: comment.end, kind: "comment" });
    }
  };
  const visit = (node: ts.Node) => {
    comments(node.getFullStart());
    comments(node.getEnd());
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      node.kind === ts.SyntaxKind.TemplateHead ||
      node.kind === ts.SyntaxKind.TemplateMiddle ||
      node.kind === ts.SyntaxKind.TemplateTail
    ) {
      // An import path or a module specifier is never prose.
      const parent = node.parent;
      const isSpecifier =
        parent &&
        (ts.isImportDeclaration(parent) ||
          ts.isExportDeclaration(parent) ||
          ts.isExternalModuleReference(parent) ||
          (ts.isCallExpression(parent) &&
            (parent.expression.kind === ts.SyntaxKind.ImportKeyword ||
              (ts.isIdentifier(parent.expression) &&
                parent.expression.text === "require"))));
      const text = (node as ts.LiteralLikeNode).text;
      // A template is prose only if its fixed text reads as prose as a whole:
      // `${key}:state:cancelled:${date}` builds a saved stable key.
      const template =
        node.kind === ts.SyntaxKind.TemplateHead ||
        node.kind === ts.SyntaxKind.TemplateMiddle ||
        node.kind === ts.SyntaxKind.TemplateTail
          ? ancestorTemplate(node)
          : null;
      const prose = template
        ? /\s/.test(templateText(template))
        : isProseString(text);
      if (!isSpecifier && /\S/.test(text) && prose)
        ranges.push({
          start: node.getStart(),
          end: node.getEnd(),
          kind: "string",
        });
    } else if (ts.isJsxText(node)) {
      if (/\S/.test(node.text))
        ranges.push({
          start: node.getStart(),
          end: node.getEnd(),
          kind: "jsx",
        });
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  comments(tree.getEnd());
  return ranges.sort((a, b) => a.start - b.start);
}

/** Markdown and plain text, outside fenced blocks and inline code spans. */
export function markupProseRanges(text: string): ProseRange[] {
  const ranges: ProseRange[] = [];
  let offset = 0;
  let fence: string | null = null;
  // Front matter is data except for its human fields: `id: old-favour-returns`
  // names a file and a release entry, and must match the file it sits in.
  let frontMatter = text.startsWith("---\n");
  let first = true;
  for (const line of text.split(/(?<=\n)/)) {
    if (frontMatter) {
      if (!first && /^---\s*$/.test(line)) frontMatter = false;
      else if (/^(title|description|summary):\s/.test(line))
        ranges.push({
          start: offset,
          end: offset + line.length,
          kind: "markdown",
        });
      first = false;
      offset += line.length;
      continue;
    }
    const trimmed = line.trimStart();
    const opener = /^(```+|~~~+)/.exec(trimmed);
    if (fence) {
      if (opener && trimmed.startsWith(fence)) fence = null;
    } else if (opener) {
      fence = opener[1]!;
    } else if (!/^( {4}|\t)/.test(line) || /^\s*[-*\d]/.test(trimmed)) {
      const code = /`+[^`\n]*`+/g;
      let cursor = 0;
      let span: RegExpExecArray | null;
      while ((span = code.exec(line)) !== null) {
        if (span.index > cursor)
          ranges.push({
            start: offset + cursor,
            end: offset + span.index,
            kind: "markdown",
          });
        cursor = span.index + span[0].length;
      }
      if (cursor < line.length)
        ranges.push({
          start: offset + cursor,
          end: offset + line.length,
          kind: "markdown",
        });
    }
    offset += line.length;
  }
  return ranges;
}

/** JSON string values with a space in them; keys and single tokens are data. */
export function jsonProseRanges(text: string): ProseRange[] {
  const ranges: ProseRange[] = [];
  const pattern = /"((?:[^"\\\n]|\\.)*)"(\s*:)?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match[2]) continue;
    if (!isProseString(match[1]!)) continue;
    ranges.push({
      start: match.index,
      end: match.index + match[1]!.length + 2,
      kind: "json",
    });
  }
  return ranges;
}

export function proseRanges(text: string, file: string): ProseRange[] {
  switch (proseKindOf(file)) {
    case "code":
      return codeProseRanges(text, file);
    case "markup":
      return markupProseRanges(text);
    case "json":
      return jsonProseRanges(text);
    default:
      return [];
  }
}
