import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ANCHOR_FILE,
  ANCHOR_SCHEMA,
  loadAnchorFile,
  mintAnchors,
  writeAnchorFile,
} from "./anchors";
import { buildCoverageReport, type CoverageReport } from "./coverage";
import { runDiagnostics, type DiagnosticReport } from "./diagnostics";
import { buildGroundingMap, groundingMarkdown } from "./grounding-map";
import { buildProseInventory, inventoryCsv } from "./inventory";
import {
  buildProseMetrics,
  compareToBaseline,
  type ProseBaseline,
} from "./metrics";
import {
  renderReviewPacket,
  reviewPacketStats,
  stripGenerationProvenance,
} from "./review-packet";
import { computedLiterals } from "./sources/computed";
import { runTranscriptMatrix, type SeedTranscript } from "./transcripts";
import type { ProseInventory } from "./inventory";

/**
 * Generate the corpus, or compare a later branch to the accepted baseline.
 *
 *   npm run corpus:prose            build every artifact into docs/prose-inventory
 *   npm run corpus:prose -- check   rebuild in memory and fail on drift or a hard error
 *   npm run corpus:prose -- diff    differential against the committed baseline
 *   npm run corpus:prose -- anchors mint/refresh identities for computed sites
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

export function buildBaseline(
  inventory: ProseInventory,
  diagnostics: DiagnosticReport,
): ProseBaseline {
  const metrics = buildProseMetrics(inventory.records);
  const texts: Record<string, string> = {};
  const contexts: Record<string, string> = {};
  for (const record of inventory.records) {
    texts[record.id] = record.textRevision;
    contexts[record.id] = record.contextRevision;
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
    contexts,
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
- \`grounding-map.md\` — what canonical data licenses each family's claims, and
  the exact evidence every withheld scene is missing.
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
one — collision detection fails closed.

For prose a function composes, the stable key is an **anchor** minted once into
\`scripts/prose-corpus/computed-anchors.json\`. Identity is matched, not derived:
extraction binds a site to its anchor on the site's FULL text within its own
(file, symbol) group. The earlier eight-word slug let an inserted sentence
sharing another's prefix take over its ID — carrying an owner's mark onto text
they never read — and let an edit past the eighth word keep a stale approval
alive. An unmapped site, an orphaned anchor or a changed repeat count is a hard
error rather than a quiet rematch.

## Review records are versioned

A mark is stored against a semantic ID **and** the \`textRevision\` and
\`contextRevision\` it was made against. Reword a line and it keeps its ID and
shows prior feedback as stale; change what grounds it and the same happens.
Marks written before versioning existed are migrated as historical, flagged for
revalidation, and the old storage key is deliberately left in place — nothing
here deletes an owner's feedback.

## What regenerates byte-identically, and what does not

Ten artifacts regenerate byte-identically. \`review-packet.html\` records the
commit it was generated from, so it cannot be identical across two different
commits; that field is marked \`data-provenance="head-sha"\` and
\`npm run corpus:prose -- check\` compares the packet with it blanked. An earlier
report called all eleven byte-identical, which was true of the ten and not of
the packet.

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

/**
 * Bring the computed-site anchor sidecar up to date.
 *
 * Separate from `build` on purpose. Minting changes identity, and identity
 * changes are the thing an owner's review record is pinned to, so they happen
 * because somebody asked rather than as a side effect of regenerating a report.
 */
function mint(): void {
  const before = loadAnchorFile();
  const outcome = mintAnchors(computedLiterals(), before.anchors);

  if (outcome.refused.length > 0) {
    const detail = outcome.refused
      .map(
        (problem) =>
          `  [${problem.kind}] ${problem.sourcePath} ${problem.symbol}\n    ${JSON.stringify(problem.text)}\n    ${problem.detail}`,
      )
      .join("\n");
    throw new Error(
      `Refusing to mint: ${outcome.refused.length} site(s) cannot be bound without guessing. Nothing was written.\n${detail}`,
    );
  }

  writeAnchorFile({
    schema: ANCHOR_SCHEMA,
    note: "Immutable identities for prose that a function composes. Minted by `npm run corpus:prose -- anchors`; never hand-number these.",
    anchors: outcome.anchors,
  });

  process.stdout.write(
    `${ANCHOR_FILE}: ${outcome.anchors.length} anchors (${outcome.minted.length} minted, ${outcome.rebound.length} reworded, ${outcome.removed.length} retired).\n`,
  );
  for (const entry of outcome.rebound) {
    process.stdout.write(
      `  reworded ${entry.anchor}\n    from ${JSON.stringify(entry.from)}\n    to   ${JSON.stringify(entry.to)}\n`,
    );
  }
}

function main(): void {
  const mode = process.argv[2] ?? "build";
  if (mode === "anchors") {
    mint();
    return;
  }
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

  if (inventory.anchorProblems.length > 0) {
    const detail = inventory.anchorProblems
      .map(
        (problem) =>
          `  [${problem.kind}] ${problem.sourcePath} ${problem.symbol}\n    ${JSON.stringify(problem.text)}\n    ${problem.detail}`,
      )
      .join("\n");
    throw new Error(
      `${inventory.anchorProblems.length} computed site(s) have no settled identity. This is a hard error: an unanchored site is where owner feedback slides onto another sentence.\n${detail}`,
    );
  }

  if (mode === "check") {
    const again = buildProseInventory();
    if (again.digest !== inventory.digest) {
      throw new Error("The inventory is not deterministic across two builds.");
    }

    // Regeneration, compared against what is committed. Ten artifacts must be
    // byte-identical; the review packet must be identical apart from the commit
    // it names, which it records on purpose. Saying "byte-identical" of all
    // eleven was the overstatement this check replaces.
    const drift: string[] = [];
    const committed = (name: string): string | null => {
      try {
        return readFileSync(join(OUT_DIR, name), "utf8");
      } catch {
        return null;
      }
    };
    const exact: [string, string][] = [
      [
        "prose-inventory.json",
        stableJson({
          digest: inventory.digest,
          counts: inventory.counts,
          records: inventory.records,
        }),
      ],
      ["prose-inventory.csv", inventoryCsv(inventory)],
      ["coverage-report.md", coverageMarkdown(coverage)],
      ["lint-summary.md", lintMarkdown(diagnostics, inventory)],
      ["lint-findings.json", stableJson(diagnostics.findings)],
      ["grounding-map.md", groundingMarkdown(buildGroundingMap(inventory))],
      ["metrics-baseline.json", stableJson(baseline)],
    ];
    for (const [name, expected] of exact) {
      const found = committed(name);
      if (found !== null && found !== expected) drift.push(name);
    }
    const packetOnDisk = committed("review-packet.html");
    if (
      packetOnDisk !== null &&
      stripGenerationProvenance(packetOnDisk) !==
        stripGenerationProvenance(html)
    ) {
      drift.push("review-packet.html (beyond its recorded commit)");
    }
    if (drift.length > 0) {
      throw new Error(
        `Committed artifacts do not match a fresh regeneration: ${drift.join(", ")}. Run \`npm run corpus:prose\`.`,
      );
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
      `corpus:check OK — ${inventory.counts.total} templates, ${diagnostics.warnings.length} warnings, ${coverage.counts.NEEDS_CLASSIFICATION} unclassified candidates. ${exact.length} artifacts byte-identical; review-packet.html identical apart from the commit it records.\n`,
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
  writeFileSync(
    join(OUT_DIR, "grounding-map.md"),
    groundingMarkdown(buildGroundingMap(inventory)),
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
