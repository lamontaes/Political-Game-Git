---
id: words-paper-side-stories-open-with-a-body
title: "The paper's side stories open with a body, starting with the spelling bee"
area: words
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: words
model: sonnet
effort: medium
root: none
source: added on branch claude/project-thread-aqtryq (brief M, Nov 14)
checked: m3 2026-11-14
---

**What.** Side stories on the paper (a spelling bee, later openings, retirements, the police log, graduation with tests) print one line and cannot be opened. The owner (Nov 14 05:06Z) wants a couple of paragraphs for the biggest and a paragraph or two for smaller ones, not all politics. This item gives a story kind context sentences and makes a brief with a body open from its headline, with a Back to the front page control. The bee is first. Seen: News, the Briefs strip: click the bee headline and it opens in the lead place with the school, the grade and family when on record, and the next regional bee.

**Cause.** Found in code: src/english/english-newscast.ts `composeNewsStory` (a kind marked brief says only its lede; honor had no context roles) and src/bench/ui/news-board.mjs (a brief is one plain paragraph with no click).

**Fix.** Give honor context roles and compose them for a brief that has them; read school, grade, parents and the regional bee month from the honor row, the student's records and the honors calendar; render a brief with a body as a headline button that takes the lead slot, with a Back control.

**Time box.** 3 hours.

**Rules.** No dice. A story says only what a reporter could know from a record the world holds; every line is the Words lead's.

**Done when.** In a drawn place with a bee printed, a second session opens News, clicks the bee headline in the Briefs strip, reads the school and the regional bee month, and clicks Back to the front page.

**Waits on.** Nothing.

**Files.** src/english/english-newscast.ts,src/bench/ui/news-board.mjs,src/bench/printed-words.ts,src/core2/school-honors.ts,data/english/parts/news.json
