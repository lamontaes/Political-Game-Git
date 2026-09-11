import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  ANCHOR_FILE,
  ANCHOR_SCHEMA,
  anchorFileExists,
  liveBindingsOf,
  loadAnchorFile,
  mintAnchors,
  siteOf,
  writeAnchorFile,
} from "./anchors";
import {
  allocationHistory,
  ANCHOR_PATHS,
  assertMonotonicAdvance,
  attestedIds,
  baselineOf,
  BASELINE_FILE,
  BASELINE_SCHEMA,
  BASELINE_SCHEMA_V1,
  describeHistoryProblems,
  indexOfId,
  issuanceOf,
  issuedDigestV1,
  LEDGER_FILE,
  LEDGER_SCHEMA,
  LEDGER_SCHEMA_V1,
  ledgerOf,
  loadAnchorBaseline,
  loadAnchorBaselineV1,
  loadAnchorLedger,
  loadAnchorLedgerV1,
  DEFAULT_ANCHOR_PATHS,
  symbolOf,
  unrecoverableIssuance,
  verifyAllocationHistory,
  writeAnchorBaseline,
  writeAnchorLedger,
  type AnchorBaseline,
  type AnchorIssuance,
  type AnchorLedger,
} from "./anchor-history";
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
 *   npm run corpus:prose -- ledger  absorb live anchor ids into the allocation
 *                                   ledger without minting or writing anchors
 *   npm run corpus:prose -- bootstrap  establish an EMPTY allocation lineage for
 *                                   a project that has never issued an anchor;
 *                                   refuses on any evidence of a lineage
 *   npm run corpus:prose -- recover  re-derive the missing half of the ledger
 *                                   and its checkpoint, in the safe direction
 *   npm run corpus:prose -- migrate  one-way upgrade of an inherited id-only
 *                                   ledger and checkpoint to per-id issuance
 *                                   provenance
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
    : transcript.campaign.legislativeRefusal
      ? `\n_Legislative work unavailable: ${transcript.campaign.legislativeRefusal}_\n`
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
 * Load both history files and refuse to go on if anything is wrong with them.
 *
 * Every write path starts here, and it throws rather than repairing, because
 * an operation that quietly fixes its own inputs cannot also be the thing that
 * detects they were broken. `bootstrap` is the single exception and says so
 * explicitly.
 */
function verifiedHistory(live: ReturnType<typeof liveBindingsOf>): {
  ledger: AnchorLedger;
  baseline: AnchorBaseline;
} {
  const ledger = loadAnchorLedger();
  const baseline = loadAnchorBaseline();
  const problems = verifyAllocationHistory({ ledger, baseline, live });
  if (problems.length > 0) {
    throw new Error(
      `Allocation history is not usable, so nothing was written.\n${describeHistoryProblems(problems)}`,
    );
  }
  // `verifyAllocationHistory` returns a problem for either file being absent,
  // so reaching here means both loaded.
  return { ledger: ledger!, baseline: baseline! };
}

/**
 * Persist the reservation superset, then mutate the sidecar. Never the reverse.
 *
 * The old order wrote the sidecar first and the ledger second, and an injected
 * ledger-write failure during a retirement was reproduced losing an id's last
 * reservation: the sidecar had already dropped the binding, so a retry handed
 * that number to new text. Ordering is the fix. The union persisted here
 * includes every id the sidecar is about to stop carrying, so an interruption
 * at any point leaves history ahead of the live set — ids burned, never
 * recycled.
 *
 * The two history files cannot be replaced in one filesystem step, so the
 * window between them is made DETECTABLE instead of impossible: each file is
 * replaced atomically, and a run interrupted between them leaves a ledger and
 * a checkpoint that disagree, which every later run refuses on until
 * `-- recover` is run deliberately. A failed operation may burn an unused id.
 * It may not recycle one, and it may not report success on partial state.
 *
 * Every caller passes the state it read, and the monotonic guard runs here
 * rather than in each command. A command is not trusted to preserve history
 * merely because it intends to: `-- ledger` intended to synchronise and was
 * reproduced re-basing trust downward.
 */
