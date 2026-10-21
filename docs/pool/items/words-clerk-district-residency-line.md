---
id: words-clerk-district-residency-line
title: "The filing clerk says why a candidate may not file for a ward seat they do not live in"
area: words
kind: wiring
priority: 2
size: S
status: in-pr
claimed-by: claude/dazzling-heisenberg-w2egp9
pr: #5066
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T17:57:17.611Z
---

**What.** The filing clerk says why a candidate may not file for a ward seat they do not live in. Today the refusal gives no reason in words. The clerk's line comes from the English engine, reading the district residency refusal the filing rules already record.

**Rules.** No hand-written player text: the line is composed by the English engine from the refusal record, not written in a screen. Ask why: the line cites the recorded district and the candidate's recorded home.

**Done when.** In the played world, a candidate who lives outside a council ward files for that ward in a drawn place, and `src/director/filing-visit.test.ts` shows the clerk's line naming the ward and the refusal record id, with no fixed text in the screen.

**Files.** src/core2/modules/filing-clerk.ts, src/director/filing-visit.ts

**Notes.** Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.
