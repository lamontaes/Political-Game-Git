---
id: world-port-town-pay
title: "Town pay lives in core"
area: world
kind: wiring
priority: 2
size: S
status: done
claimed-by:
pr: #4641
blocked-on:
source: "split from core-remaining-port-the-opening-town-builder-population (an L item), Oct 15"
claimed-at:
---

**What.** Town pay lives in core. This work was sent back by the merger on 2026-10-16 and is open for any builder to finish. The reason it came back: The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks. Finish it on the existing branch claude/world-port-town-pay, after merging main into it with a plain merge.

**Rules.** Follow the standing rule "Replace, never layer" and the other standing rules in AGENTS.md; merge main into the branch with a plain merge and never force-push. A release declaration in docs/release/changes/ and a gate line at the top of the PR body stay required before the merger takes it again.

**Done when.** The reason above is fixed on the branch, the changed-file tests pass in a drawn place and the branch merges cleanly with main, the PR body carries its gate line, and the merger can merge the pull request without sending it back again.

**Files.** docs/pool/items/world-port-town-pay.md and the files that pull request #4641 changes on claude/world-port-town-pay

**Notes.** Part of the opening town builder port (docs/coordination/core.md line 27; docs/design/old-core-retirement-map.md). Do the parts in any order; each keeps the town the same.

Sent back 2026-10-16 from PR #4641 (branch claude/world-port-town-pay): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4641 (branch claude/world-port-town-pay): The existing formatting blocker remains on the current merged head: prettier --check src/core2/reference/town-pay.generated.ts exits 1 and reports that file as unformatted. Format the generated output or update its generator/appropriate generated-file ignore rule, then rerun the changed-file checks and push. Main was merged and pushed cleanly; the PR now has its named gate line; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4641 (branch claude/world-port-town-pay): prettier on town-pay.generated.ts (see the comment on the PR); finish on that branch, merge main into it first.
