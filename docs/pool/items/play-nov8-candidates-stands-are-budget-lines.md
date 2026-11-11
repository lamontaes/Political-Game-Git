---
id: play-nov8-candidates-stands-are-budget-lines
title: "A local candidate's stands read 'Police protection: Against': budget lines shown as issues, with For or Against and no context (owner's Nov 8 playtest, Manchester, Connecticut)"
area: play
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-play-nov8-candidates-stands-are-budget-lines
pr: #8564
after:
blocked-on:
standard: 2
model: sonnet
effort: medium
root: none
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6: the 72 points of the Nov 8 playtest, points P22 and C15, not fixed)
checked: fable 2026-11-10
claimed-at: 2026-11-11T04:19:56.054Z
---

**What.** The owner, Nov 8, about 2:20 p.m. (v0.94.0, Manchester, Connecticut): "I don't know why it's telling me like police protection, police welfare, and natural resources... I'm not getting any context." The CTO's note (point C15): stands read "Against" police protection, which reads as against the police; these are Census budget lines, not issues. A local race's page draws each candidate's filed stances as a row of the budget line's name and the word For or Against. Say a stance on a spending line as what the candidate would do with the money (spend more, spend less) in a sentence from the banks, and show only the few stands the race turns on, never a column of line names with one word each.

**Cause.** Found in code: `budgetPositions` in src/core2/contest-positions.ts (line 31) makes a town, township or county seat's positions its government's budget lines (keys `budget-line:<line>`), and `campaigns` in src/bench/play.mjs (about lines 4250 to 4256) draws each filed stance as the line's name plus For or Against. Read on Nov 10, not measured in the running game.

**Fix.** Word a stance on a spending line as more or less money for that line through a bank sentence that takes the line's worded name in a slot, and cap the stands shown on a race to the few it turns on. The bank sentences are Story's to write (one writer per bank file); the code fills the slot and shows no bare For or Against. Whether a local race should run on budget lines at all is not this item's call.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: how a stance on a budget line is said comes from the English engine's banks with the line's worded name, never a raw key or a bare For or Against typed by the screen. This is a game, not a spreadsheet: the page tells the player what a candidate wants in words, not a table of categories. Owner, Nov 7 (docs/mocks/2026-11-07-approved/RULINGS-nov5.md, item 36): "NONE OF THESE SUBTITLES ON MENUS".

**Done when.** A second session (not the builder) starts the bench (`npm run bench`), starts a new game in a drawn place with a local race that has a candidate filed (place, seed and the contest record id named), opens Politics, then Elections, opens that race and takes a screenshot at 1440x900. No candidate shows a row that is a spending category followed by For or Against; each stand shown reads as a plain sentence about more or less money for something, or a yes or no on a question the body decides, and matches the candidate's filing record (the proof lists each filed stance beside the words shown). No small caption sits under a candidate's name. The same check on a state race shows its policy-question stands still read right. It is repeated in Manchester, Connecticut, the owner's place on Nov 8 (no seed was kept), as the named repro.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/government.ts, src/core2/contest-positions.ts, src/core2/campaign-stances.ts, src/bench/data/controls.json, data/english/parts/choice-names.json

**Notes.** From the Nov 8 playtest, points P22 and C15 (docs/coordination/playtest/2026-11-08-1.md) and their rows in `2026-11-08-1-check.md` (Check C): "Spending categories are shown as issues"; the check names campaigns-local-platform-budget-lines (done) as the change that brought the budget lines in, and laws-filing-positions-are-the-seats-own-issues (done) made a seat's positions the questions its own body decides. Marked done, still shows as the owner saw it: both. Whether a local race should run on budget lines at all is not this item's call; the engine's reasoning is in the header of `contest-positions.ts` ("local races run on it"), and this item only changes how a stance is shown. Related open: play-issue-stances-on-screen (where the town's voters stand on the issues a race turns on), screens-campaign-board. The budget line names themselves were reworded since Nov 8 (`src/core2/data/budgets/line-names.json`: "Corrections", "Aid to other governments"). Not verified: nothing here was measured in the running game on Nov 10, and the audit did not re-check this point in the game.
