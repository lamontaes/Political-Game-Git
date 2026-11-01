---
id: words-paper-and-journal-everyday-life
title: "The paper and the journal carry everyday life from the records: obituaries, weddings and births, milestones, letters to the editor, local business, with enough wordings that nothing repeats"
area: words
lead: words
kind: bug
priority: 1
size: L
status: claimed
claimed-by: words/paper-everyday
pr:
blocked-on:
source: owner, Nov 1 ("what are the events that are reported in the news/in journal? there needs to be real ones with some good fluff or else it will get old")
claimed-at: 2026-11-01T17:58:15.037Z
---

**What.** The news bank has about 124 story kinds, most of them government process (bills, committees, roll calls, budgets), with 3 to 7 wordings each. It has no obituaries, no wedding or anniversary notices, no milestone birthdays or retirements, no letters to the editor and no local business features. The journal's everyday lines are 15 routine-day pieces. A paper that prints the same council sentence every week gets old. This item makes the paper and the journal carry real everyday life from records the world already keeps, worded with enough variety that a reader rarely meets the same sentence twice in a year. First it measures what a played year actually prints.

**Rules.** No hand-written player text: every story and line comes from the banks and cites the record it reports, never invented news (scene-standard, ask why). Wire to the world: a new story kind is printed only from a record an engine writes. Where the record does not exist yet (weddings wait on the lives lead's partnership engine; town events wait on `world-community-calendar`), the kind waits and says so. Every bank piece plays unless the owner's grades reject it.

**Done when.** A played year in three drawn places (named with seeds) prints a measured table of story kinds and journal lines by count, before and after. After: at least eight everyday kinds print from records (obituary with the life's facts, birth notice, milestone birthday, retirement, letter to the editor from a resident's recorded view of a law, business opening or anniversary feature, school honor, police and fire log), and no single sentence repeats more than three times in a year's paper. Tests: printed-words and grade-reach pass.

**Time box.** Two days, Words with at most two helpers, one PR per kind or per pair.

**Files.** data/english/parts/news.json, data/english/parts/headlines.json, data/english/parts/journal.json, src/bench/printed-words.ts, src/core2/modules/press.ts, src/bench/printed-words.test.ts

**Notes.** Filed by the CTO, Nov 1 18:00, on the owner's question. Read: OWNER-DECISIONS (Oct 30 press briefs, Nov 1 every life simulated), the briefs column (#6824). Searched the pool for obituary, wedding, anniversary, letters to the editor and festival: no twin.
