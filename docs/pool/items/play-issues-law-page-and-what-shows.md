---
id: play-issues-law-page-and-what-shows
title: "Issues looks like a game menu, a law opens a page that explains it, and the player chooses what the list shows"
area: play
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on: play-issues-law-page-and-what-shows-part-1-list-filters, play-issues-law-page-and-what-shows-part-2-law-page-summary, play-issues-law-page-and-what-shows-part-3-reach-and-views, play-issues-law-page-and-what-shows-part-4-position-and-citation
source: owner playtest of v0.73.0, Nov 1, 22:40 UTC (second batch)
lead: play-first
milestone: play-first
after:
model: opus
effort: medium
root: rc7-player-cannot-drive
---

**What.** Owner, Nov 1 playtest of v0.73.0, on Politics, Issues: "I kind of see the vision here, though. I don't like how it's just laid out and a bunch of cards. Again, this doesn't look like a real game menu... But I click on it and then it gives me no information about it. Give me options for what shows." Opening Child access prevention showed only "In force: Territory law, No, since July 1, 2024". A law's page should say in plain words what it does, which level has it, who it reaches here, when and how it passed, and how people and parties feel about it, from the records, and the list should have controls for level, in force or not, and subject. The statute row on that page is part of this work: a citation opens the game's own display of that law, never a bare capital-letter row with nothing to click (the Nov 9 audit still saw "STATUTE 19 U.S.C. 1862" on a law's page). The item is split into four parts, built in order.

**Cause.** Design: owner, Nov 1 playtest answer ("I imagine clicking on it and the quote-unquote bill interface as it is in whatever place you're selecting...") recorded in this item's Notes, the approved law page in docs/mocks/2026-11-08-play/README.md (pl-issues_p), and the Nov 9 audit's root cause 7; `lawPage` in src/bench/play.mjs (line 5059) shows only what is in force, the statute row (`row(labels.statute, l.row.terms.cite)`, lines 5068 to 5070), the measure, what is coming, what changed and the votes, with no reach, summary, filters or position control.

**Fix.** Done through four parts in order: filters on the Issues list (part 1), a law page that tells what it does, its level, date and how it passed (part 2), who it reaches here and the views on it (part 3), and the player's position control with the citation opening the game's own display of that law (part 4). Redraw Issues from the shared parts as Government was redrawn. This parent closes when the four parts are merged.

**Time box.** 2 hours for one Opus session, only to confirm the parts landed and close this item; the build time is in the parts, each at most 4 hours.

**Rules.** Screen to mock: Issues is redrawn the way Government was (Oct 29 menus ruling), from the shared parts. No hand-written player text: the law's explanation comes from the English engine and the law's record. An effect is a read, not a record: who it reaches reads the law engine's own reach records. Replace, never layer: the old law page rows are replaced by the new page, not kept beside it.

**Done when.** A second session, in a drawn place (named with its seed), opens Politics, Issues and finds a menu-style list with filters for level, in force and subject; opens a law and finds its plain-words summary, level, date, how it passed, who it reaches here and views on it, each from a record id, and a citation that opens the game's display of that law; chooses a position; screenshots at 1440x900 before and after. play-what-this-law-did-page and play-repeal-action-on-every-law-page build on this page.

**Waits on.** The four parts, in order: play-issues-law-page-and-what-shows-part-1-list-filters, part-2-law-page-summary, part-3-reach-and-views, part-4-position-and-citation. play-what-this-law-did-page and play-repeal-action-on-every-law-page wait on this item.

**Files.** src/bench/play.mjs, src/bench/government.ts, src/bench/play.css, src/bench/data/controls.json

**You will see.** Clicking a law in Issues tells you what it does and who it affects, and you can choose which laws the list shows.

**Screenshot.** Issues and one law's page, before and after.

**Notes.** Filed by the CTO from the owner's v0.73.0 playtest, second batch (Nov 1, 22:40 UTC, five screenshots, a game in the U.S. Virgin Islands). Read: OWNER-DECISIONS (Oct 29 menus redesigned the way Government was; Oct 29 Political Process baseline; one history), the pool for twins.

Owner's answer, Nov 1 23:30: "I imagine clicking on it and the quote-unquote bill interface as it is in whatever place you're selecting. And seeing... what that does to say the budget or analysis on how homelessness affects graduation rates or anything like that. And if you've maybe run a poll, you could see what people are thinking. You could see recent legislation. You could see choose your position. Get me a mock." The law page is the bill interface for the chosen place: its effect on that place's budget, the effects-web analysis of what it changes (from the laws lead's matrices), poll results when the player has run a poll, recent legislation on the subject, and a control to choose the player's position. MOCK FIRST: the lane sends the mock image to the CTO, who sends it to the owner; build after his answer.

Nov 10, Fable audit: the audit (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 2) took three seats in Davenport, North Dakota through Advanced, Play as (a council member, the mayor and a state legislator; no seed given) and found that after a law passes no screen shows the people it reached, and that the word "repeal" appears on none of the Your office screens. On Nov 10's main (commit 8ac2262853) the law page (`lawPage`, src/bench/play.mjs:5059) still shows what is in force, the statute, the measure, what is coming, what changed and the votes, with no reach and no action. Dev mode's reach, the only count of who a law reached, named a full person for 9 of the 147 state laws the audit's sweep enacted and a counted person for 2. Two items from the audit sit on this same page and should be built on it, not beside it: play-repeal-action-on-every-law-page (a Repeal action for an officeholder whose body has the power) and play-what-this-law-did-page (who the law reached, per person and in dollars, after play-dev-reach-reads-every-effect-record).
