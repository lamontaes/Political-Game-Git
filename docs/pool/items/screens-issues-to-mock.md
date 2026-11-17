---
id: screens-issues-to-mock
title: "Issues follows its approved mock: the subjects in their own column with their counts"
area: play
kind: bug
priority: 2
size: S
status: claimed
standard: 2
claimed-by: screens lane (Nov 17)
pr:
blocked-on:
source: crew line item 4, the remaining approved mocks
after:
lead: play-first
model: opus
effort: medium
root: none
---

**What.** Politics > Issues differed from its approved mock (`pl-issues`). The mock lists the subjects in a column of their own, each with how many laws it holds, beside the chosen subject's laws and the chosen law. The game hid the subjects in a Subject dropdown under two rows of bars.
Seen: Politics > Issues on main, beside `docs/mocks/2026-11-08-play/renders/pl-issues.jpg`.

**Cause.** Found in code: `src/bench/ui/issue-filter.mjs` line 79, `issueFilterScreen`, drew the subject filter as a `select` under the Level and In force bars.

**Fix.** Replace the dropdown with a subject column built from the shared pick rows, each row with the number of laws the Level and In force bars leave in it, and set the two bars side by side. The filters still read the law rows only; the counts come from the same `filterLaws`.

**Time box.** 2 hours for one session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the dropdown goes in the same change. Screen to mock: shared parts only. The owner's Nov 1 "Give me options for what shows" stays answered by the Level and In force bars.

**Done when.** A second session opens Politics > Issues in a drawn place and sees every subject in a column with its count, with nothing in the panel scrolling; clicking a subject lists its laws, and clicking a law opens it.

**Waits on.** Nothing.

**Files.** src/bench/ui/issue-filter.mjs, src/bench/play.mjs, src/bench/play.css, src/bench/issues-law.browser.mjs, src/bench/issues-levels.browser.mjs, src/bench/issues-level-words.browser.mjs

**Notes.** Crew line #9747, item 4. The mock's "What people here think", "Where I stand" and "What it moves" sections need records the law page does not read yet.
