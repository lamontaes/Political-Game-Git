---
id: screens-ui-list-row
title: "One shared list row part in src/bench/ui"
area: play
kind: cleanup
priority: 1
size: S
status: done
claimed-by:
pr: #6181
blocked-on:
source: added with npm run pool -- add
lead: screens
milestone: play-first
claimed-at:
---

**What.** The owner ruled on Oct 26 that the play screen's controls come from one shared set. This is the third part: the list row. Today play.mjs writes the row element by hand in 25 places, and the Politics government list shows each member as a bare line of text. They move to src/bench/ui/list-row.mjs: one listRow for a label and value or a record's line, and one personRow that shows a face, the name that opens their card, their office and their party. The old copies are deleted. Looks do not change except that members now show a face.

**Rules.** Serves LAW.md section 1 and the screen-to-mock skill (a list of people shows face, office and party, and every person is clickable to their card). Replace, never layer: the hand-written row elements and the old member line are deleted in the same change. Nothing changes how a row looks apart from the face on a person.

**Done when.** No `className: "row` literal remains in play.mjs outside ui/list-row.mjs; the Politics government list builds each member through personRow and clicking the name opens their card; the calendar, campaign, character, jobs, news, no-scroll and card browser checks pass in a drawn place, and sheets and politics fail the same way on clean main; a before and after screenshot at 1440x900 of Politics, Government shows the same rows with a face added, with place and seed written under each.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The same lists, built by one shared part, with a face beside each official in Politics.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/ui/list-row.mjs, src/bench/play.mjs, src/bench/play.css

**Notes.** Work order docs/work-orders/lead-screens-2026-10-26.md, part 3. Stacked on claude/screens-ui-button (#6179), which is stacked on claude/screens-ui-panel (#6178); merge those first.
Sent back 2026-10-26 from PR #6181 (branch claude/screens-ui-list-row): merge of main conflicts in src/bench/play.mjs after #6178 and #6179 landed; finish on that branch, merge main into it first.