function persistHistory(
  issuances: Iterable<AnchorIssuance>,
  prior: {
    ledger: AnchorLedger | null;
    baseline: AnchorBaseline | null;
    operation: string;
  },
): void {
  const ledger = ledgerOf(issuances);
  assertMonotonicAdvance({
    next: ledger.issuances,
    priorLedger: prior.ledger,
    priorBaseline: prior.baseline,
    operation: prior.operation,
  });
  writeAnchorLedger(ledger);
  writeAnchorBaseline(baselineOf(ledger.issuances));
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
  const liveIds = before.anchors.map((anchor) => anchor.anchor);
  const { ledger, baseline } = verifiedHistory(liveBindingsOf(before.anchors));
  const history = allocationHistory(ledger, baseline, liveIds);

  const outcome = mintAnchors(computedLiterals(), before.anchors, history);

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

  // Reserve first. Only then may a binding be removed or rebound.
  persistHistory(outcome.issuances, {
    ledger,
    baseline,
    operation: "`-- anchors`",
  });
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

  // Enough allocation detail to prove no retired id was handed to new text:
  // the ledger only grew, every minted id is outside the pre-run ledger, and
  // the burned set is what the ledger keeps closed.
  const previouslyIssued = new Set(ledger.issued);
  const absorbed = outcome.issued.filter((id) => !previouslyIssued.has(id));
  process.stdout.write(
    `${LEDGER_FILE}: ${outcome.issued.length} ids ever issued (+${absorbed.length} newly reserved, ${outcome.burned.length} retired and permanently burned).\n`,
  );
  process.stdout.write(
    `${BASELINE_FILE}: checkpoint rewritten for ${outcome.issued.length} ids.\n`,
  );
  for (const id of outcome.minted) {
    process.stdout.write(
      `  minted ${id} (not present in the ledger before this run)\n`,
    );
  }
  for (const id of outcome.removed) {
    process.stdout.write(`  retired ${id} (id burned, never re-issued)\n`);
  }
}

/**
 * Absorb genuinely new live anchors into allocation history. Never re-base it.
 *
 * The case this exists for: a branch that minted anchors merges in, so the
 * sidecar holds ids the ledger never saw. A mint refuses in that state rather
 * than seeding itself from the live sidecar, so absorbing is a deliberate,
 * auditable step.
 *
 * What this is NOT is a trust bootstrap, and that distinction is the whole
 * repair. As shipped it loaded the ledger, unioned the live ids, and wrote a
 * checkpoint derived from whatever the ledger happened to contain — never
 * checking that ledger against the checkpoint that already attested it. Given
 * a ledger with one retired id surgically removed it exited 0, rewrote the
 * checkpoint DOWN to agree with the shortened file (count 420 to 419,
 * `RETURN_SUMMARY` high-water 23 to 22), and the next mint handed
 * `RETURN_SUMMARY-0023` to unrelated prose.
 *
 * So the existing three files are validated as one authoritative state before
 * anything is written. `unreserved-live-id` — an id alive in the sidecar that
 * history has not yet absorbed — is the ONE finding this command is allowed to
 * resolve, because resolving it only ever adds. Every other finding is a
 * refusal. The checkpoint then advances over evidence that already contains
 * everything the previous checkpoint attested, never over the input it was
 * supposed to be checking.
 *
 * It reads the sidecar and never writes it, so it stays safe to run while
 * another writer owns that file.
 */
