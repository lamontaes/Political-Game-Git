import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import * as ts from "typescript";

/**
 * Every string a source file could put in front of a player, with where it is.
 *
 * Read from the syntax tree, not by searching text, so a quotation mark in a
 * comment is not a literal and a template's fixed pieces are found one by one.
 * A rendered string that matches one of these exactly (or, for a template, in
 * order around its gaps) came from that file and line.
 */
export interface LiteralEntry {
  readonly text: string;
  readonly file: string;
  readonly line: number;
}

export interface TemplateEntry {
  readonly fragments: readonly string[];
  readonly file: string;
  readonly line: number;
}

export interface LiteralIndex {
  readonly exact: ReadonlyMap<string, readonly LiteralEntry[]>;
  readonly templates: readonly TemplateEntry[];
  readonly filesRead: number;
}

const ENTITIES: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&nbsp;": " ",
  "&apos;": "'",
  "&quot;": '"',
  "&#39;": "'",
  "&mdash;": "\u2014",
  "&ndash;": "\u2013",
  "&hellip;": "\u2026",
  "&rsquo;": "\u2019",
  "&lsquo;": "\u2018",
};

export function normalizeText(value: string): string {
  return value
    .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

const HAS_LETTER = /[A-Za-z]/;

export function isTestFile(path: string): boolean {
  return (
    /\.(test|spec)\.[tj]sx?$/.test(path) ||
    /(^|\/)(__tests__|fixtures|__fixtures__)\//.test(path)
  );
}

export function listSourceFiles(root: string, dir = root): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...listSourceFiles(root, full));
    else out.push(relative(process.cwd(), full).split("\\").join("/"));
  }
  return out;
}

export function buildLiteralIndex(root = "src"): LiteralIndex {
  const exact = new Map<string, LiteralEntry[]>();
  const templates: TemplateEntry[] = [];
  let filesRead = 0;

  const add = (text: string, file: string, line: number) => {
    const normalized = normalizeText(text);
    if (normalized.length < 2 || !HAS_LETTER.test(normalized)) return;
    const list = exact.get(normalized) ?? [];
    list.push({ text: normalized, file, line });
    exact.set(normalized, list);
  };

  for (const file of listSourceFiles(root)) {
    if (!/\.(ts|tsx)$/.test(file) || /\.d\.ts$/.test(file) || isTestFile(file))
      continue;
    const source = readFileSync(file, "utf8");
    const tree = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    filesRead += 1;
    const lineOf = (node: ts.Node) =>
      tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1;

    const visit = (node: ts.Node) => {
      // Types, imports and property names are not text a player reads.
      if (
        ts.isImportDeclaration(node) ||
        ts.isExportDeclaration(node) ||
        ts.isLiteralTypeNode(node) ||
        ts.isTypeReferenceNode(node)
      )
        return;
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node)
      ) {
        const parent = node.parent;
        const isKey =
          (ts.isPropertyAssignment(parent) && parent.name === node) ||
          (ts.isPropertySignature(parent) && parent.name === node);
        if (!isKey) add(node.text, file, lineOf(node));
      } else if (ts.isJsxText(node)) {
        add(node.text, file, lineOf(node));
      } else if (ts.isTemplateExpression(node)) {
        const fragments = [
          node.head.text,
          ...node.templateSpans.map((span) => span.literal.text),
        ]
          .map((fragment) => normalizeText(fragment))
          .filter((fragment) => fragment.length > 0);
        if (fragments.some((fragment) => HAS_LETTER.test(fragment)))
          templates.push({ fragments, file, line: lineOf(node) });
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
  }
  return { exact, templates, filesRead };
}

/** The literals a rendered string equals, or the templates it fits around. */
export function resolveLiteral(
  index: LiteralIndex,
  text: string,
): readonly { file: string; line: number; via: "literal" | "template" }[] {
  const normalized = normalizeText(text);
  const direct = index.exact.get(normalized);
  if (direct)
    return direct.map((entry) => ({
      file: entry.file,
      line: entry.line,
      via: "literal" as const,
    }));
  const hits: { file: string; line: number; via: "template" }[] = [];
  for (const template of index.templates) {
    let from = 0;
    let fits = true;
    for (const fragment of template.fragments) {
      const at = normalized.indexOf(fragment, from);
      if (at < 0) {
        fits = false;
        break;
      }
      from = at + fragment.length;
    }
    // A fragment of one short word fits almost anything; require more.
    const fixed = template.fragments.join("").length;
    if (fits && fixed >= 8)
      hits.push({ file: template.file, line: template.line, via: "template" });
  }
  return hits;
}
