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
    if (/\.json$/.test(file)) {
      // Shipped data the screens read: string values only, map geometry and
      // very large files left out.
      if (file.includes("/geometry/") || statSync(file).size > 1_500_000)
        continue;
      const text = readFileSync(file, "utf8");
      const json = ts.parseJsonText(file, text);
      filesRead += 1;
      const walk = (node: ts.Node, parent: ts.Node | undefined) => {
        if (ts.isStringLiteral(node)) {
          const isKey =
            parent !== undefined &&
            ts.isPropertyAssignment(parent) &&
            parent.name === node;
          if (!isKey)
            add(
              node.text,
              file,
              json.getLineAndCharacterOfPosition(node.getStart(json)).line + 1,
            );
        }
        ts.forEachChild(node, (child) => walk(child, node));
      };
      walk(json, undefined);
      continue;
    }
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
      } else if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.PlusToken &&
        !(
          ts.isBinaryExpression(node.parent) &&
          node.parent.operatorToken.kind === ts.SyntaxKind.PlusToken
        )
      ) {
        // "I finished at " + school + " in " + month: the string pieces of a
        // concatenation fit around whatever the other operands print.
        const fragments: string[] = [];
        const flatten = (operand: ts.Expression) => {
          if (
            ts.isBinaryExpression(operand) &&
            operand.operatorToken.kind === ts.SyntaxKind.PlusToken
          ) {
            flatten(operand.left);
            flatten(operand.right);
          } else if (
            ts.isStringLiteral(operand) ||
            ts.isNoSubstitutionTemplateLiteral(operand)
          ) {
            const fragment = normalizeText(operand.text);
            if (fragment.length > 0) fragments.push(fragment);
          }
        };
        flatten(node);
        if (fragments.some((fragment) => HAS_LETTER.test(fragment)))
          templates.push({ fragments, file, line: lineOf(node) });
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
): readonly {
  file: string;
  line: number;
  via: "literal" | "template";
  /** What the line holds, stable when other lines move: the literal itself, or a template's fixed pieces. */
  id: string;
}[] {
  const normalized = normalizeText(text);
  const direct = index.exact.get(normalized);
  if (direct)
    return direct.map((entry) => ({
      file: entry.file,
      line: entry.line,
      via: "literal" as const,
      id: entry.text,
    }));
  const hits: {
    file: string;
    line: number;
    via: "template";
    id: string;
    fixed: number;
  }[] = [];
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
    // A fragment of one short word fits almost anything; require more, or
    // require the text to begin with the template's opening words ("Pin ${name}").
    const fixed = template.fragments.join("").length;
    const opens = normalized.startsWith(template.fragments[0]!);
    if (fits && (fixed >= 8 || (fixed >= 3 && opens)))
      hits.push({
        file: template.file,
        line: template.line,
        via: "template",
        id: template.fragments.join("~"),
        fixed,
      });
  }
  // The template with the most fixed words is the likeliest writer; a loose
  // template with a few short words fits almost anything and ranks last.
  return hits.sort((a, b) => b.fixed - a.fixed);
}

const JOINERS = [", ", " · ", " — ", " - "];

/**
 * A string made by joining several literals with a separator (an array of
 * phrases passed to `join`). Found by splitting the text at the separators so
 * every piece is a literal; the first piece's place is given.
 */
export function resolveJoined(
  index: LiteralIndex,
  text: string,
): { file: string; line: number; id: string } | null {
  const normalized = normalizeText(text);
  const ends = new Map<
    number,
    { file: string; line: number; id: string } | null
  >();
  const search = (start: number, pieces: number): boolean => {
    const whole = index.exact.get(normalized.slice(start));
    if (whole && pieces >= 1) {
      if (!ends.has(0))
        ends.set(0, {
          file: whole[0]!.file,
          line: whole[0]!.line,
          id: whole[0]!.text,
        });
      return true;
    }
    for (const joiner of JOINERS) {
      let at = normalized.indexOf(joiner, start + 1);
      while (at >= 0) {
        const head = index.exact.get(normalized.slice(start, at));
        if (head && search(at + joiner.length, pieces + 1)) {
          if (!ends.has(0) || start === 0)
            ends.set(0, {
              file: head[0]!.file,
              line: head[0]!.line,
              id: head[0]!.text,
            });
          return true;
        }
        at = normalized.indexOf(joiner, at + 1);
      }
    }
    return false;
  };
  return search(0, 0) && !index.exact.has(normalized)
    ? (ends.get(0) ?? null)
    : null;
}