function syncLedger(): void {
  const ledger = loadAnchorLedger();
  const baseline = loadAnchorBaseline();
  const anchors = loadAnchorFile().anchors;
  const live = liveBindingsOf(anchors);
  const liveIds = anchors.map((anchor) => anchor.anchor);

  const problems = verifyAllocationHistory({ ledger, baseline, live });
  const blocking = problems.filter(
    (problem) => problem.kind !== "unreserved-live-id",
  );
  if (blocking.length > 0) {
    throw new Error(
      `Refusing to absorb: this is a synchronisation step, not a repair. Allocation history must already be sound before new live ids are added to it, and it is not. Nothing was written to the ledger, the checkpoint, or the sidecar.\n${describeHistoryProblems(blocking)}`,
    );
  }
  // Only `unreserved-live-id` survives, and that finding is never produced
  // unless both files loaded.
  const trusted = { ledger: ledger!, baseline: baseline! };

  const known = new Set(trusted.ledger.issued);
  const absorbed = [...new Set(liveIds.filter((id) => !known.has(id)))].sort();
  // Each absorbed id records the binding it is absorbed AT, which is the
  // earliest evidence this history has of it. An id already recorded keeps the
  // record it has; absorption adds, and never rewrites.
  const next: AnchorIssuance[] = [...trusted.ledger.issuances];
  for (const anchor of anchors) {
    if (known.has(anchor.anchor)) continue;
    next.push(issuanceOf(anchor.anchor, siteOf(anchor), anchor.textRevision));
  }

  if (absorbed.length === 0) {
    process.stdout.write(
      `${LEDGER_FILE}: ${next.length} ids ever issued (+0 absorbed from ${ANCHOR_FILE}); already synchronised, nothing written.\n`,
    );
    return;
  }

  persistHistory(next, { ...trusted, operation: "`-- ledger`" });
  process.stdout.write(
    `${LEDGER_FILE}: ${next.length} ids ever issued (+${absorbed.length} absorbed from ${ANCHOR_FILE}).\n`,
  );
  for (const id of absorbed) {
    process.stdout.write(
      `  absorbed ${id} (live in the sidecar, now burned)\n`,
    );
  }
}

/**
 * Establish an EMPTY allocation lineage, and only on proof there is none.
 *
 * As shipped this seeded history from the live sidecar whenever both history
 * files were absent, and warned that retired ids were unknown to the seed. A
 * warning was the only guard, and 128A3 walked through it: mint
 * `RETURN_SUMMARY-0023`, retire it, delete the ledger and the checkpoint, and
 * bootstrap accepted the loss as a fresh install — count 420 to 394,
 * `RETURN_SUMMARY` high-water 23 to 22 — after which an unrelated mint was
 * handed `-0023`. Loss of established history had become a new lineage through
 * an ordinary documented command.
 *
 * Two things are repaired. First, absence of the ledger and the checkpoint is
 * not accepted as proof of freshness; the live sidecar is positive evidence of a
 * lineage, and any live binding refuses. Second, and independently, bootstrap no
 * longer seeds ANYTHING from live ids: it establishes an empty lineage, so even
 * if it ran it could not lower a mark or free a number. A genuinely fresh
 * project has nothing to seed, and an established one is not this command's
 * business.
 *
 * An established project with missing history therefore fails closed, with the
 * restoration remedy named. That is the intended direction: availability is
 * subordinate to identity safety.
 */
function bootstrapHistory(): void {
  const ledger = loadAnchorLedger();
  const baseline = loadAnchorBaseline();
  if (ledger !== null || baseline !== null) {
    throw new Error(
      `Refusing to bootstrap: this project already has allocation history (${ledger !== null ? LEDGER_FILE : BASELINE_FILE} exists). Bootstrap establishes a new lineage and would erase what is recorded. Nothing was written.`,
    );
  }

  // Positive evidence of freshness, rather than absence of evidence of history.
  const live = anchorFileExists() ? loadAnchorFile().anchors : [];
  if (live.length > 0) {
    const symbols = [...new Set(live.map((anchor) => anchor.symbol))].sort();
    throw new Error(
      `Refusing to bootstrap: this project HAS an established anchor lineage, and its history files are missing.\n  ${ANCHOR_FILE} holds ${live.length} live binding(s) across ${symbols.length} symbol(s) (e.g. ${symbols
        .slice(0, 3)
        .join(
          ", ",
        )}). Every one of them was issued by some earlier run, so ${LEDGER_FILE} and ${BASELINE_FILE} existed and have been lost.\n  Absence of the two history files is not evidence that nothing was ever issued. It cannot be: the ids a lineage RETIRED are exactly the ones the live sidecar does not contain, so a lineage rebuilt from live bindings alone silently frees every retired number — reproduced handing a retired id to unrelated prose on the very next mint.\n  Remedy: restore ${LEDGER_FILE} and ${BASELINE_FILE} from version control; both are committed and the diff is reviewable. If only one is missing, \`npm run corpus:prose -- recover\` handles the direction that is provably safe. Bootstrap is for a project that has never issued an anchor, and this is not one. Nothing was written.`,
    );
  }

  persistHistory([], {
    ledger: null,
    baseline: null,
    operation: "`-- bootstrap`",
  });
  process.stdout.write(
    `Established an EMPTY allocation lineage.\n${LEDGER_FILE}: 0 ids ever issued.\n${BASELINE_FILE}: checkpoint written.\n`,
  );
  process.stdout.write(
    "  Nothing was seeded from live bindings, because there are none: this command creates the two history files for a project that has never issued an anchor, and cannot free a number or lower a mark. The next `-- anchors` run mints this lineage's first ids.\n",
  );
}

