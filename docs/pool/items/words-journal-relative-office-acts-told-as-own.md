---
id: words-journal-relative-office-acts-told-as-own
title: 'The journal tells a relative''s bill as the player''s own: "I introduced Budget Ordinance."'
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by: words/journal-relative-acts
pr: #6376
blocked-on:
source: added with npm run pool -- add
lead: words
claimed-at: 2026-10-27T19:23:18.946Z
---

**What.** In a played Montana life (game seed a8153746-c9e8-45b9-a70a-bd3396686b70, Parker School), the player's mother is a county commissioner. Her bill reads "I introduced Budget Ordinance. I thought little of Maya then." in the player's journal, under the player's own U.S. Senator chapter. The line cites office.introduced:bill:office:gus2025:202110:board:2025-07-01:person_3a7b466e4bb5d08c:53, the mother's act. In composeJournal (src/director/journal.ts), a moment with no counterpart fact is worded as the player's own, so a relative's office act takes the first person.

**Rules.** Ask why: a journal line in the first person stands only on the player's own record. No hand-written player text: the relative's act is told by an otherLine from the bank, or not at all.

**Done when.** In a drawn place built with buildBenchWorld where a relative of the player holds office and introduces or votes on a bill, the player's journal never says I introduced or I voted for that bill. Their act is told as theirs or not told. A test in src/director names the place, the seed and the record id.

**Files.** src/director/journal.ts, src/director/journal.test.ts

**Notes.** Found while building play-stop-22-election-win-never-shown-b (PR #6147); the after journal screenshot in that PR shows it.
