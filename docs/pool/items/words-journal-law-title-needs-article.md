---
id: words-journal-law-title-needs-article
title: "The journal names a law by its bill title without its article"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The journal row for a vote names the law with the bill's short title (billName in src/director/journal.ts), and the graded line is "I voted for {law}.". A short title is always a name and its form word, such as "Bottle Deposit Act", so the rendered line reads "I voted for Bottle Deposit Act." without "the". Found by the laws lead while building the journal line for a learned law effect (laws-end-to-end-proof), whose authored lines say "the {law}" for this reason.

**Rules.** No hand-written player text: the article comes from the bank's own words or the title record, never typed in code. Ask why: the line still names the bill record it was filled from, by id.

**Done when.** In a played world (buildBenchWorld, a drawn place, seed named), a member who voted on a bill has a journal line that reads "I voted for the <Name> Act." (or Ordinance), naming the bill record id; a test fails when the article is dropped.

**Files.** src/director/journal.ts, src/director/data/journal-rows.json, data/english/parts/journal.json

**Notes.** TODO