/**
 * One-way upgrade from the inherited id-only history to per-id provenance.
 *
 * Explicit rather than automatic, because the honest result of the upgrade is
 * partly UNKNOWN and that must be visible. An id-only ledger records that a
 * number was issued and nothing about the site it was issued for, so:
 *
 *   - a LIVE id's site coordinate is recoverable from the sidecar, and is
 *     genuine rather than inferred: the coordinate is invariant for the life of
 *     a binding, so what the sidecar says now is what was issued;
 *   - a RETIRED id's binding is gone, and is recorded as unrecoverable rather
 *     than filled in from anything. There is nothing left to recover it from.
 *
 * The v1 pair is validated against itself first. A shortened or re-pointed v1
 * ledger is refused here exactly as everywhere else, so migration cannot be the
 * step that launders a truncation into a new lineage.
 */
function migrateHistory(): void {
  const v1Ledger = loadAnchorLedgerV1();
  const v1Baseline = loadAnchorBaselineV1();
  if (v1Ledger === null || v1Baseline === null) {
    throw new Error(
      `Nothing to migrate: schema ${LEDGER_SCHEMA_V1} history requires both ${LEDGER_FILE} and ${BASELINE_FILE}, and ${v1Ledger === null ? LEDGER_FILE : BASELINE_FILE} is absent. Restore the pair from version control. Nothing was written.`,
    );
  }

  const digest = issuedDigestV1(v1Ledger.issued);
  if (
    v1Ledger.issued.length !== v1Baseline.count ||
    digest !== v1Baseline.digest
  ) {
    throw new Error(
      `Refusing to migrate: the inherited pair does not agree with itself. ${LEDGER_FILE} holds ${v1Ledger.issued.length} ids digesting to ${digest}, but ${BASELINE_FILE} attests ${v1Baseline.count} digesting to ${v1Baseline.digest}. Migration carries history forward; it does not decide which of two disagreeing files is true. Restore the pair from version control, or reconcile it with \`-- recover\` under the old build first. Nothing was written.`,
    );
  }
  const derived = new Map<string, number>();
  for (const id of v1Ledger.issued) {
    const symbol = symbolOf(id);
    derived.set(symbol, Math.max(derived.get(symbol) ?? 0, indexOfId(id)));
  }
  for (const [symbol, mark] of Object.entries(v1Baseline.highWater)) {
    const now = derived.get(symbol) ?? 0;
    if (now < mark) {
      throw new Error(
        `Refusing to migrate: ${BASELINE_SCHEMA_V1}-schema ${BASELINE_FILE} attests ${symbol} reaching ${mark} but ${LEDGER_FILE} goes no higher than ${now}. History has regressed and migration is not a repair. Nothing was written.`,
      );
    }
  }

  const bySite = new Map<string, { site: string; text: string }>();
  if (anchorFileExists()) {
    for (const anchor of loadAnchorFile().anchors) {
      bySite.set(anchor.anchor, {
        site: siteOf(anchor),
        text: anchor.textRevision,
      });
    }
  }

  const issuances: AnchorIssuance[] = v1Ledger.issued.map((id) => {
    const binding = bySite.get(id);
    return binding
      ? issuanceOf(id, binding.site, binding.text)
      : unrecoverableIssuance(id);
  });
  const recovered = issuances.filter(
    (issuance) => issuance.site !== null,
  ).length;

  // Prior is the v1 pair, which this build's monotonic guard cannot read, so
  // the invariant is asserted directly: migration adds provenance to exactly
  // the ids that were already issued and changes membership by nothing.
  const migratedIds = new Set(issuances.map((issuance) => issuance.id));
  const lost = v1Ledger.issued.filter((id) => !migratedIds.has(id));
  if (lost.length > 0 || migratedIds.size !== v1Ledger.issued.length) {
    throw new Error(
      `Refusing to migrate: the upgraded ledger would not hold exactly the ${v1Ledger.issued.length} ids the inherited one holds. Nothing was written.`,
    );
  }
  persistHistory(issuances, {
    ledger: null,
    baseline: null,
    operation: "`-- migrate`",
  });

  process.stdout.write(
    `Migrated allocation history to schema ${LEDGER_SCHEMA} / checkpoint schema ${BASELINE_SCHEMA}.\n`,
  );
  process.stdout.write(
    `${LEDGER_FILE}: ${issuances.length} ids ever issued, unchanged. ${recovered} carry a recovered site binding; ${issuances.length - recovered} are recorded with their binding UNRECOVERABLE.\n`,
  );
  process.stdout.write(
    `${BASELINE_FILE}: checkpoint rewritten with exact issued membership per symbol.\n`,
  );
  process.stdout.write(
    "  The unrecoverable records are the ids this lineage RETIRED before provenance was kept. Their numbers stay burned forever; what is gone is only the record of which site each was issued for, and it is recorded as gone rather than guessed. This migration is one-way.\n",
  );
}

