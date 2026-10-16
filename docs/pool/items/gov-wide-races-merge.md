---
id: gov-wide-races-merge
title: "Finish #4350: wide races merge with main"
area: elections
kind: wiring
priority: 1
status: done
claimed-by: claude/gov-wide-races-merge
pr: #4350
blocked-on:
milestone:
source: "reissue item 10; PR #4350 branch gov/session-c-wide-races"
claimed-at: 2026-10-15T22:08:25.863Z
---

**What.** PR #4350 (wide races: state and federal candidates drawn from the whole state) is finished except for its merge with main. Two files conflict: `candidacy.ts` needs `candidacyReasons` with both sides' `sourceIds`, and `elections.ts` must drop `registered-voter` from the eligibility union per #4357 while keeping `press-employment`. The owner-decision stopgap on press employment stays registered. Once merged, a statewide or federal race has real challengers from the state instead of one or no candidate.

**Rules.** Replace, never layer: the superseded eligibility union is deleted in the merge, not kept beside the new one; Ask why: candidacyReasons keeps the reasons on both sides so any filing can say why; One rule, all 56 places: the wide-race logic reads state data and names no state; No dice: who runs is decided by traits, money and the law in force, never a roll; Placeholders: the press-employment owner-decision stopgap stays registered, with its question in OWNER-DECISIONS.md; Look before you ask: read DECISION-REGISTER.md before touching the press-employment question.

**Done when.** The branch merges clean with main (plain merge, never force), the wide-race tests pass, and an empty or one-candidate race in a drawn place now has challengers drawn from the whole state with reasons. In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body); name one statewide race, its candidates and their reason records. Include the release declaration in `docs/release/changes/`. The owner plays it: votes in a statewide race that has more than one real candidate.

**Files.** src/core2/modules/candidacy.ts, src/core2/modules/elections.ts, src/core2/data/stopgaps.json

**Notes.** Not a draft; ready once merged with main.
Sent back 2026-10-15 from PR #4350 (branch gov/session-c-wide-races): code conflict with main in src/core2/modules/candidacy.ts, src/core2/modules/elections.ts, stopgaps.json; finish on that branch, merge main into it first.
