---
id: words-income-tax-story-printed-in-a-state-with-no-wage-tax
title: "The News prints 'Income tax rate took effect on January 1, 2025' in a state that taxes no wages (Blodgett Landing, New Hampshire, day one)"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-words-income-tax-story-printed-in-a-state-with-no-wage-tax
pr: #8678
after:
blocked-on:
lead: words
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 5, "The news", and root cause 9)
standard: 2
model: sonnet
effort: medium
root: rc9-place-facts-one-default
checked: fable 2026-11-10
claimed-at: 2026-11-11T06:01:16.022Z
---

**What.** On day one of a played life in Blodgett Landing, New Hampshire (a random world; the audit gives no seed), one of the News briefs read "Income tax rate took effect on January 1, 2025." New Hampshire taxes no wages, so the paper told a reader about a tax their state does not have. That was measured on the screen. Read in the code on main: the day-one paper is built from a story for every law in the starting data, whatever the row says, and a brief with nothing else to tell prints the law's catalog name and its date. The state's own starting row for the income tax has a rate of 0 and is marked as no tax system, and the federal income tax has a row dated the same day; the audit did not say which of the two the brief was told from. Fix it at the cause for every law and all 56 places: a starting row that records that a place has no such tax or program is never told as a law taking effect, and a brief told from another level's row says whose law it is (the federal income tax, the state's sales tax), from the row's own level and place.

**Cause.** Measured: Blodgett Landing, New Hampshire, day-one News in a new game from `npm run bench` (play at /play) with the Place field empty (Fable audit, Nov 9; no seed was kept): the brief "Income tax rate took effect on January 1, 2025." is built by buildNewsArchive (src/core2/past-news.ts, the law stories at lines 106 to 115, one for every law history row in the starting data) and worded by wordArchiveStory (src/bench/archive-words.ts, line 44; the fallback at lines 90 to 97), from a src/core2/data/laws/starting-law.json row whose terms.system is "none" and whose value is 0.

**Fix.** Do not tell a starting law row whose terms record that a place has no such tax or program as a law taking effect, for every law and all 56 places; when a brief is told from another level's row (the federal income tax, a state sales tax), say whose law it is from the row's own level and place.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the level and the place come from the law's row and the words from the English engine's banks, never from a name typed into a screen. One rule, all 56 places: whether a place has a tax is read from its own starting row, and no state is named in the logic. An effect is a read, not a record: a row that says a place has no such tax changed nothing for anyone, so it is not news. Owner, November 8, quoted by the audit: "This news is terrible. There's no information here."

**Done when.** A second session, not the builder, runs this in the running game. Start the bench (`npm run bench`, play at `/play`) with the Place field empty, drawing again until the drawn place is in a state whose starting row for the income tax is zero, and write down the place and seed. Open the News on day one and read every law item: none tells of a tax, a benefit or a program the place's own row says it does not have, and every item told from a federal row says it is federal. Take a screenshot of the News with the place and seed under it. Then the named repro: a new game in Blodgett Landing, New Hampshire shows no brief that reads "Income tax rate took effect on January 1, 2025." A second drawn place in a state that does tax wages still gets its income tax items. A test builds the day-one paper in a drawn place and fails when a printed law item's row has a zero value with no system behind it. The owner plays it: he starts in a state with no wage tax and the first paper never tells him an income tax took effect.

**Waits on.** Nothing.

**Files.** src/bench/archive-words.ts, src/core2/past-news.ts, src/bench/printed-words.ts, src/core2/data/laws/starting-law.json, data/english/parts/news.json

**Notes.** From the Fable audit, Pillar 5 and root cause 9, measured in the audit's browser session in Blodgett Landing, New Hampshire (every menu, then ten weeks of Day and Week). No seed is given for that world. The audit did not trace the brief to its row. Read on main, Nov 10 (helper): in `starting-law.json` the New Hampshire `income-tax` rows have `value: 0` and `terms.system: "none"`, effective 2025-01-01 and 2026-01-01; the federal `income-tax` rows are 37 percent, effective the same two days. Related: `words-paper-law-and-budget-briefs-read-right` (in a pull request since Nov 2, open and unmerged on Nov 10, last changed Nov 4: law items name the level, the change and who it reaches; the audit's evidence is added to its Notes), `words-news-brief-prints-a-code-name` (the brief beside this one), `play-issues-real-statutes-and-dates` (open: Issues shows real dates on starting laws).
