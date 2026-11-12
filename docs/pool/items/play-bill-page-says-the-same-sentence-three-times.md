---
id: play-bill-page-says-the-same-sentence-three-times
title: "A bill's page says its one sentence three times: as its text, as its section and under What it would do"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
source: lead's walk of the screens train, Nov 11, 2026 (Summit Park, Utah; picture in PR 8741's walk, docs/seen/strip-clear-of-the-journal-note is the same life)
checked:
claimed-at:
branch:
---

**What.** Open Politics, Bills, and a drafted bill with one section, for example a repeal of a yes-or-no law. The page prints the same sentence three times: in the bill's text ("Section 1. Be it enacted ... is repealed."), again in a box under "Sections", and again under "What it would do". The third is the worst: that column should say what the bill would do to people and money, and it only repeats the bill. Seen: the bill's page in Politics, Bills, at 1440x900.

**Cause.** Found in code: `billEstimate` in src/bench/play.mjs ends with `return { prose: section.text ?? paper.title, lines, compare }`, so the words of an estimate are the section's own text. For a wage or budget section `lines` and `compare` then add the figures. For a yes-or-no question there is no scale, so `compare` is empty and `lines` holds only the bill's `estimate.workers` and `estimate.payMinor` (src/bench/legislature.ts, from `costOf` in src/core2/modules/legislature.ts), which are 0 for such a law and print nothing. What is left is the sentence. The "Sections" box is drawn by src/bench/ui/bill-paper.mjs for every bill, with one button per section carrying the section's text, even when the bill has one section and its text is already the paper.

**Fix.**

1. **The estimate never repeats the section.** In `billEstimate`, `prose` is the bill's own cost note (`paper.estimate.note`) when it has one, and nothing otherwise. Never `section.text`.
2. **A section with no figure says so in worded text from the controls,** not in code: add `bill.noFigure` to src/bench/data/controls.json ("No dollar figure. This section changes a rule, not an amount.") and show it when `lines` and `compare` are both empty and there is no note.
3. **One section, no "Sections" box.** In src/bench/ui/bill-paper.mjs, draw the list of sections only when the bill has two or more. With one, the underlined sentence in the text is the section and is what the player clicks.
4. **Check.** Extend src/bench/bill-screens.browser.mjs: on a drafted bill with one yes-or-no section in a drawn place, the section's text appears once on the page, and the estimate column holds the no-figure line.

**Time box.** 2 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code: the new line lives in the controls file. Replace, never layer: the repeated box and the repeated sentence are removed, not hidden. A view never computes its own version of a fact: the estimate shows only what the server sent.

**Done when.** A second session, in the running game on main at 1440x900 in a drawn place it writes down with its seed, opens Politics, Bills and a bill with one section. The section's sentence is on the page once, there is no "Sections" box, and "What it would do" either gives a figure or says in one line that the section changes a rule. On a bill with two or more sections the "Sections" list is still there and each section's estimate shows beside it.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/ui/bill-paper.mjs, src/bench/data/controls.json, src/bench/bill-screens.browser.mjs

**Notes.** What a yes-or-no law would do to people (how many it covers, what it costs them) is a different item: play-bill-estimate-has-no-reach-for-a-yes-or-no-law, which needs its cause found first.
