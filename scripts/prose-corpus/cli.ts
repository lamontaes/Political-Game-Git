import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildCoverageReport, type CoverageReport } from "./coverage";
import { runDiagnostics, type DiagnosticReport } from "./diagnostics";
import { buildProseInventory, inventoryCsv } from "./inventory";
import {
  buildProseMetrics,
  compareToBaseline,
  type ProseBaseline,
} from "./metrics";
import { renderReviewPacket, reviewPacketStats } from "./review-packet";
import { runTranscriptMatrix, type SeedTranscript } from "./transcripts";
import type { ProseInventory } from "./inventory";

/**
 * Generate the corpus, or compare a later branch to the accepted baseline.
 *
 *   npm run corpus:prose            build every artifact into docs/prose-inventory
 *   npm run corpus:prose -- check   rebuild in memory and fail on drift or a hard error
 *   npm run corpus:prose -- diff    differential against the committed baseline
 *
 * Nothing here writes to `src/`, and nothing under `src/` may import it.
 */

const OUT_DIR = "docs/prose-inventory";

function headSha(): string {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" })
      .trim()
      .slice(0, 40);
  } catch {
    return "unknown";
  }
}

function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function shortHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function buildBaseline(
  inventory: ProseInventory,
  diagnostics: DiagnosticReport,
): ProseBaseline {
  const metrics = buildProseMetrics(inventory.records);
  const texts: Record<string, string> = {};
  for (const record of inventory.records) {
    texts[record.id] = shortHash(record.text);
  }
  const warningsByFamily: Record<string, number> = {};
  for (const warning of diagnostics.warnings) {
    warningsByFamily[warning.family] =
      (warningsByFamily[warning.family] ?? 0) + 1;
  }
  return {
    digest: inventory.digest,
    totalRecords: metrics.totalRecords,
    distinctTexts: metrics.distinctTexts,
    exactDuplicateGroups: metrics.exactDuplicates.length,
    normalizedDuplicateGroups: metrics.normalizedDuplicates.length,
    nearDuplicateClusters: metrics.nearDuplicateClusters.length,
    warningsByFamily: Object.fromEntries(
      Object.entries(warningsByFamily).sort(([a], [b]) => (a < b ? -1 : 1)),
    ),
    reachability: inventory.counts.byReachability,
    texts,
  };
}

function coverageMarkdown(report: CoverageReport): string {
  const needing = report.candidates.filter(
    (candidate) => candidate.verdict === "NEEDS_CLASSIFICATION",
  );
  const byFile = new Map<string, number>();
  for (const candidate of needing) {
    byFile.set(
      candidate.sourcePath,
      (byFile.get(candidate.sourcePath) ?? 0) + 1,
    );
  }
  const rows = [...byFile.entries()]
    .sort(
      ([leftPath, left], [rightPath, right]) =>
        right - left || (leftPath < rightPath ? -1 : 1),
    )
    .map(([path, count]) => `| ${count} | \`${path}\` |`)
    .join("\n");

  return `# Coverage discovery

This does not ask the adapters what they found. It walks the production source,
pulls every string literal out of the syntax tree, and asks of each one whether
the inventory has it. **100% is not claimed** — the number below that still
needs a person's judgement is the honest state of the check.

| Verdict | Count |
| --- | --- |
| INVENTORIED | ${report.counts.INVENTORIED} |
| INTENTIONALLY_NON_PLAYER_FACING | ${report.counts.INTENTIONALLY_NON_PLAYER_FACING} |
| DIAGNOSTIC_OR_TEST | ${report.counts.DIAGNOSTIC_OR_TEST} |
| **NEEDS_CLASSIFICATION** | **${report.counts.NEEDS_CLASSIFICATION}** |

Scanned ${report.scannedFiles} files holding ${report.totalLiterals} string
literals in total; the table counts only those that read like a sentence.

## Trees not scanned, and why

${report.exclusions.map((entry) => `- \`${entry.path}\` — ${entry.reason}`).join("\n")}

## Where the unclassified candidates are

| Candidates | File |
| --- | --- |
${rows}

Each candidate is listed in full, with its reason, in \`coverage-candidates.json\`.
`;
}

