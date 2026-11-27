import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { attribution, gameCommentRanges, testPath } from "./guards/game-only";

type Comment = { from: number; to: number; raw: string; plain: string };
const archivePath = "docs/coordination/refactor/game-source-notes.txt";
const decisionsPath = "docs/coordination/OWNER-DECISIONS.md";
const ownerRuling = /\b(?:owner(?:'s)?|CTO|Lamontae)\b/i;
const date =
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,?\s+20\d{2})?/gi;
const attributions = new RegExp(attribution.source, "gi");

export function plainNote(text: string): string {
  const markers = [
    ...new Set(text.match(/\bSG-[\w.-]+|\bstopgap\([^()\n]*\)/g) ?? []),
  ];
  // A parenthetical attribution is provenance, not the surrounding explanation.
  const stack: number[] = [];
  const cuts: [number, number][] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "(") stack.push(i);
    if (text[i] === ")" && stack.length) {
      const start = stack.pop()!;
      if (attribution.test(text.slice(start + 1, i))) cuts.push([start, i + 1]);
    }
  }
  let plain = text;
  const outer = cuts.filter(
    ([start, end]) => !cuts.some(([a, b]) => a < start && b > end),
  );
  for (const [start, end] of outer.sort((a, b) => b[0] - a[0]))
    plain = plain.slice(0, start) + plain.slice(end);
  plain = plain
    .replace(/, on the owner's menu look:/gi, ":")
    .replace(/The CTO's ruling of[^:]{0,32}:\s*the count/gi, "The count")
    .replace(/built so the CTO and the owner can compare/gi, "used to compare")
    .replace(/This is the shape the owner asked for:\s*how/gi, "How")
    .replace(
      /The list is Lamontae's; it grows only through him\. He approved the last seven,\s*for the story director's moves, on \(docs\/design\/story-director\.md, answer 2\)\./gi,
      "The last seven cover the story director's moves.",
    )
    .replace(/, never on the owner's Mac/gi, "")
    .replace(
      /The counts are (?:April 1, 2020)?'s, not a later vintage's\./g,
      "The counts use the 2020 census vintage.",
    );
  // For a direct quote outside parentheses, remove the quotation as a unit.
  plain = plain.replace(
    /\b(?:the\s+)?(?:owner(?:'s)?|CTO)\b[^.!?\n"“]{0,100}(?:"[^"]*"|“[^”]*”)/gi,
    "",
  );
  plain = plain.replace(date, "").replace(attributions, "");
  plain = plain.replace(/\(\s*\)|\[\s*\]/g, "").replace(/\s+([.,;:])/g, "$1");
  plain = plain.replace(/\s+/g, " ").replace(/^[,;:\s]+|[,;:\s]+$/g, "");
  for (const marker of markers)
    if (!plain.includes(marker)) plain += ` ${marker}`;
  return plain.trim();
}

function reprint(raw: string, plain: string): string {
  const breaks = raw.match(/\r?\n/g) ?? [];
  const newline = breaks[0] ?? "\n";
  if (raw.startsWith("//")) {
    const lines = raw.split(/\r?\n/);
    const indent = /^\s*/.exec(lines[1] ?? "")?.[0] ?? "";
    const words = plain.split(" ").filter(Boolean);
    return lines
      .map((_, i) => {
        const prefix = i === 0 ? "//" : indent + "//";
        let line = "";
        while (
          words.length &&
          (i === lines.length - 1 ||
            !line ||
            line.length + words[0]!.length + prefix.length < 77)
        ) {
          line += (line ? " " : "") + words.shift()!;
        }
        return line ? prefix + " " + line : "";
      })
      .join(newline);
  }
  const open = raw.startsWith("<!--")
    ? "<!--"
    : raw.startsWith("/**")
      ? "/**"
      : "/*";
  const end = open === "<!--" ? "-->" : "*/";
  if (!breaks.length) return open + (plain ? ` ${plain} ` : " ") + end;
  const indent = /^\s*/.exec(raw.split(/\r?\n/).at(-1) ?? "")?.[0] ?? "";
  const words = plain.split(" ").filter(Boolean);
  const lines = Array.from({ length: breaks.length }, (_, i) => {
    const prefix = i === 0 ? open : indent + (open === "<!--" ? " " : "*");
    if (i === 0 && breaks.length > 1) return prefix;
    let line = "";
    while (
      words.length &&
      (i === breaks.length - 1 ||
        !line ||
        line.length + words[0]!.length + prefix.length < 77)
    ) {
      line += (line ? " " : "") + words.shift()!;
    }
    return line ? prefix + " " + line : prefix;
  });
  return [...lines, indent + end].join(newline);
}

function bodyOf(raw: string): string {
  if (raw.startsWith("//"))
    return raw
      .split(/\r?\n/)
      .map((line) => line.trimStart().slice(2).trim())
      .join(" ");
  return raw
    .replace(/^(?:<!--|\/\*\*?)/, "")
    .replace(/(?:-->|\*\/)$/, "")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^\*\s*/, ""))
    .join(" ");
}

export function stripFile(
  file: string,
  source: string,
): { output: string; removed: Comment[] } {
  if (testPath.test(file)) return { output: source, removed: [] };
  const spans = gameCommentRanges(file, source).sort(([a], [b]) => a - b);
  const grouped: { from: number; to: number; line: boolean }[] = [];
  for (const [from, raw] of spans) {
    const last = grouped.at(-1);
    const line = raw.startsWith("//");
    if (
      line &&
      last?.line &&
      /^\r?\n[\t ]*$/.test(source.slice(last.to, from))
    ) {
      last.to = from + raw.length;
    } else grouped.push({ from, to: from + raw.length, line });
  }
  const removed: Comment[] = [];
  let output = source;
  for (const { from, to } of grouped.reverse()) {
    const raw = source.slice(from, to);
    const body = bodyOf(raw).replace(/\s+/g, " ").trim();
    const normalized = body
      .replace(
        ". the count by place and type comes from the Census",
        ". The count by place and type comes from the Census",
      )
      .replace(
        ". how hard somebody is to change depends",
        ". How hard somebody is to change depends",
      );
    if (
      !attribution.test(raw) &&
      !raw.includes("The counts are 's, not a later vintage's.") &&
      body === normalized
    )
      continue;
    const plain = plainNote(normalized);
    const replacement = reprint(raw, plain);
    output = output.slice(0, from) + replacement + output.slice(to);
    removed.push({ from, to, raw, plain });
  }
  return { output, removed: removed.reverse() };
}

const fingerprint = (text: string) =>
  createHash("sha256").update(text).digest("hex");
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
function readOptional(file: string): string {
  try {
    return readFileSync(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}
function main() {
  const git = (args: string[]) =>
    execFileSync("git", args, {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });
  process.chdir(git(["rev-parse", "--show-toplevel"]).trim());
  const files = git(["ls-files", "-z", "--", "src", "public", "art"])
    .split("\0")
    .filter(Boolean);
  let archive = readOptional(archivePath);
  let decisions = readOptional(decisionsPath);
  let normalizedDecisions = normalize(decisions);
  const changes: { file: string; output: string }[] = [];
  const seen = new Set(archive.match(/^[a-f0-9]{64}(?= )/gm) ?? []);
  let count = 0;
  for (const file of files) {
    if (testPath.test(file) || !/\.(?:[cm]?[jt]sx?|html|css)$/i.test(file))
      continue;
    const original = readFileSync(file, "utf8");
    const { output, removed } = stripFile(file, original);
    if (!removed.length) continue;
    if (
      gameCommentRanges(file, output).some(([, text]) => attribution.test(text))
    )
      throw new Error(`Attribution remains in ${file}`);
    changes.push({ file, output });
    count += removed.length;
    for (const item of removed) {
      const id = fingerprint(file + "\0" + item.raw);
      if (seen.has(id)) continue;
      seen.add(id);
      archive += `\n${id} ${file}:\n${item.raw}\n`;
      const note = normalize(bodyOf(item.raw));
      if (
        ownerRuling.test(item.raw) &&
        note &&
        !normalizedDecisions.includes(note)
      ) {
        if (
          !decisions.includes(
            "## Verbatim rulings carried out of source comments",
          )
        )
          decisions +=
            "\n\n## Verbatim rulings carried out of source comments\n\nThe excerpts below preserve source wording. An excerpt is not a new ruling and does not supersede the decisions above.\n";
        decisions += `\n### ${file} · ${id.slice(0, 12)}\n\n~~~~text\n${item.raw}\n~~~~\n`;
        normalizedDecisions += " " + note;
      }
    }
  }
  const dry = process.argv.includes("--dry-run");
  if (changes.length && !dry) {
    mkdirSync(dirname(archivePath), { recursive: true });
    // Write the verbatim evidence before replacing a single live comment.
    writeFileSync(archivePath, archive);
    writeFileSync(decisionsPath, decisions);
    for (const { file, output } of changes) writeFileSync(file, output);
  }
  console.log(
    `${dry ? "Would strip" : "Stripped"} ${count} attributed comment groups in ${changes.length} files.`,
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main();