/**
 * Repair a partial commit, but only where the direction is provably monotonic.
 *
 * Every route here is allowed to move history FORWARD over independently
 * retained evidence, and none is allowed to move it back. The route that used
 * to break that — re-deriving a checkpoint from a ledger when the checkpoint
 * was missing — is gone, because it was reproduced doing real damage: delete
 * the checkpoint, shorten the ledger by one retired id, run `-- recover`, and
 * it wrote a checkpoint whose `RETURN_SUMMARY` high-water had fallen from 23
 * to 22. The next mint then handed `RETURN_SUMMARY-0023` to unrelated prose.
 *
 * A ledger with nothing to attest it is not evidence of itself. There is no
 * safe automatic repair for that state, so it fails closed with a manual
 * remedy: both files are committed to version control, and restoring the
 * checkpoint is a one-line operation with a reviewable diff. Availability is
 * subordinate to identity safety.
 */
function recoverHistory(): void {
  const ledger = loadAnchorLedger();
  const baseline = loadAnchorBaseline();

  if (ledger === null && baseline === null) {
    throw new Error(
      `Nothing to recover from: both ${LEDGER_FILE} and ${BASELINE_FILE} are missing. Restore them from version control. If this project has genuinely never allocated an anchor, run \`npm run corpus:prose -- bootstrap\`.`,
    );
  }

  if (baseline === null) {
    throw new Error(
      `Refusing to recover: ${BASELINE_FILE} is missing, so ${LEDGER_FILE} has nothing independent attesting it and this command cannot tell an intact ledger from a shortened one. Re-deriving a checkpoint from the ledger alone was reproduced lowering a high-water mark and making a retired id allocatable again.\n  Remedy: restore ${BASELINE_FILE} from version control — it is committed alongside the ledger, and the diff is reviewable. Nothing was written.`,
    );
  }

  if (ledger === null) {
    // The safe direction. Every index up to each recorded mark is reserved, so
    // the rebuild is a SUPERSET of the real history: some numbers are burned
    // unused, and none can be recycled. The checkpoint's exact membership is
    // included as well, so nothing it attests can be missed.
    const rebuilt = new Map<string, AnchorIssuance>();
    const reserve = (id: string) => {
      if (!rebuilt.has(id)) rebuilt.set(id, unrecoverableIssuance(id));
    };
    for (const [symbol, mark] of Object.entries(baseline.highWater)) {
      for (let index = 1; index <= mark; index += 1) {
        reserve(`${symbol}-${String(index).padStart(4, "0")}`);
      }
    }
    for (const id of attestedIds(baseline)) reserve(id);
    // A live binding's site coordinate is genuine evidence, not a guess: the
    // coordinate is invariant for the life of a binding. A retired id's binding
    // is not recoverable from anything and stays recorded as unrecoverable.
    let recovered = 0;
    for (const anchor of loadAnchorFile().anchors) {
      rebuilt.set(
        anchor.anchor,
        issuanceOf(anchor.anchor, siteOf(anchor), anchor.textRevision),
      );
      recovered += 1;
    }
    persistHistory(rebuilt.values(), {
      ledger: null,
      baseline,
      operation: "`-- recover`",
    });
    process.stdout.write(
      `${LEDGER_FILE}: rebuilt conservatively from ${BASELINE_FILE} — every index the checkpoint attests, and every index up to each recorded high-water mark, is reserved (${rebuilt.size} ids). This is a superset of what was issued: some of these numbers were never used and are now burned unused, which is the safe direction.\n`,
    );
    process.stdout.write(
      `  ${recovered} live binding(s) recovered their site provenance from ${ANCHOR_FILE}; the remaining ${rebuilt.size - recovered} are recorded with their binding UNRECOVERABLE rather than invented. Their numbers stay burned.\n`,
    );
    return;
  }

  // Both present. The pair either agrees, or it disagrees in a direction that
  // says which failure produced it.
  const present = { ledger, baseline };
  const problems = verifyAllocationHistory({
    ledger: present.ledger,
    baseline: present.baseline,
    live: liveBindingsOf(loadAnchorFile().anchors),
  });
  const mismatch = problems.filter(
    (problem) =>
      problem.kind === "history-mismatch" ||
      problem.kind === "history-regressed",
  );
  if (mismatch.length === 0) {
    process.stdout.write(
      "Allocation history is already consistent; nothing to recover.\n",
    );
    return;
  }

  // The one repairable disagreement: a run that committed the ledger and was
  // interrupted before its checkpoint. History only ever grew, and no symbol's
  // reach went backwards, so re-deriving the checkpoint records what the
  // ledger already durably says. The monotonic guard in `persistHistory` is
  // still the thing that proves it, not this branch's own reasoning.
  const grew = present.ledger.issued.length > present.baseline.count;
  const regressed = mismatch.some(
    (problem) => problem.kind === "history-regressed",
  );

  // Growth is necessary and was reproduced insufficient. 128A3 removed an
  // issued member and added three later ids: the count rose, every per-symbol
  // maximum rose, and this route blessed a set that had LOST a binding while
  // printing "every id the old checkpoint attested is still issued". So the
  // superset is now proved against the checkpoint's exact membership instead of
  // inferred from its summary statistics, and the claim is only made once it is
  // true.
  const held = new Set(present.ledger.issued);
  const missing = attestedIds(present.baseline).filter((id) => !held.has(id));
  if (grew && !regressed && missing.length === 0) {
    persistHistory(present.ledger.issuances, {
      ...present,
      operation: "`-- recover`",
    });
    process.stdout.write(
      `${BASELINE_FILE}: re-derived from ${LEDGER_FILE}, which had grown from ${present.baseline.count} to ${present.ledger.issued.length} ids with no symbol going backwards — a mint interrupted between its two history writes. Every one of the ${present.baseline.count} issuances the old checkpoint attested is present in the new ledger, checked id by id.\n`,
    );
    return;
  }

  // Only the growth-shaped loss needs its own diagnosis; a ledger that simply
  // shrank is already answered by the refusal below.
  if (grew && missing.length > 0) {
    throw new Error(
      `Refusing to recover: ${LEDGER_FILE} has GROWN to ${present.ledger.issued.length} ids while DROPPING ${missing.length} that ${BASELINE_FILE} attests were issued, e.g. ${missing
        .slice(0, 3)
        .map((id) => JSON.stringify(id))
        .join(
          ", ",
        )}.\n  This is a membership loss wearing growth as a disguise, and it is the reason recovery no longer reasons from a total and a per-symbol maximum: both rise when an issued id in the middle is removed and later ids are added. An issuance set may only be blessed when it is a true superset of what is already attested, and this is not one.\n  Nothing was written — not the checkpoint, not the ledger, not the sidecar. Restore the pair from version control. Every id at or below a recorded mark stays closed regardless; the floor does not depend on this command succeeding.`,
    );
  }

  throw new Error(
    `Refusing to recover: ${LEDGER_FILE} holds ${present.ledger.issued.length} ids against a checkpoint attesting ${present.baseline.count}, so history has SHRUNK or gone backwards rather than been half-written. This command cannot tell which file is true.\n${describeHistoryProblems(mismatch)}\n  Restore the pair from version control. Re-deriving the checkpoint from a shortened ledger would launder a truncation into a new baseline. Note that ids at or below the checkpoint's recorded marks stay closed regardless: the floor is what stops a lost entry being handed out, and it does not depend on this command succeeding.`,
  );
}

