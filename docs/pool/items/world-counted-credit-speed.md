---
id: world-counted-credit-speed
title: "Counted consumer credit: rebuild the slow part (#4379)"
area: world
kind: bug
priority: 1
status: done
claimed-by: claude/world-counted-credit-speed
pr: #4620
blocked-on:
milestone:
source: "reissue item 2; PR #4379 branch law/session-a-counted-consumer-credit"
claimed-at: 2026-10-16T03:53:14.378Z
---

**What.** Counted consumer credit: rebuild the slow part (#4379). This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: the PR body says 'Do not merge until resolved': the matched year is 20.70 s against 16.57 s on main (24.9% slower), over the AGENTS.md limit that no change may make a year more than 20% slower. Bring the year within 20% (act on the day something changed, no per-day scans), re-measure on the same machine, update the body. Finish it on the existing branch law/session-a-counted-consumer-credit, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/world-counted-credit-speed.md and the files that pull request #4379 changes on law/session-a-counted-consumer-credit

**Notes.** REBUILD the slow part on the existing PR branch.

Session handed off Oct 15, 2026: branch claude/world-counted-credit-speed was never pushed; the work is PR #4379 (law/session-a-counted-consumer-credit, 19:40Z, no push since); remainder: the 24.9% slowdown (counted-household scan) is not fixed; make the read act on change or by index, get under 20%, prove a native loan in a drawn year.

Sent back 2026-10-16 from PR #4379 (branch law/session-a-counted-consumer-credit): the PR body says 'Do not merge until resolved': the matched year is 20.70 s against 16.57 s on main (24.9% slower), over the AGENTS.md limit that no change may make a year more than 20% slower. Bring the year within 20% (act on the day something changed, no per-day scans), re-measure on the same machine, update the body; finish on that branch, merge main into it first.
