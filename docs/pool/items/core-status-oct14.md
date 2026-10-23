---
id: core-status-oct14
title: "OPUS-CORE status file update (#4208)"
area: docs
kind: cleanup
priority: 2
status: done
claimed-by: core/status-oct14
pr: #4208
blocked-on:
milestone:
source: "open PR #4208"
claimed-at: 2026-10-15T23:02:31.805Z
---

**What.** The status file docs/archive/2026-10-23/coordination/core.md needs updating to say that three core pull requests merged. The carrying pull request has no gate line in its body and changes nothing in the game. It should be merged after main is merged into its branch, or closed if the file has since been rewritten. The player sees no difference.

**Rules.** Replace, never layer: the status file keeps one current checklist and the update replaces the stale lines rather than adding a second list beside them. Look before you ask: read DECISION-REGISTER.md before writing any open question in the file. American English in all prose.

**Done when.** The branch merged with main (plain merge) and the PR body carries its one gate line; docs/archive/2026-10-23/coordination/core.md lists the three merged core pull requests and its checklist matches the pool, with no test or run needed. A record id check: every checklist line names the pool item id that carries it. The CTO merges. The owner plays it: nothing changes in play.

**Files.** docs/archive/2026-10-23/coordination/core.md, docs/release/changes/

**Notes.** Read the PR body and any CTO comment first.
Sent back 2026-10-15 from PR #4208 (branch core/status-oct14): PR body has no gate line; finish on that branch, merge main into it first. (PR references as of 2026-10-15.)