/**
 * Read-only integrity report over the two history files and the live sidecar.
 *
 * Used by `check` and by the corpus test that runs under `npm run validate`.
 * It writes nothing, by construction: an emptied ledger used to pass
 * `corpus:prose check` with exit 0 because nothing on that path looked at
 * permanence at all.
 */
export function anchorHistoryProblems(): string[] {
  return verifyAllocationHistory({
    ledger: loadAnchorLedger(),
    baseline: loadAnchorBaseline(),
    live: liveBindingsOf(loadAnchorFile().anchors),
  }).map((problem) => `[${problem.kind}] ${problem.detail}`);
}

/**
 * Say so, loudly, when a run is not reading the repository's own files.
 *
 * The override is all-or-none, so this prints the whole coupled set rather
 * than whichever path happened to differ — the failure it guards against is
 * exactly a caller believing they are on scratch data for one file and
 * canonical data for another.
 */
function reportCoupledPaths(): void {
  if (!ANCHOR_PATHS.overridden) return;
  process.stdout.write(
    `NOTE: anchor paths are overridden by environment; this run does not read the repository's own files.\n  sidecar    ${ANCHOR_FILE}\n  ledger     ${LEDGER_FILE}\n  checkpoint ${BASELINE_FILE}\n`,
  );
}

