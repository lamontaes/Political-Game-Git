---
id: docs-stale-2026-10-23-audit-part-3-freshness-check
title: "Optional freshness check for docs"
area: docs
kind: cleanup
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: docs-stale-2026-10-23-audit-part-2-repair-pointers
blocked-on:
lead: cto
model: sonnet
effort: medium
root: none
source: split from docs-stale-2026-10-23-audit in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Nothing checks a doc's freshness, so ended docs drift back into the live tree. This optional part adds a script that lists docs without a Current as of line and prints the table in release:check. The first attempt truncated the git inventory at the default buffer, so the new script must read the inventory without that limit. Guards: the docs tree, so ended docs do not drift back (owner, Oct 23); its parent waits on it.

**Cause.** Design: the owner on Oct 23 ("stop the stale docs"), recorded in docs/coordination/OWNER-DECISIONS.md. The first attempt's `freshness.mjs` silently truncated the git file inventory at the default `maxBuffer` (ENOBUFS), per the Notes on the parent.

**Fix.** Only if wanted: add a script that lists docs without a Current as of line, reading the git inventory in a way that handles large output, and have `release:check` print the table. Skip it if a cheaper stamp check is chosen.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Replace, never layer: one freshness check, no second stamp system. Speed: the script runs in seconds on the whole docs tree.

**Done when.** A second session runs the script in a drawn place's checkout of main and sees the docs without a Current as of line listed, including files the inventory's size would have cut off. `release:check` prints the table and the script's own test passes.

**Waits on.** Part 2 (docs-stale-2026-10-23-audit-part-2-repair-pointers).

**Files.** package.json, scripts/release/index.ts
