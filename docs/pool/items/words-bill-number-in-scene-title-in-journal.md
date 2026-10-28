---
id: words-bill-number-in-scene-title-in-journal
title: "One bill, two names: the ask scene says HB 9, the journal says the Income Tax Act"
lead: words
area: play
kind: bug
priority: 2
size: S
status: done
claimed-by: words/bill-name-one
pr: #6461
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T00:45:47.756Z
---

**What.** In Fort Pierce South, Florida (Advanced, seed f40b8d6c2e7193a5, the member Adam Williamson), the sponsor's ask the evening before the April 1, 2025 floor vote says 'HB 9 comes down to a vote or two', and the player's journal tells the same vote as 'I voted for the Income Tax Act.' (moment office.voted:bill:office:US-FL:legislature-lower:2025-03-07:official:term:seat:US-FL:lower:098:0:2025-01-20:11:official:term:seat:US-FL:lower:028:0:2025-01-20). The scene words the bill by spokenDesignation (its number), the journal's office.voted row by billName (its subject title), so a player cannot tell they are the same bill. One name should carry through, or the second mention should tie them together ('HB 9, the Income Tax Act').

**Rules.** Ask why: name by record id which words the scene and the journal each took for the bill, and change the English engine's choice, not the record. No hand-written player text in code: the name comes from the bank and the bill's own record.

**Done when.** In a drawn place with a played floor vote the player was asked about, the ask scene and the journal line name the bill so a player reading both knows it is one bill, shown by a test on the composed scene and the composed journal that cites the bill's record id, and a screenshot of each.

**Files.** src/director/journal.ts, src/director/data/journal-rows.json, src/english/bill-names.ts

**Notes.** Found Oct 27 23:40 by the laws-and-effects lead while proving legislature-ask-before-the-roll-moves-the-vote in the bench.
