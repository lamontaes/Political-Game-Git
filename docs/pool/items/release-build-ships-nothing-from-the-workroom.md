---
id: release-build-ships-nothing-from-the-workroom
title: "A packaged build carries nothing from the workroom: no pool, coordination notes, tests, developer routes or dated owner notes"
area: release
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
standard: 2
model: sonnet
effort: medium
root: none
lead: cto
after:
checked: fable 2026-11-10
---

**What.** Lane 5's path 10 asks that a Mac build installs and opens with no workroom notes inside. Nothing checks what the packaged app holds, so docs, the pool, coordination files, test files, developer-only routes and dated owner notes in code or data could all ship. The early-access checklist (docs/packages/M7-early-access.md, Oct 19) already says dated owner decisions in the game must not ship, and release-audit-07-08 holds the same strip for data citations and stopgap text. Guards: the installed game a player opens, which must show no developer page or dated owner note (early-access checklist, Oct 19).

**Cause.** Design: docs/packages/M7-early-access.md line 88 (Oct 19) says dated owner decisions must not ship; desktop/scripts/stage.mjs stages the package, and nothing in scripts/release or .github/workflows/release-package.yml lists its files against a refusal list.

**Fix.** Add one script run on the output of desktop/scripts/stage.mjs that lists every file under docs, tests and the pool, every developer route the bench serves outside developer mode, and every line matching a dated owner or CTO note, and exits nonzero on any. Run it in .github/workflows/release-package.yml. It is one check over the packaged file list, run by the release machinery, not a second packaging path.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Replace, never layer: one check over the packaged app's own file list, run by the release machinery. The check names each file and line it refuses, so the fix is read from its output. Look before you ask: read release-audit-07-08-duplicate-pool-and-owner-notes first so the strip is not done twice.

**Done when.** A second session runs the script on a staged Mac build made from main and reads its list: zero refused files, with the count of files checked in the PR. It also opens the packaged app, plays a drawn place for a day, and confirms no developer route answers outside developer mode. The script is shown to exit nonzero when a docs file, a test file or a dated owner note is added to the staging folder, by a test.

**Waits on.** Nothing.

**Files.** desktop/scripts/stage.mjs, scripts/release, .github/workflows/release-package.yml, docs/packages/M7-early-access.md

**Notes.** TODO