/**
 * A sidecar that is simply absent is only legitimate before a bootstrap.
 *
 * Otherwise it is a lost file or a mis-aimed override, and treating it as "no
 * live anchors" would let a command run against a state nobody has. Under an
 * override it is the reproduced mis-aim: point the sidecar variable at a path
 * that does not exist and every live identity silently disappears.
 */
function requireSidecar(mode: string): void {
  if (anchorFileExists()) return;
  const ledger = loadAnchorLedger();
  const baseline = loadAnchorBaseline();
  // An EMPTY lineage with no sidecar is coherent, not lost: nothing has been
  // issued, so there is nothing for a sidecar to hold. That is exactly the
  // state `-- bootstrap` now leaves behind, and the first mint writes the
  // sidecar. A lineage that HAS issued something is a different matter.
  const issuedSomething =
    (ledger !== null && ledger.issued.length > 0) ||
    (baseline !== null && baseline.count > 0);
  if (!issuedSomething) return;
  throw new Error(
    `Refusing to run \`-- ${mode}\`: ${ANCHOR_FILE} does not exist, but this project has allocation history. A missing sidecar is a lost file or a mis-aimed path, never an empty one. ${
      ANCHOR_PATHS.overridden
        ? "The anchor paths are overridden; check that the whole coupled set points at the intended copies."
        : `Restore ${DEFAULT_ANCHOR_PATHS.anchors} from version control.`
    } Nothing was written.`,
  );
}

function main(): void {
  const mode = process.argv[2] ?? "build";
  reportCoupledPaths();
  if (
    mode === "anchors" ||
    mode === "ledger" ||
    mode === "check" ||
    mode === "migrate"
  ) {
    requireSidecar(mode);
  }
  if (mode === "migrate") {
    migrateHistory();
    return;
  }
  if (mode === "anchors") {
    mint();
    return;
  }
  if (mode === "ledger") {
    syncLedger();
    return;
  }
  if (mode === "bootstrap") {
    bootstrapHistory();
    return;
  }
  if (mode === "recover") {
    recoverHistory();
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
    // Allocation history first. Green artifacts prove the corpus regenerates;
    // they say nothing about whether an id can be handed out twice, and an
    // emptied ledger used to pass this command with exit 0.
    const historyProblems = anchorHistoryProblems();
    if (historyProblems.length > 0) {
      throw new Error(
        `Computed-anchor allocation history is not intact. This is a hard error: without it a retired id can be re-issued to unrelated prose, carrying an owner's recorded judgement onto text nobody reviewed.\n${historyProblems
          .map((problem) => `  ${problem}`)
          .join("\n")}`,
      );
    }

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