function lintMarkdown(
  diagnostics: DiagnosticReport,
  inventory: ProseInventory,
): string {
  const familyRows = Object.entries(diagnostics.countsByFamily)
    .sort(([, left], [, right]) => right - left)
    .map(([family, count]) => `| ${family} | ${count} |`)
    .join("\n");
  const metrics = buildProseMetrics(inventory.records);
  const ngrams = metrics.frequentNgrams
    .slice(0, 25)
    .map((entry) => `| \`${entry.ngram}\` | ${entry.count} | ${entry.banks} |`)
    .join("\n");
  const openings = metrics.repeatedOpenings
    .slice(0, 15)
    .map((entry) => `| \`${entry.ngram}\` | ${entry.count} |`)
    .join("\n");

  return `# Prose diagnostics — current main baseline

**${diagnostics.hardErrors.length} hard errors. ${diagnostics.warnings.length} review warnings.**

A hard error is objectively wrong: an ID collision, a slot the record's own
grounding cannot bind, a withheld record with no reason. A review warning is a
place worth an owner's eye and **nothing here is a ban** — a grounded character
may say "something", and a good sentence may contain "rather than". Style lint
that fails a build produces prose written to satisfy a regex, which is a worse
defect than the one it was aimed at.

## Warnings by family

| Family | Count |
| --- | --- |
${familyRows}

## Repetition

- ${metrics.totalRecords} templates, ${metrics.distinctTexts} distinct texts.
- ${metrics.exactDuplicates.length} exact duplicate groups.
- ${metrics.normalizedDuplicates.length} normalized duplicate groups.
- ${metrics.nearDuplicateClusters.length} near-duplicate clusters (Jaccard ≥ 0.72).

Exact duplicate text at two semantic locations is not itself a defect: each
keeps its own ID, and two banks may legitimately both offer "Say nothing".

### Most frequent 3–6 word n-grams

| N-gram | Count | Banks |
| --- | --- | --- |
${ngrams}

### Most repeated sentence openings

| Opening | Count |
| --- | --- |
${openings}

Every finding with its exact semantic ID is in \`lint-findings.json\`.
`;
}

function transcriptsMarkdown(transcripts: readonly SeedTranscript[]): string {
  const sections = transcripts.map((transcript) => {
    const linked = transcript.realizations.filter(
      (entry) => entry.templateId,
    ).length;
    const beats = transcript.beats
      .map((beat) => {
        const connective = beat.connective
          .map((line) => `> ${line}`)
          .join("\n");
        const options = beat.options
          .map(
            (option) =>
              `- ${option.key === beat.chosen ? "**" : ""}${option.label}${option.key === beat.chosen ? "** ← chosen" : ""}`,
          )
          .join("\n");
        const grounding =
          beat.causalInputs.length > 0
            ? `\n_Grounded by: ${beat.causalInputs.join("; ")}_\n`
            : "";
        const people =
          beat.people.length > 0
            ? `\n_Present: ${beat.people.join("; ")}_\n`
            : "";
        return `#### Beat ${beat.ordinal} — ${beat.date}, age ${beat.age} (${beat.sceneKind}${beat.stageKey ? `, ${beat.episodeKey}/${beat.stageKey}` : ""})

${connective}

${beat.prose}

${options}
${people}${grounding}`;
      })
      .join("\n");

    const campaign = transcript.campaign
      ? `### Campaign

- Filed: ${transcript.campaign.filed}
- Office: ${transcript.campaign.office ?? "—"}
- Sessions: ${transcript.campaign.sessions.length}
- Resolved: ${transcript.campaign.resolved} (${transcript.campaign.outcome ?? "—"})
${
  transcript.campaign.legislative
    ? `\n### Legislative surface reached\n\n- ${transcript.campaign.legislative.designation} — ${transcript.campaign.legislative.stage}\n${transcript.campaign.legislative.lines.map((line) => `  - ${line}`).join("\n")}\n`
    : "\n_No legislative surface: the capability layer did not open one for this run._\n"
}`
      : "";

    return `## ${transcript.key}

**Intent.** ${transcript.intent}

Seed \`${transcript.seed}\`, start age ${transcript.startAge}, ${transcript.personName}.
${transcript.beats.length} beats, ${transcript.realizations.length} realized lines, ${linked} linked back to a template.

**Actually demonstrated:** ${transcript.demonstrated.join(", ")}

${campaign}

### Beats

${beats}`;
  });

  return `# Fixed-seed transcript matrix

Played through the real player seams — \`projectStoryMoment\`,
\`chooseStoryOption\`, \`fileForOffice\`, \`spendAnAfternoon\`,
\`openLegislativeWork\` — so a surface these cannot reach is not reached here
either. No state is fabricated to make a scene eligible.

Each seed records what it is **meant** to expose and what it **actually**
exposed, so a seed that stops demonstrating its surface is visible rather than
quietly passing.

${sections.join("\n\n---\n\n")}
`;
}

