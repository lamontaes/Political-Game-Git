---
id: traits-accept-interview-reasons
title: "A candidate accepts a press interview by how much they need the coverage, not almost always"
area: people
kind: wiring
priority: 2
size: M
status: done
claimed-by:
pr: #6128
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** press.accept-interview's case is closeness to the reporter less any grudge less interviewShyness (-1), so it is at least 1 for every candidate with no grudge: all 120 asks were accepted in Halfway, Missouri and all 70 in Marblehead, Ohio (gap row 'circumstances saturate the choice'). Real candidates answer about half of such requests: the League of Women Voters' VOTE411 2024 report gives a national median candidate response rate of 51%, and incumbents respond less than challengers. Weigh what the interview brings the candidate: the coverage they still need (less the more of the town already knows them, so an incumbent needs it least), their standing with the reporter and any grudge, with temperament at the study's size.

**Rules.** No dice: the case and the lean decide, through the shared rule. Real rates check totals only. Ask why: each interview record keeps the reasons it was weighed on, so a test can trace every answer.

**Done when.** In the played election-window years of two drawn places (`scripts/traits/trait-wiring-audit.ts` with `TRAIT_AUDIT_ELECTION=1`), seeds named, the share of candidates who accept is within 0.4 to 0.62 and the crossed odds between the thirds of lean are within a factor of 1.5 of the research target (2.70 after the Oct 24 rescale); the base, reach and incumbency weights carry their sources and spreads; a test checks every answer against its kept reasons; and the press.accept-interview gap row is removed.

**Files.** src/core2/modules/press.ts, src/core2/data/press/parameters.json, src/core2/modules/press.traits.test.ts

**Notes.** TODO
Claim released Oct 25: branch never pushed (`claude/traits-accept-interview`).

Oct 26 (traits lead): done-when corrected before the PR to the measure the audit gives (played election-window years, not drawn test windows) and to the target after the Oct 24 rescale (2.70, not 2.47). Name recognition was tried first as the case and dropped: in drawn towns nearly every candidate is known to the whole town.

Merger 0: Sent back 2026-10-26 from PR #6128 (branch claude/traits-accept-interview): explicit merge-first dependency #5657 remains open at 48aa08ee5320d1c618548db2d3605688a4a30d54; main-targeted diff still includes shared civic-traits parent; recheck after parent merges; finish on that branch, merge main into it first.
