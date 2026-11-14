---
id: office-acts-row-says-1-hours
title: 'Your office''s What you have done reads "1 hours" for a meeting you attended'
area: play
kind: bug
priority: 3
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
root: none
source: "Account lead T56, Nov 14, 2026, from the Words lead's read of #9126 and its Your office screens (screen absent-row.png)"
checked:
claimed-at:
---

**What.** A meeting row in What you have done reads \"APRIL 5, 2025 · MEET · 1 hours\". The count is not pluralized and the word \"MEET\" is the act label, not a sentence. Seen: Politics, then Your office, in the screens at /mnt/project-files/t56/heber2/ (Potter Lake, Wisconsin, seed fb9b371a2c260c1e5bd2ea80924b870a320f30742d81a7daca8fe7535f0c943d).

**Cause.** Found in code: src/core2/office-day-acts.ts line 850 keeps the act's `detail` as the string `${hours} hours`, and src/bench/play.mjs prints `a.detail` as it is kept.

**Fix.** Design: the screen words the row from the act's record through the English engine or controls.json (\"You spent an hour at the meeting\"), with the plural by count; the engine keeps the number, not the sentence.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** No hand-written player text in code; words come from controls.json or the English engine, with the Words lead's read.

**Done when.** A second session plays a council member in a drawn place, on main, attends a meeting that lasts one hour, and What you have done reads a sentence with \"an hour\", not \"1 hours\"; at two hours it reads \"2 hours\".

**Waits on.** Nothing.

**Files.** src/core2/office-day-acts.ts, src/bench/play.mjs, src/bench/data/controls.json

**Notes.**
