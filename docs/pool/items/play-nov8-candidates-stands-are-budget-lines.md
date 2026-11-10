---
id: play-nov8-candidates-stands-are-budget-lines
title: "A local candidate's stands read 'Police protection: Against': budget lines shown as issues, with For or Against and no context (owner's Nov 8 playtest, Manchester, Connecticut)"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6: the 72 points of the Nov 8 playtest, points P22 and C15, not fixed)
---

**What.** The owner, Nov 8, about 2:20 p.m. Eastern (v0.94.0, Manchester, Connecticut; docs/coordination/playtest/2026-11-08-1-verbatim.md): "I don't know why it's telling me like police protection, police welfare, and natural resources. That seems irrelevant. I mean, maybe it isn't, but I'm not getting any context. And I don't want context just being the subheadings or whatever. I told you I hate those." The CTO's note on the same screenshot (point C15): "Stands read 'Against' police protection, which reads as against the police. These are Census budget lines, not issues." What main does now, read in code on Nov 10, not measured: a town, township or county seat's positions are its government's budget lines (`budgetPositions` in `src/core2/contest-positions.ts`, line 31, keys `budget-line:<line>`), and a race's page in `campaigns()` in `src/bench/play.mjs` draws each candidate's filed stances as a row of the line's name and the word For or Against (lines 4250 to 4256). So a candidate who would spend less on the police line reads "Police protection: Against". Fix the class, for every local race in every place: a stance on a spending line is said as what the candidate would do with the money (spend more, spend less) in a sentence from the banks, and a race shows the few stands it turns on, never a column of line names with one word each.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: how a stance on a budget line is said comes from the English engine's banks, with the line's worded name, never a raw key or a bare For or Against typed by the screen. This is a game, not a spreadsheet: the page tells the player what a candidate wants, in words, not a table of categories. Owner, Oct 28 (quoted in the playtest check, point P22): the counter's stance rows "is a dev menu: remove it". Owner, Nov 7, about 2:45 p.m. (docs/mocks/2026-11-07-approved/RULINGS-nov5.md, item 36): "NONE OF THESE SUBTITLES ON MENUS".

**Done when.** A different session starts the bench (`npm run bench`), starts a new game in a drawn place with a local race that has at least one candidate filed (place, seed and the contest record id named in the proof), opens Politics, then Elections, opens that race and takes a screenshot at 1440×900. No candidate may show a row that is a spending category followed by For or Against. Each stand shown must read as a plain sentence or phrase about more or less money for something, or a yes or no on a question the body decides, and must match the candidate's filing record (the proof lists each filed stance beside the words shown). No small caption line may sit under a candidate's name to explain the stands. The same check is run on a state race, where the stands are policy questions, to show they still read right. It is then repeated in Manchester, Connecticut, the owner's place on Nov 8 (no seed was kept), as the named repro, and set beside `docs/mocks/2026-11-08-play/renders/pl-elections_p.race_mayg.jpg`. The owner plays it: he opens a council race and can tell what each candidate would do, in words.

**Files.** src/bench/play.mjs, src/bench/government.ts, src/core2/contest-positions.ts, src/core2/campaign-stances.ts, src/bench/data/controls.json

**Notes.** From the Nov 8 playtest, points P22 and C15 (docs/coordination/playtest/2026-11-08-1.md) and their rows in `2026-11-08-1-check.md` (Check C): "Spending categories are shown as issues"; the check names campaigns-local-platform-budget-lines (done) as the change that brought the budget lines in, and laws-filing-positions-are-the-seats-own-issues (done) made a seat's positions the questions its own body decides. Marked done, still shows as the owner saw it: both. Whether a local race should run on budget lines at all is not this item's call; the engine's reasoning is in the header of `contest-positions.ts` ("local races run on it"), and this item only changes how a stance is shown. Related open: play-issue-stances-on-screen (where the town's voters stand on the issues a race turns on), screens-campaign-board. The budget line names themselves were reworded since Nov 8 (`src/core2/data/budgets/line-names.json`: "Corrections", "Aid to other governments"). Not verified: nothing here was measured in the running game on Nov 10, and the audit did not re-check this point in the game.