function readme(
  inventory: ProseInventory,
  coverage: CoverageReport,
  diagnostics: DiagnosticReport,
  packetStats: ReturnType<typeof reviewPacketStats>,
): string {
  return `# Prose inventory — generated

Everything in this directory is generated by \`npm run corpus:prose\`. Do not
edit it by hand; edit the production bank or the generator and regenerate.

- \`prose-inventory.json\` / \`.csv\` — every player-facing template, keyed by
  stable semantic ID.
- \`coverage-report.md\` / \`coverage-candidates.json\` — the independent check
  that the inventory did not miss a surface family.
- \`lint-summary.md\` / \`lint-findings.json\` — hard errors and review warnings.
- \`transcripts.md\` — the fixed-seed matrix played through the real seams.
- \`metrics-baseline.json\` — the accepted baseline a later prose PR diffs
  against with \`npm run corpus:prose -- diff\`.
- \`review-packet.html\` — the owner reading copy.

## Current state

- **${inventory.counts.total}** inventoried templates.
- Reachability: ${Object.entries(inventory.counts.byReachability)
    .map(([key, value]) => `${value} ${key}`)
    .join(", ")}.
- **${coverage.counts.NEEDS_CLASSIFICATION}** coverage candidates still need a
  person's classification. 100% coverage is *not* claimed.
- **${diagnostics.hardErrors.length}** hard errors, **${diagnostics.warnings.length}** review warnings.

## Semantic IDs

\`prose:<domain>:<bank>:<stable-key>#<field>\`, for example
\`prose:life:episode:school.the-thing-you-got-blamed-for/cubby-space#line:0\`.

Coordinates, never positions. Adding an unrelated line renumbers nothing, seed
order and page position cannot reach an ID, and two records may never share
one — collision detection fails closed. Owner marks in the review packet key to
the ID, so a mark survives an edit elsewhere in the same bank.

## The review packet, and what is and is not proved about printing

The old packet (\`9d57f8d\`) shipped HTML containing **zero** server-rendered
review items: its whole body was a data array that client script built after
clearing the root. It printed with 95 trailing blank pages.

That is evidence, and it is deliberately **not** written down as the cause. The
mechanism was never demonstrated, and canonizing a guess would make a wrong
explanation into repository truth.

What this generator does instead is narrower and checkable: every review item is
emitted as server-rendered HTML, so reading and printing do not depend on script
running first. \`reviewPacketStats\` asserts what the file actually contains, and
the regression test in \`review-packet.test.ts\` holds it:

- ${packetStats.renderedItems} rendered items for ${packetStats.expectedItems} inventory records;
- ${packetStats.trailingBytes} bytes after the last item, of which the empty
  portion is small.

**Stated limitation.** No dependency in this repository rasterizes HTML into
paged output, so nothing here can programmatically prove a page count or assert
"no blank page N". The claim proved is the absence of a large empty trailing
allocation and the presence of the content without script — not the page count.
Confirming pagination needs a real browser print, which is an owner check.
`;
}

