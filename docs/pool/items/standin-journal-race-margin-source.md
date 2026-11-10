---
id: standin-journal-race-margin-source
title: "Source the journal's close-race and wide-race margins from published margin-of-victory counts"
area: director
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10
lead: researcher
standard: 2
model: sonnet
effort: low
root: none
---

**What.** A journal says a race was close when the winner led by five points or fewer, and not close at fifteen points or more. Both lines are a words judgment with a judgment band and no source.

**Cause.** Found in code: src/director/journal.ts line 227 to 230 reads journalRaceCloseMargin (0.05) and journalRaceWideMargin (0.15) from src/director/data/director.json (stand-ins SG-WORDS-param-journalRaceCloseMargin and SG-WORDS-param-journalRaceWideMargin, tag TUNABLE, spread band 0.005 to 0.1 for the close line). The numbers decide only which sentence a journal may say, never an outcome.

**Fix.** Fetch and quote published margin-of-victory analyses of U.S. elections (Ballotpedia's state legislative analyses bucket races at 10 points or fewer and at half a point or fewer; also a published median margin for local and state races). Set each value to a figure the pages support, retag it SOURCED or ESTIMATED with citation and spread in src/director/data/director.json, and resolve both stand-ins in src/director/data/stopgaps.json if the tag no longer needs one. Cite only pages actually fetched (skill researcher).

**Time box.** 2 hours for one Sonnet session.

**Rules.** Research calibrates; it never decides an outcome. Every number in a parameter table with its tag and spread.

**Done when.** A second session reads the two parameters in src/director/data/director.json and finds each carrying a quoted source and spread, then opens the journal of a drawn place's played race (place and seed named) and sees a close and a wide margin described by the new lines.

**Waits on.** Nothing.

**Files.** src/director/data/director.json, src/director/journal.ts, src/director/data/stopgaps.json
