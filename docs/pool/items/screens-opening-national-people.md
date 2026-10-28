---
id: screens-opening-national-people
title: "The opening points out national people only: no council members, no state legislators"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: screens/opening-national-people
pr: #6464
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T00:53:52.022Z
---

**What.** The owner's Oct 27 sitting, item 3, said: it doesn't need to be that long, you don't need your own council member, you just need the national people and maybe the governor. The opening still stood on the state capitol pointing out state legislators and went to the council chamber for the council members. The CTO's look-first audit raised it again.

**Rules.** Replace, never layer: the town stage and the state legislators are deleted from the opening's data with their picture rules, not hidden; one rule, all 56 places: the stages read the key-people list for every place.

**Done when.** In a drawn place (name the place and seed), src/bench/opening-tags.test.ts and src/director/opening-story.test.ts pass and assert no council member or state legislator is pointed out and the sequence is president, Congress, state, family; before and after screenshots are in the PR body.

**Files.** src/director/data/opening-story.json, src/director/opening-sequence.ts, src/bench/data/opening-pictures.json, src/bench/opening-tags.test.ts

**Notes.** playtest/2026-10-27-1.md item 3; CTO relay 00:05 UTC Oct 28. lead: play-first.
