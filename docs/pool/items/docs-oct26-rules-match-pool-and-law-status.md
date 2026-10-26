---
id: docs-oct26-rules-match-pool-and-law-status
title: "Make the Oct26 rules match actual pool enforcement and current laws work"
area: docs
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** PR #6166 introduces useful owner rulings and a SMART process rule, but two added documentation claims are stale or broader than implemented behavior. The new rule claims all open items without time boxes are flagged by the pool CLI, which currently enforces that field only for play-first items. The added LAW-LINK package describes old handler counts and a parallel historical owner as current guidance, conflicting with the existing laws and effects lead; correct those statements without weakening any runtime or release guard.

**Rules.** Replace, never layer: correct the existing documentation and preserve the new owner rulings, while distinguishing process requirements from actual CLI enforcement and marking historical plans as history.

**Done when.** The pool time-box counterexample and handler recount are documented accurately; the new rule describes current enforcement truthfully, and LAW-LINK is removed from this PR or clearly dated and routed to current work. Changed Markdown formatting, release declaration and test:skill-ops checks run on the main-integrated branch, with any existing failures reproduced on clean main. One docs writer, no helpers, time box one hour.

**Files.** .agents/rules/smart-and-look-first.md, docs/packages/LAW-LINK.md, .agents/skills, .claude/skills, AGENTS.md, docs/coordination

**Notes.** Sent back 2026-10-26 from PR #6166 (branch claude/festive-gauss-ybtd28, checked dc46edc69a): inaccurate all-open-item Time box CLI claim and obsolete LAW-LINK present-tense counts/ownership; fix on this branch, merge main first. Other rule/ruling changes are preserved; no runtime failure or full gate green claimed.
