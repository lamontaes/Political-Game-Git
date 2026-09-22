/**
 * "Built since last time, please review": the merges to main since the last
 * published render, written for ChatGPT to read.
 *
 * lamontae asked (2026-09-22) that everything built be put in front of ChatGPT
 * for review, and that no lane has to remember to report it. So this is built
 * from the merge history itself: a merge that nobody announced still appears,
 * because it is on main.
 *
 * Pure: the git reading lives in the CLI, which hands over one
 * {@link MergedChange} per first-parent merge.
 */

export interface ChangedFile {
  readonly path: string;
  /** Lines added plus lines removed; 0 for a binary file. */
  readonly linesChanged: number;
}

export interface MergedChange {
  readonly sha: string;
  /** ISO 8601 commit time of the merge. */
  readonly mergedAt: string;
  /** The merge commit's subject line. */
  readonly subject: string;
  /** The merge commit's body, which GitHub fills with the PR title. */
  readonly body: string;
  /** Every commit message the merge brought in, joined. */
  readonly messages: string;
  /** The subject of the newest commit the merge brought in. */
  readonly lastCommitSubject?: string;
  readonly files: readonly ChangedFile[];
}

const MAX_FILES_TO_READ = 8;
/** Past this, the merge is the queue itself; listing every id says nothing. */
const MAX_QUESTIONS_LISTED = 12;

/** Files a reviewer learns nothing from: generated output, records, art bytes. */
function worthReading(path: string): boolean {
  if (path.startsWith("docs/")) return false;
  if (path.startsWith("art/")) return false;
  if (/\.generated\.[a-z]+$/.test(path)) return false;
  if (/\.(png|jpe?g|webp|gif|zip|glb|woff2?)$/i.test(path)) return false;
  if (path === "package-lock.json") return false;
  return true;
}

/** "Merge pull request #404 — what it does" → "#404", "what it does". */
export function describeMerge(
  change: Pick<MergedChange, "subject" | "body" | "lastCommitSubject">,
): {
  readonly pr: string | null;
  readonly title: string;
} {
  const subject = change.subject.trim();
  const pr = /#(\d+)/.exec(subject)?.[1] ?? null;
  const dashed = /^Merge (?:pull request )?#?\d*:?\s*[—–-]\s*(.+)$/.exec(
    subject,
  );
  if (dashed?.[1]) return { pr: pr && `#${pr}`, title: dashed[1].trim() };
  const colon = /^Merge #\d+:\s*(.+)$/.exec(subject);
  if (colon?.[1]) return { pr: pr && `#${pr}`, title: colon[1].trim() };
  // "Merge pull request #419 from owner/branch": GitHub puts the PR title in the body.
  const firstBodyLine = change.body
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  return {
    pr: pr && `#${pr}`,
    title: firstBodyLine ?? change.lastCommitSubject?.trim() ?? subject,
  };
}

/**
 * The research questions a merge bears on: any question whose record the
 * merge changed, and any question id named in the messages it brought in.
 */
export function questionsTouched(
  change: Pick<MergedChange, "files" | "messages" | "body">,
  knownQuestionIds: readonly string[],
): string[] {
  const touched = new Set<string>();
  for (const file of change.files) {
    const match = /^docs\/research\/requests\/([a-z0-9-]+)\.json$/.exec(
      file.path,
    );
    const id = match?.[1];
    if (id && knownQuestionIds.includes(id)) touched.add(id);
  }
  const text = `${change.body}\n${change.messages}`;
  for (const id of knownQuestionIds) {
    if (new RegExp(`(^|[^a-z0-9-])${id}($|[^a-z0-9-])`).test(text))
      touched.add(id);
  }
  return [...touched].sort();
}

export function renderBuiltSince(
  changes: readonly MergedChange[],
  options: {
    readonly sinceLabel: string;
    readonly knownQuestionIds: readonly string[];
  },
): string {
  const lines = [
    "## Built since last time, please review",
    "",
    `Every pull request merged to main ${options.sinceLabel}, newest first, read from the merge history rather than from lanes' reports. "Files to read" leaves out documents, records, art and generated files. "Questions it bears on" is every research question whose record the merge changed or whose id its commits name; it says the merge touched that question, not that it implements the whole answer.`,
    "",
  ];
  if (changes.length === 0) {
    lines.push("Nothing has merged to main in this period.", "");
    return lines.join("\n");
  }
  for (const change of changes) {
    const { pr, title } = describeMerge(change);
    lines.push(
      `### ${pr ? `${pr} — ` : ""}${title}`,
      "",
      `Merged ${change.mergedAt.slice(0, 16).replace("T", " ")}Z as \`${change.sha.slice(0, 8)}\`.`,
      "",
    );
    const reading = change.files
      .filter((file) => worthReading(file.path))
      .sort(
        (a, b) =>
          b.linesChanged - a.linesChanged || a.path.localeCompare(b.path),
      );
    if (reading.length === 0) {
      lines.push(
        "Files to read: none; it changed only documents, records, art or generated files.",
      );
    } else {
      const shown = reading
        .slice(0, MAX_FILES_TO_READ)
        .map((file) => `\`${file.path}\``);
      const rest = reading.length - shown.length;
      lines.push(
        `Files to read: ${shown.join(", ")}${rest > 0 ? `, and ${rest} more` : ""}.`,
      );
    }
    const questions = questionsTouched(change, options.knownQuestionIds);
    lines.push(
      "",
      questions.length === 0
        ? "Questions it bears on: none recorded."
        : questions.length > MAX_QUESTIONS_LISTED
          ? `Questions it bears on: ${questions.length} research records, so this merge carried the research queue itself; see each question below.`
          : `Questions it bears on: ${questions.map((id) => `\`${id}\``).join(", ")}.`,
      "",
    );
  }
  return lines.join("\n");
}
