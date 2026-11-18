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

**Notes.** Evidence (Lane 3, Nov 4 UTC). `journal-relative-acts.test.ts` fails at seed `5912b772a81b593da085026cb674d4cbb192a2c9` on main code (Lane 3 head 3a8a08e2) with "toMatch() expects a string, got undefined": the member's own journal tells none of their bill acts (`office.introduced`/`office.voted`), so the first-person check has no line. Same failure with and without branch `lane3/journal-story`. The item is marked done; this is a regression to reopen or file as a new item.

**Notes.** Evidence (Journal builder, Nov 15, #9119). `journal-relative-acts.test.ts` is red the same way at seed `c0d0acbb610b6fbf16021d5d0afe28ba91fce3f6` on the clean Train (b22cd350) and on #9119's head, so it is the Train's. Cause found in code: the member in this test is not the player, and `forget` in src/director/ledger.ts folds a watched non-player's moments older than `directorMemoryRecentDays` (91) into monthly summaries except the top `directorMemoryKeptMoments` (24) by hindsight, and the player keeps every moment. The test drafts the bill on day 30, advances up to 120 more days, then composes the member's Journal; at this seed the member's first bill (introduced 2025-02-19) and the bills before it are folded away, so no line cites them. For the player this is not a gap (the player keeps every moment); it is a fact about the test's world: its member is a folded NPC. The fix is the test's: compose the member's Journal inside the recent window, or take the member's own act from a ledger that keeps it.