function main(): void {
  const mode = process.argv[2] ?? "build";
  const inventory = buildProseInventory();
  const diagnostics = runDiagnostics(inventory.records);
  const coverage = buildCoverageReport(inventory);
  const baseline = buildBaseline(inventory, diagnostics);

  if (mode === "diff") {
    const previous = JSON.parse(
      readFileSync(join(OUT_DIR, "metrics-baseline.json"), "utf8"),
    ) as ProseBaseline;
    const differential = compareToBaseline(previous, baseline);
    process.stdout.write(stableJson(differential));
    return;
  }

  const transcripts = runTranscriptMatrix(inventory);
  const html = renderReviewPacket({
    inventory,
    diagnostics,
    baseSha: headSha(),
    generatedFor: "owner prose review",
  });
  const packetStats = reviewPacketStats(html, inventory.counts.total);

  if (mode === "check") {
    const again = buildProseInventory();
    if (again.digest !== inventory.digest) {
      throw new Error("The inventory is not deterministic across two builds.");
    }
    if (diagnostics.hardErrors.length > 0) {
      throw new Error(
        `${diagnostics.hardErrors.length} hard error(s):\n${diagnostics.hardErrors
          .map((entry) => `  ${entry.id} ${entry.family}: ${entry.message}`)
          .join("\n")}`,
      );
    }
    if (!packetStats.endsCleanly) {
      throw new Error(
        `The review packet rendered ${packetStats.renderedItems} of ${packetStats.expectedItems} items.`,
      );
    }
    process.stdout.write(
      `corpus:check OK — ${inventory.counts.total} templates, ${diagnostics.warnings.length} warnings, ${coverage.counts.NEEDS_CLASSIFICATION} unclassified candidates.\n`,
    );
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    join(OUT_DIR, "prose-inventory.json"),
    stableJson({
      digest: inventory.digest,
      counts: inventory.counts,
      records: inventory.records,
    }),
  );
  writeFileSync(join(OUT_DIR, "prose-inventory.csv"), inventoryCsv(inventory));
  writeFileSync(
    join(OUT_DIR, "coverage-report.md"),
    coverageMarkdown(coverage),
  );
  // Only the candidates a person still has to judge are listed in full. The
  // excluded ones are summarised by file and reason: 3.8MB of "this is a key"
  // is not evidence anybody reads, and the reason is the part that is
  // reviewable.
  const excludedSummary = new Map<string, { reason: string; count: number }>();
  for (const candidate of coverage.candidates) {
    if (
      candidate.verdict === "INVENTORIED" ||
      candidate.verdict === "NEEDS_CLASSIFICATION"
    ) {
      continue;
    }
    const key = `${candidate.sourcePath}|${candidate.verdict}|${candidate.reason}`;
    const entry = excludedSummary.get(key) ?? {
      reason: candidate.reason,
      count: 0,
    };
    entry.count += 1;
    excludedSummary.set(key, entry);
  }
  writeFileSync(
    join(OUT_DIR, "coverage-candidates.json"),
    stableJson({
      counts: coverage.counts,
      needsClassification: coverage.candidates.filter(
        (candidate) => candidate.verdict === "NEEDS_CLASSIFICATION",
      ),
      excludedSummary: [...excludedSummary.entries()]
        .map(([key, entry]) => {
          const [sourcePath, verdict] = key.split("|");
          return {
            sourcePath,
            verdict,
            reason: entry.reason,
            count: entry.count,
          };
        })
        .sort((left, right) =>
          right.count - left.count ||
          (left.sourcePath ?? "") < (right.sourcePath ?? "")
            ? -1
            : 1,
        ),
    }),
  );
  writeFileSync(
    join(OUT_DIR, "lint-summary.md"),
    lintMarkdown(diagnostics, inventory),
  );
  writeFileSync(
    join(OUT_DIR, "lint-findings.json"),
    stableJson(diagnostics.findings),
  );
  writeFileSync(
    join(OUT_DIR, "transcripts.md"),
    transcriptsMarkdown(transcripts),
  );
  writeFileSync(join(OUT_DIR, "metrics-baseline.json"), stableJson(baseline));
  writeFileSync(join(OUT_DIR, "review-packet.html"), html);
  writeFileSync(
    join(OUT_DIR, "README.md"),
    readme(inventory, coverage, diagnostics, packetStats),
  );

  process.stdout.write(
    `Wrote ${OUT_DIR}: ${inventory.counts.total} templates, ${coverage.counts.NEEDS_CLASSIFICATION} unclassified candidates, ${diagnostics.hardErrors.length} hard errors, ${diagnostics.warnings.length} warnings.\n`,
  );
}

main();
