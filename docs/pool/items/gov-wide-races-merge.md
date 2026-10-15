---
id: gov-wide-races-merge
title: "Finish #4350: wide races merge with main"
area: elections
kind: wiring
priority: 1
status: in-pr
claimed-by:
pr: #4350
blocked-on:
milestone:
source: "reissue item 10; PR #4350 branch gov/session-c-wide-races"
---

**What.** Only the merge with main is left: candidacy.ts (candidacyReasons, both sides' sourceIds) and elections.ts (drop registered-voter from the eligibility union per #4357, keep press-employment). The owner-decision stopgap on press employment stays registered.

**Rules.** Merge main into the PR branch (plain merge, never force); a release declaration in docs/release/changes/.

**Done when.** Merges clean; wide-race tests pass; empty races resolve in a drawn place.

**Files.** src/core2/modules/candidacy.ts, elections.ts

**Notes.** Not a draft; ready once merged with main.
