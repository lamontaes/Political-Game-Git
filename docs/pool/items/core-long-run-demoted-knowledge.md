---
id: core-long-run-demoted-knowledge
title: "People back in the counts keep and keep gaining knowledge (Montpelier, Vermont: 921,660 facts at year 4)"
area: core
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: memory/full-demotion
pr: #8051
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-09T10:02:10.556Z
---

**What.** A household returned to the counts (counted-demotion.ts) keeps every fact its people knew in core.knowledgeByPerson, and writers that reach people by place or county (news readersOf for a county or state story, among others) go on adding to it. Montpelier, Vermont (5046000, world seed mont1, fast-forward), main 96c1c6b5: people back in the counts held 70,984 facts at year 1, 280,884 at year 2, 561,173 at year 3 and 921,660 at year 4, against 1,066,202 held by full people. No engine reads a counted person's facts.

**Rules.** Two-level population (owner, Oct 11): nobody gets a full past or memory until filled in; one model, two tiers. Keep results, give detail on demand (Oct 7, Nov 5, Nov 8).

**Done when.** A person returned to the counts holds no facts but the notes of events they take part in, and api.observe adds nothing else while they are counted; a refilled person learns again (counted-demotion.test.ts); a 4-year Montpelier twin against the same main shows the facts held by people back in the counts, the heap, and races, deaths and money with the differences explained.

**Files.** src/core2/modules/counted-demotion.ts, src/core2/state.ts, src/core2/knowledge-retention.ts, src/core2/counted-demotion.test.ts

**Notes.** TODO
