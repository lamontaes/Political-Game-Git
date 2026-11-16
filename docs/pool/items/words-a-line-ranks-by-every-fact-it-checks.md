---
id: words-a-line-ranks-by-every-fact-it-checks
title: "A scene line ranks by every fact it checks, so the line about the moment is said"
area: words
kind: bug
priority: 1
size: S
status: merged
standard: 2
claimed-by: account-lead-M4
pr: 9358
after:
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Account lead, Nov 15 01:20Z (owner, Nov 15: the scenes read plainer than they did weeks ago)
claimed-at: 2026-11-15
branch: claude/project-thread-irab2z
---

**What.** Where a line about the moment and a plain line both fit a spot, the plain line ties with it or replaces it. Measured in played scenes: after a vote the reporter opens with "Don't walk off yet. Two questions." as often as "A minute. It's about the vote." (Bothell WA, seed rank-m4:1); the hostile reporter asks "{outlet} is printing this either way. Your side?" as often as "Who did you talk to before you voted on {bill}?" (Salem OH, seed rank-m4); the rescuer never says "Will you let me call the rest of the family?" when a child or others were there (North Ridgeville OH, seed r1). Seen: in the reporter's call after a vote and in the talk the day after someone called for help.

**Cause.** Found in code: `useFit` (src/english/scene-talk-words.ts) ranked a line by its `requiresFacts` and gave `onlyWhen` facts no rank (Nov 14), so a line whose facts were moved to `onlyWhen` lost the rank that made it the most specific.

**Fix.** In the one ranking, `useFit`, a line ranks by every fact it checks, `requiresFacts` and `onlyWhen` alike, one per fact, no weight. The same count orders replies (the Words lead's plan, part 1d: a reply whose facts hold outranks one placed by nothing). Replaces the Nov 14 rule that onlyWhen adds no rank; the 72-line onlyWhen sweep is dropped.

**Time box.** 2 hours for one session.

**Rules.** Most specific line wins (words rule most-specific-line-wins); replace, never layer: one ranking for lines and replies.

**Done when.** A second session, on main, plays the reporter's call after a vote at a drawn place, names the place and seed, and reads an opener and a question about the vote; and plays a rescue where kin called for help and reads a request about the family or the household, never only a plain one.

**Waits on.** Nothing.

**Files.** src/english/scene-talk-words.ts, src/english/bank-parts.ts, src/english/only-when.test.ts, data/english/pulled.json
