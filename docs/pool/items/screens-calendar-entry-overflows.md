---
id: screens-calendar-entry-overflows
title: "A long calendar entry runs past its row in some places"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: haiku
effort: low
root: none
checked: fable 2026-11-10
---

**What.** no-scroll.browser.mjs on a drawn life in Bountiful, Utah (Oct 28) failed with "start · calendar: span.what over by 16px": one day-list entry's text runs 16px past its row on the first day. The same check passed in Stovall, North Carolina. The entry is a span.what inside a calendar entry, styled by the .calendar-entry .what rules in src/bench/play.css, and which entry runs long and why its row does not wrap it is not yet known, so the first step is to reproduce it on the Bountiful, Utah draw.

**Cause.** Measured: `node src/bench/no-scroll.browser.mjs` against `npm run bench` on main 8c980a59, three fresh worlds drawn by the check itself. Seed 268103bc-d791-4ce5-b86f-910a733c047a (Dresden, Tennessee), seed ee57ec07-167c-480c-a66a-315e24fc62b1 (Albion, Iowa) and seed e36935ac-54c1-4aa5-ab63-b37011a39d6c (Mound, Minnesota) each print `start · calendar: #sheet 3px, page 0px`, inside the check's 8-pixel slack. The overflow does not reproduce. The check today measures only `#sheet` and the page (lines 66 to 78); the message 'span.what over by 16px' came from an older version that measured entries. Each run then stops before its 'after a day' pass. A fresh life opens with its opening narration in the talk box ('Late on January 20th finds you at home.', with Continue). The check opens and closes every sheet without answering it, and by line 95 `#day` is disabled, so `page.locator("#day").click()` times out after 30 seconds. The check has been red on every fresh world, and no calendar entry after a day has been measured.

**Fix.** In src/bench/no-scroll.browser.mjs, before pressing Day (line 95), answer the talk the way the bill checks do (src/bench/bill-budget.browser.mjs line 102): while `#talk-next` is visible, click it, then wait for `#day` to be enabled. Run the check on five fresh worlds. If the calendar holds within the slack after a day in all five, close this item with the five seeds. If an entry runs over, name the entry's record and add `overflow-wrap: anywhere` to the `.calendar-entry .what` rule in src/bench/play.css.

**Time box.** 1 hour for one Haiku session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No scrolling or clipped text on any screen. No hand-written player text: the entry's words come from the calendar bank, so the fix wraps the existing words inside the row and never shortens the wording in code. One rule, all 56 places: the check passes on every drawn place, not only the one that failed.

**Done when.** A second session runs no-scroll.browser.mjs on five drawn places, including Bountiful, Utah and one whose calendar has a long entry, with each place and seed named in the PR, and sees every run pass. A screenshot shows the long entry wrapping inside its row, and the cause is named by the entry's record and the rule in src/bench/play.css.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/no-scroll.browser.mjs

**Notes.** TODO

Cause found (Nov 11, 2026, cause finder for Fable B): on three fresh worlds the calendar fits at the start. The check itself is red: it never answers the opening talk, so Day stays disabled.
