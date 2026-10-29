---
id: play-news-paper-prints-the-stories
title: "News is a full front page: the stories' text is printed on the paper, not headlines you page through"
area: play
lead: play-first
kind: bug
priority: 1
size: M
status: done
claimed-by: play-first/play-news-paper-prints-the-stories
pr: #6771
after:
blocked-on:
milestone: play-first
source: owner, Oct 29 playtest of v0.64.0 (to the CTO)
claimed-at: 2026-10-29T16:46:02.358Z
---

**What.** The owner saw the newspaper in v0.64.0 and said "it's there," but "when you click continue and back, it's like headlines and then a little bit of story. Nothing is actually on the paper." The paper shows headlines only; a story's text appears only after stepping through it, and it is short. He has asked for the whole News sheet to look like a real newspaper with every story on it (Oct 27; Oct 28 sitting points 25 and 26; the 12 newspaper mockups in art/newspaper-mockups). This item is the screen side: the front page lays out the day's stories in columns with their full text from the printed record, the lead story longest, and a click on a story opens it in place on the paper. The words side (the body sentences each story kind gets) belongs to the Words session on `words-printed-stories-have-a-body`; this item prints whatever body the record carries today and grows with it.

**Time box.** 4 hours, Sonnet.

**You will see.** News opens as a front page with every story's text printed in columns, and a story opens in place on the paper.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Rules.** The simulation is the one layer: the paper reads the printed-story records and their composed words, and never writes its own sentence. No hand-written player text in code: any label comes from the screen-words bank. Screen to mock: the newspaper mockups and the UI kit's newspaper page, no dark panel with a picture pasted in. Player screen text: no record kinds, ids or ISO dates.

**Done when.** In the played world of a drawn place (place and seed named), News at 1440×900 shows a front page whose stories carry their full printed text from the story records (each story's record id listed in the PR body), with no Continue or Back; `src/bench/news.browser.mjs` checks that every printed story with a body shows that body on the page; the screenshot lands in `docs/play-first/shots`. The owner plays it: he opens News and reads the stories on the paper.

**Files.** src/bench/play.mjs, src/bench/ui, src/bench/printed-words.ts, src/bench/archive-words.ts, src/bench/news.browser.mjs, art/newspaper-mockups

**Notes.** Filed by the CTO, Oct 29. Related, not twins: `words-printed-stories-have-a-body` (words; branch words/printed-paragraphs has body sentences for law and election stories), `words-printed-stories-no-body-battle-mountain` (words). `Review: words` if the lane touches src/english or data/english. Read: OWNER-DECISIONS (Oct 29), LAW section 1; searched: newspaper, news body, printed stories.
