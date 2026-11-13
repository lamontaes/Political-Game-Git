---
id: laws-budget-cut-to-nothing-passes-unanimously
title: 'A town council passes a cut of its Highways line from $1.7 million to $2, 5 to 0: a member''s stance on a budget change stops growing at a 10% change'
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
after:
blocked-on:
lead: laws
model: sonnet
effort: medium
root: none
checked: fable
source: Playtester P2, Nov 13 (Hammonton, New Jersey, seed 77712d75-ffaa-43ee-a9d0-67296d29dcc9)
---

**What.** On main 596d5127, an Advanced start in Hammonton, New Jersey (seed 77712d75-ffaa-43ee-a9d0-67296d29dcc9) as Council member Fatima Curtis.

- **The draft.** Your office → Draft a bill → Highways shows "In force today / $1.7 million / The new amount / $". The player typed 2.04, and the bill page then read "Highways: about $2 for the year / In force today $1.7 million / The bill makes it $2 / Down $1.7 million (100%)".
- **The vote.** At the meeting of February 4, 2025 the council voted "Enacted / 5 yes", and the town's road money was gone.
- **Not the first.** Earlier tonight another council passed a cut of a line to $18, 5 to 0 (reported to the governing lead).

No member weighed what a whole line's loss does. Seen: the meeting panel and Bills, for any budget bill that cuts or raises a line by more than a tenth.

**Cause.** Found in code: `provisionStance` (`src/core2/modules/legislature.ts`, line 1446) turns a budget-line change into a stance on `budget-line:<line>` with position `value / (of * budgetFullStanceShare)`, clamped to [-1, 1]. With `budgetFullStanceShare` at 0.1 (`src/core2/data/campaigns/parameters.json`), every change of 10% or more is the same full stance. A member who leans toward less road spending backs a 100% cut exactly as hard as a 10% one, and nothing in the weighing grows with the size of the cut.

**Fix.** The position keeps growing past the full-stance share on a sliding scale, without the clamp. Each member's reading compares the amount the bill sets against the amount they would want (their lean on the line applied to today's amount), so a change past what they want counts against the bill. Nothing else changes. The test drafts a cut to nothing and a 10% cut in a drawn place and finds the first draws fewer yes votes than the second.

**Time box.** 2 hours

**Rules.** Sliding scales and causes: nothing flips at a threshold, and a clamp that makes a 100% cut weigh the same as a 10% cut is one. No dice: each member's traits, view and constituents decide, never a share. One rule, all 56 places: the test draws its place and names it with its seed.

**Done when.** A test in src/core2 drafts, in a drawn place it names with its seed, a cut of a town line to nothing and a cut of a tenth, and the cut to nothing draws fewer yes votes. A second session then sees, on the bench on main, a drafted cut of a line to almost nothing fail or draw votes against at the meeting (screenshot with the place and seed).

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/core2/data/campaigns/parameters.json, src/core2/legislature.test.ts

**Notes.** The draft box takes whole dollars while today's amount reads "$1.7 million", so a player who types 2.04 meaning millions writes a $2 line. Whether the box should read millions is for Fable A and the screens lead (`Review: words`).
