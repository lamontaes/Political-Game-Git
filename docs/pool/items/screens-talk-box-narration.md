---
id: screens-talk-box-narration
title: "The talk box shows one Continue, bottom left, when there is nothing to answer, and no subtitle"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: screens/talk-box-narration
pr: #6437
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T23:20:02.421Z
---

**What.** The owner at 6:20 PM on Oct 27, from v0.59.0 in Berry, Kentucky, said: WHEN IT IS JUST THE NARRATOR REMOVE THE LEAVE/SAY NOTHING. He also said he does not like how talk is displayed, and wants Continue on the bottom left. A beat with nothing to answer showed Say nothing and Leave, which did nothing, and a subtitle sat under the speaker's name.

**Rules.** This is a game, not a spreadsheet: a control that does nothing is a defect, so Say nothing and Leave show only where they are a real choice; replace, never layer, so the subtitle and its bank are deleted; four dynamic choices with say nothing beside them stand (LAW.md section 4).

**Done when.** In a drawn place (name the place and seed), src/bench/talk-box.browser.mjs passes on a restarted bench: the first beat with nothing to answer shows Continue alone at the bottom left and Continue closes it; replies show no Continue; before and after screenshots are in the PR body.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/play.html, src/bench/ui/talk-box.mjs, src/bench/talk-box.browser.mjs

**Notes.** CTO relay, 23:25 UTC Oct 27. lead: play-first.
