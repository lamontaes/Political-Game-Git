---
id: screens-ui-button
title: "One shared button part in src/bench/ui"
area: play
kind: cleanup
priority: 1
size: S
status: in-pr
claimed-by: claude/screens-ui-button
pr: #6179
blocked-on:
source: added with npm run pool -- add
lead: screens
milestone: play-first
claimed-at: 2026-10-26T20:16:55.830Z
---

**What.** The owner ruled on Oct 26 that the play screen's controls come from one shared set. This is the second part: the button. Today play.mjs builds buttons by hand in 36 places with its own element builder, and play.html hand-writes the Back and Continue pager four times. They move to src/bench/ui/button.mjs and src/bench/ui/dom.mjs, and the old copies are deleted. Looks and behavior do not change.

**Rules.** Serves LAW.md section 1 (one set of shared controls, owner Oct 26). Replace, never layer: the 36 hand-built buttons, the local element builder and the four hand-written pagers are deleted in the same change. Screens follow the mock: nothing about how a button looks changes here.

**Done when.** No el("button") call and no local el() remain in play.mjs, and the four pagers in play.html are one shared mount; the calendar, campaign, character, jobs, news, options, politics, sheets, no-scroll and card browser checks pass in a drawn place, and buttons, money, people and travel fail the same way on clean main; a before and after screenshot at 1440x900 of the Guide sheet shows the same Continue button, with place and seed written under each.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The same buttons and pagers, now built by one shared part.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/ui/button.mjs, src/bench/ui/dom.mjs, src/bench/play.mjs, src/bench/play.html

**Notes.** Work order docs/work-orders/lead-screens-2026-10-26.md, part 2. Branch stacked on claude/screens-ui-panel (#6178) because both edit the top of play.mjs; merge #6178 first.
