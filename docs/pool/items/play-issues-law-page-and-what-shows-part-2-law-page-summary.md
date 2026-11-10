---
id: play-issues-law-page-and-what-shows-part-2-law-page-summary
title: "A law's page says what it does, its level, its date and how it passed"
area: play
kind: feature
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: rc7-player-cannot-drive
milestone: play-first
source: split from play-issues-law-page-and-what-shows in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Owner, Nov 1: opening Child access prevention gave "In force: Territory law, No, since July 1, 2024" and no information about it. A law's page should say in plain words what it does, which level has it, when it took effect and how it passed (the measure and the vote), each from a record id. The page is the bill interface for the chosen place, as the owner answered: "I imagine clicking on it and the quote-unquote bill interface as it is in whatever place you're selecting.

**Cause.** Found in code: `lawPage` in src/bench/play.mjs (line 5059) shows the in-force rows, the statute row, the measure, what is coming, what changed and the votes but no plain-words summary of what the law does; the law rows come from `governmentView` in src/bench/government.ts.

**Fix.** Add to `lawPage` a plain-words summary of what the law does (from the English engine's policy words for the law's series), its level, its effective date and how it passed (the enacting measure and its vote, by record id), reading the law row and the enacting bill; no summary typed in the screen. Also, first: part 1 (pull request 8181) built the Subject filter on Issues as a select (the filters in `issues()` in src/bench/play.mjs, near line 5128). The owner's menu look (Nov 5; docs/mocks/2026-11-07-approved/MENU-LOOK.md and RULINGS-nov5.md) has filters as lit toggle buttons, with no checkboxes and no selects: make Subject toggle buttons like Level and In force, with the shared controls (screen-to-mock skill).

**Time box.** 4 hours for one Sonnet session; if not done, push what exists, open the draft PR, write the handoff.

**Rules.** No hand-written player text: the explanation comes from the English engine and the law's record. An effect is a read, not a record: the page reads the law and bill records. Screen to mock: the approved law page in docs/mocks/2026-11-08-play (pl-issues_p). Ask why: each line cites its record id in Trace.

**Done when.** A second session, in a drawn place (named with its seed), opens Politics, Issues, opens a law and finds a plain-words summary, its level, its date and how it passed, each from a record id named in the proof, with a screenshot at 1440x900 beside the approved law-page mock.

**Waits on.** Nothing. Part 1 may land first but is not needed.

**Files.** src/bench/play.mjs, src/bench/government.ts, src/bench/data/controls.json, src/bench/play.css

**You will see.** A law's page tells you what it does, who has it and how it passed.

**Screenshot.** One law's page in a drawn place.

**Notes (CTO, Nov 10, 18:59Z, carried here by Fable).** "Subject is a select. The owner's menu look says filters are lit toggle buttons, with no checkboxes. Make Subject toggle buttons like Level and In force in the next part, and set the screenshot beside the approved mock before calling it seen." The second session's screenshot of Issues is set beside the approved mock (docs/mocks/2026-11-08-play/) in the pull request before this part is called seen.
