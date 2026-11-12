---
id: report-check-lead-skips-template-lines
title: "report:check reads the pull request template's line 1 and gate line as the lead and rejects them"
area: docs
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: words builder, Nov 12 (PR 8878)
lead: cto
standard: 2
model: sonnet
effort: low
root: none
---

**What.** `npm run report:check` treats everything before a body's first section heading as its lead, so a pull request body written to the repository's template fails on the template's own first lines: line 1 (`Pool item: <id>`, or `Touches pool item: none (... #8874)`) and the gate line (`Checks (changed files): ...`) are read as lead prose, and a pull request number or a file path in them is reported as "lead contains a pull request number" or "lead contains a file path". Builders move the template's text around to pass, which breaks the line the merge reads. Guards: a builder's pull request body passes the report check with the template's line 1 and gate line where the merge reads them.

**Cause.** Found in code: scripts/report-check/report-check.mjs, the lead block at lines 240 to 278: `leadPart` is the first level-1 part or `parts[0]`, and `lead` is every paragraph of it, so the template's line 1 and its gate line (and the HTML comment after them) are joined into `leadText` and `leadProse` and checked against `PR_REF` and `FILE_PATH`. Measured on PR 8878's body, Nov 12: "lead contains a pull request number ("#8874")" and "lead contains a file path ("docs/design/words-composer.md")", both from line 1.

**Fix.** Before computing the lead, drop from `leadPart`'s lines a first line that matches `^(Touches )?[Pp]ool item:`, a line that begins `Checks (changed files):`, and HTML comment lines; the lead is the first paragraph after them. Add a case to scripts/report-check/report-check.test.ts with the template's first three lines followed by a plain lead, which passes, and one whose lead after them names a file path, which fails.

**Time box.** 1 hour.

**Rules.** The template's line 1 stays exactly as the merge reads it (`Pool item: <id>`); the check changes, not the template.

**Done when.** A second session, in a drawn place it composes a speech for (`node --import tsx scripts/words/speech-outline-proof.ts <seed>`, quoting the place and seed in the body), runs `npm run report:check -- <file>` on a body that opens with the template's line 1 naming a pull request number and a gate line naming file paths, then a plain lead, and sees it pass; and on the same body with a file path in the lead paragraph, sees it fail on that lead line.

**Waits on.** Nothing.

**Files.** scripts/report-check/report-check.mjs, scripts/report-check/report-check.test.ts, .github/PULL_REQUEST_TEMPLATE.md
