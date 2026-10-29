---
id: play-calendar-check-chained-stops
title: "The calendar check's last step times out when a jump ends on chained stops"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/bench/calendar.browser.mjs lives until a marked day, then presses Week. When the jump stops on a scene and another stop follows, Continue stays visible but a click on it times out, or Week never becomes enabled, so the check fails 2 of 3 runs on main at e34de8c1ee (Papago, Northern Mariana Islands; La Madera, New Mexico). The cause is not yet named: something covers Continue or a stop needs a different answer.

**Rules.** A flaky browser check gets its cause fixed, not its check loosened (play-first skill): find what covers Continue after a calendar jump and fix it in the play screen, or answer that stop the way a player would.

**Done when.** The calendar browser check passes 3 of 3 runs on a restarted bench in three drawn places named with their seeds, and the PR names the element or stop that blocked Continue, with a screenshot of the failing state from main.

**Files.** src/bench/calendar.browser.mjs, src/bench/play.mjs

**Notes.** Found by the screens designer, Oct 27 (PR 6382 makes the check wait for the jump to settle, which fixed one race). lead: play-first.
