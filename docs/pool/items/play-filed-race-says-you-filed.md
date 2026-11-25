---
id: play-filed-race-says-you-filed
title: 'After the player files, the race''s line on Elections still says "File for it", and its page offers no filing'
area: play
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/blockers-filed-race-row
pr: #9856
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
source: Blockers' golden-path walk, Nov 17, 2026, for the CTO's 03:25Z priority (the owner's 11 a.m. build, "up to and through his first election")
checked:
---

**What.** After the player files at the counter, the clerk says "All set. I've got you on the list", but the race's line on the Elections page still says "File for it". Clicking it opens the race with no filing button, so the player can't tell whether the filing went through.
Seen: Launiupoko, Hawaii (seed 2e8912c3-1c36-4574-b370-a0ea47f815e2), council member (District 1), April 8, 2026; and Papillion, Nebraska (seed 7fcc2c2b-3f38-4e0a-9cf7-52ee1ba13bcc), council member, June 14, 2026.

**Cause.** Found in code: src/bench/play.mjs, the Elections screen's `entryOf` chooses a race's aside by testing "the player may file and the window is open" before "the player filed", so a filed race whose window is still open keeps "File for it". The race page tests `!filed.has(...)` and offers nothing.

**Fix.** The line tests the player's filing first and says the race's status ("You are running"), as the page does.

**Time box.** 1 hour for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code: the line is the existing `localRaces.youFiled` label.

**Done when.** A second session starts a new life in a drawn place it writes down with its seed, lives to a day a race of its own is open, files at the counter, and opens Elections: the race's line says "You are running", not "File for it".

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/filed-race-row.browser.mjs (new)

**Notes.** Filed and built by the Blockers lane, Nov 17.
