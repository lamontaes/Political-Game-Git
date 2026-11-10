---
id: play-calendar-steps-months-with-arrows
title: "The calendar still steps from month to month with two arrow buttons, after the owner ruled no arrows anywhere (audit's New Hampshire life)"
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
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6, "Against your newest rulings (measured)")
---

**What.** Measured by the audit on Nov 9: "The calendar still steps months with arrows." The audit's line gives no place or seed; its browser life was in Blodgett Landing, New Hampshire, a random world. Read in code on main, Nov 10: `drawMonth` in `src/bench/ui/calendar.mjs` (line 187) builds the month heading with a previous button marked with a left arrow (line 201) and a next button marked with a right arrow (line 207), beside a Today button; the Coming up list beside it is already the one long-list box with no arrows (line 167). The owner's ruling of Nov 8 is "No arrows and no '1 of N' pages anywhere", but it is not yet settled whether that covers a control that steps one value. Fix the cause once the reach of the ruling is known: the player reaches any month without a paging arrow, or the arrows stay because the owner said single-value steppers may keep them, and either way the item ends with the ruling quoted.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Look before you ask: the question this turns on is already written at the top of docs/coordination/OWNER-DECISIONS.md under Open, so the builder reads the answer there, or the CTO's call, before changing anything, and never asks the owner again. Replace, never layer: if the arrows go, the `month-step` buttons, their labels in `src/bench/data/controls.json` and their styles go in the same change. Owner, Nov 8, 2:10 p.m. (OWNER-DECISIONS, the playtest of v0.94.0): "I fucking hate when you put these arrows. Like it's like those shitty survey sites where you have to press next for each question." Owner, Nov 5, on the calendar (docs/mocks/2026-11-07-approved/RULINGS-nov5.md, item 12): "there's no way to go to future months. I'm just stuck in January."

**Done when.** A different session starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named in the proof), opens Calendar and takes a screenshot at 1440×900 of the month heading. If the owner or the CTO has ruled that the Nov 8 words cover the month heading, the heading must show no arrow button, and the session must still reach a month at least a year ahead and come back to today (the proof says how, with a second screenshot of the far month and of an election day on it). If the ruling is that single-value steppers keep their arrows, the screenshot shows them unchanged and the proof quotes the ruling with its date. In both cases no "1 of N" count may show and the Coming up list must scroll inside its own box. The same check is repeated in Blodgett Landing, New Hampshire, the audit's place (the audit gives no seed), as the named repro. The owner plays it: he can look ahead to his election's month and back, on a calendar that follows his arrows ruling.

**Files.** src/bench/ui/calendar.mjs, src/bench/data/controls.json, src/bench/play.css, src/bench/play.mjs

**Notes.** From the audit's Pillar 6, re-checked in the game. How the open question bears on this: the Open block at the top of OWNER-DECISIONS (Nov 9, Coordinator, for the owner) asks whether "No arrows and no '1 of N' pages anywhere" also covers "a stepper that changes one value, such as dev Run's `< 30 days >`, the creator's color rows (C2) and world settings, or only paging through lists", and says: "Until he answers, lists and pages never get arrows, and single-value steppers stay as the approved mocks draw them." The month heading sits between the two: it changes one value (the month), and it also turns a page of days. It is not named in the question. Both mocks draw it with arrows: the Nov 7 calendar examples (`docs/mocks/2026-11-07-approved/ex.js`, the `arrows("cm", ...)` call, about line 2275) and the conditionally approved Nov 8 calendar (`docs/mocks/2026-11-08-play/play.js.txt`, line 216; render `pl-calendar.jpg`). So under the Coordinator's interim call the arrows may stand as the mock draws them, while the audit reads them as against the ruling. The CTO should add the month heading to the open question by name so one answer settles it; if the owner's answer is "only paging through lists", close this item as dropped with the quote. As of Nov 10 the question was still open. Not verified by the audit: what the owner means for this control; the audit lists it as against his ruling without citing the open question.

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: drop, replaced. docs/coordination/OWNER-DECISIONS.md, Nov 9: "Arrows on single-value steppers: answered 'Lists only.' Lists and pages never get arrows or '1 of N'; a stepper that changes one value (dev Run's days, the creator's color rows, world settings) keeps its arrows." The month heading changes one value and both approved calendar mocks draw it with arrows; the item itself says to close as dropped with the quote if the answer is 'only lists'. Residual doubt: the heading also turns a page of days, so the CTO may want to confirm the month heading is a single-value stepper.
