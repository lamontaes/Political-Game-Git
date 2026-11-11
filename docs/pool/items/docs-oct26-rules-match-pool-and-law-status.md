---
id: docs-oct26-rules-match-pool-and-law-status
title: "Make the Oct26 rules match actual pool enforcement and current laws work"
area: docs
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-docs-oct26-rules-match-pool-and-law-status
pr: #8382
after:
blocked-on:
lead: cto
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
claimed-at: 2026-11-11T00:29:19.170Z
checked: fable 2026-11-10
branch: claude/pool-docs-oct26-rules-match-pool-and-law-status
---

**What.** PR #6166 introduced useful owner rulings and a SMART process rule, but two documentation claims are stale or broader than the implemented behavior. The rule says the pool check flags an open item without a time box, while the check enforces the Time box only for play-first items (and for items at the standard). The LAW-LINK package describes old handler counts and a single Codex builder in the present tense, which conflicts with the laws and effects lead. Correct those statements without weakening any runtime or release guard.

**Cause.** Found in code: `.agents/rules/smart-and-look-first.md` line 15 says `npm run pool -- --check` flags an open item without a time box, but `scripts/pool/index.ts` (line 173) enforces the Time box only for items with `milestone: play-first`, and `scripts/pool/standard.ts` (`hasHours`) enforces it for items that carry `standard: 2`. `docs/packages/LAW-LINK.md` section "Who builds it, where" names one Codex session as the builder.

**Fix.** Reword line 15 to say what the check enforces now, and mark docs/packages/LAW-LINK.md as dated history routed to the laws lead. Preserve the new owner rulings. Mirror skill files only if one is touched.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: correct the existing documentation and preserve the owner rulings, distinguishing process requirements from actual CLI enforcement and marking historical plans as history. Look before you ask: read OWNER-DECISIONS.md for the laws lead before routing.

**Done when.** A second session reads `.agents/rules/smart-and-look-first.md` line 15 and finds it matching what `npm run pool -- --check` enforces, and reads docs/packages/LAW-LINK.md and finds it dated and routed to the laws lead. It runs `npm run pool -- --check` on a drawn place's checkout state of main and sees no new failure, and `npm run test:skill-ops` passes if a skill file was touched.

**Waits on.** Nothing.

**Files.** .agents/rules/smart-and-look-first.md, docs/packages/LAW-LINK.md, scripts/pool/index.ts, scripts/pool/standard.ts

**Notes.** Sent back 2026-10-26 from PR #6166 (branch claude/festive-gauss-ybtd28, checked dc46edc69a): inaccurate all-open-item Time box CLI claim and obsolete LAW-LINK present-tense counts/ownership; fix on this branch, merge main first. Other rule/ruling changes are preserved; no runtime failure or full gate green claimed.

Claimed by next for sonnet-cbfb (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 00:28 UTC) on branch claude/pool-docs-oct26-rules-match-pool-and-law-status.
