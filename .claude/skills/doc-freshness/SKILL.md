---
name: doc-freshness
description: >
  Keeps every live document in Our Civic Duty true: the dated header each doc
  carries, who refreshes what and when, the freshness check (npm run
  docs:fresh), and when to archive or delete a dead doc. Use at every CTO
  check-in, before merging a PR that deletes, renames or moves a path, when a
  ruling replaces an old one, or when asked to clean up stale docs.
---

# Doc freshness

Current as of 2026-10-23 (written after the Oct 23 doc audit; owner: "sick of stale stuff")

**Purpose:** no document on main says something that is no longer true. A stale doc is worse than none: the next session follows it.

## The header

- Every live doc carries one line directly under its title: `Current as of <YYYY-MM-DD> (<what changed last>)`. A doc without one is stale by definition. Anyone who changes or re-checks a doc updates the line.
- A status file or handoff that a newer one replaces carries `Superseded by <path>` directly under its title instead. Ended history carries the `> **History.**` banner, or moves to `docs/archive/<date>/`.
- Dated records (`docs/reports/<name>-<date>.md`, grading batches) are true as of their date and need no header.

## Who refreshes what, when

- **The merger,** before merging any PR that deletes, renames or moves a file, folder, script, skill or command, greps the live docs for the old name and sends the PR back if one still names it (`merger`, morning check, "Docs that still name what the PR removed").
- **The CTO,** at every check-in (`cto`), runs `npm run docs:fresh` and files what it flags as one pool item, `docs-stale-<date>`, listing each doc and its fix.
- **Any session that changes a rule** in `docs/coordination/OWNER-DECISIONS.md` updates, in the same PR, every doc that stated the old rule. The docs that state rules: `AGENTS.md`; the `cto`, `merger`, `researcher`, `words-engine` and `session-start` skills; `.agents/rules/standing-skills/`; `docs/pool/README.md`; `docs/ROADMAP.md` (scope calls). Add the old rule's telltale phrase to `banned` in `scripts/docs/freshness.json`.
- **A session that ends a process** (a status file, an order, a checklist the pool now carries) archives its doc in the same PR.

## The check

`npm run docs:fresh` runs `scripts/docs/freshness.mjs`; scope and phrases live in `scripts/docs/freshness.json`. For every live `.md` in scope (`AGENTS.md`, `ARCHITECTURE.md`, `docs/README.md`, `docs/ROADMAP.md`, `docs/roadmap/`, `docs/coordination/`, `docs/design/`, `docs/packages/`, `docs/work-orders/`, top-level `docs/reports/` and `docs/grading/`, `docs/pool/README.md`, the `src/` and `desktop/` and `scripts/*/` READMEs, every `.agents/skills/*/SKILL.md`, `.agents/rules/`, the PR template) it flags:

1. **header:** missing, or older than 14 days;
2. **path:** a backtick path, or a bare `src/`, `docs/`, `scripts/` or `.agents/` path, that resolves neither from the repo root nor from the doc's folder;
3. **pr** (only with `--prs`, needs `gh`): a `#NNNN` on a line that calls it open, pending, waiting or in review, when the PR is merged or closed;
4. **overruled:** a phrase from a rule `OWNER-DECISIONS.md` replaced ("only the CTO merges", "Sonnet is the only", "no skip-ahead", the 10,000 town cap, "Opus pillar", "status file"), unless the same line says it was replaced, withdrawn or superseded. The rulings logs themselves are exempt.

Docs under the History banner or `Superseded by` are skipped. It prints a table and exits 1 on any flag; `--report` always exits 0, `--today=YYYY-MM-DD` pins the date. `.claude/skills/` mirrors are checked by `npm run test:skill-ops`, not here.

`npm run release:check` runs it with `--report` first, so every release check prints the table without blocking. Pool item `docs-freshness-check-blocking` drops `--report` after the first clean run.

## Fixing what it flags

Pick one fix per doc, in this order:

- **UPDATE** the line in place when the doc is still the live one. Replace, never layer: rewrite the sentence, don't add a correction beside it.
- **FOLD INTO** the live doc when two docs say the same thing (one rulings log, `OWNER-DECISIONS.md`; one backlog, the pool; one roadmap, `docs/ROADMAP.md`), then archive or delete the copy.
- **ARCHIVE** (move to `docs/archive/<date>/<path under docs/>` and delete the original in the same commit) anything with a ruling, a decision or a measured result in it: ended status files, handoffs, work orders, packages, audits.
- **DELETE** everything else dead: an exact duplicate, a scratch note, a generated file nothing reads. Git keeps the history.

Before moving or deleting, grep code, tests and workflows for the path (`grep -rn "<path>" src scripts tests .github`); a file something reads moves with its reader updated in the same PR, or stays.

## Paste prompt for a doc-refresh helper

> Read AGENTS.md and .agents/skills/doc-freshness/SKILL.md in lamontaes/Political-Game-Git. Run `node scripts/docs/freshness.mjs --prs` on main and take the newest open `docs-stale-<date>` pool item. For every flagged doc, read its head and the lines flagged, check each claim against main and the newest rulings in docs/coordination/OWNER-DECISIONS.md, and fix it by the order in "Fixing what it flags": update in place with a fresh `Current as of` line, fold duplicates, archive anything with a ruling in it to docs/archive/<today>/, delete the rest. Docs only: one branch `docs/fresh-<date>`, one PR, line 1 `Pool item: docs-stale-<date>`, line 2 the gate (prettier on changed Markdown, `node scripts/docs/freshness.mjs`, `npm run test:skill-ops` if a skill changed), a table of path, what was stale (a short quote) and the fix, and a release declaration with `impact: none`. Mirror every changed `.agents/skills/<name>/SKILL.md` byte for byte into `.claude/skills/<name>/SKILL.md`. Never change a rule; if a doc and OWNER-DECISIONS.md disagree, the newest ruling wins and you quote it in the PR body.
