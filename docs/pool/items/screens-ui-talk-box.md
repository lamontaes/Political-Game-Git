---
id: screens-ui-talk-box
title: "One shared talk box part in src/bench/ui"
area: play
kind: cleanup
priority: 1
size: S
status: done
claimed-by: claude/screens-ui-talk-box
pr: #6189
blocked-on:
source: added with npm run pool -- add
lead: screens
milestone: play-first
claimed-at: 2026-10-26T21:20:31.995Z
---

**What.** The owner ruled on Oct 26 that the play screen's controls come from one shared set. This is the seventh part: the talk box. Today play.mjs fills the talk box's lines and replies by hand in five places (a conversation, the filing counter, a scene's narration, a played exchange, the filing status label) and keeps its own line builder, reply builder and number-key handler. They move to src/bench/ui/talk-box.mjs, and the hand-written code is deleted. Looks and behavior do not change.

**Rules.** Serves LAW.md section 4 and section 1 (one set of shared controls, owner Oct 26) and the screen-to-mock skill. Replace, never layer: the five hand-filled sites, the line and reply builders and the keydown handler are deleted in the same change. Nothing about how the talk box looks changes here.

**Done when.** No `$("talk-lines")` or `$("talk-choices")` remains in play.mjs; every conversation, filing counter, scene narration and played exchange fills the box through ui/talk-box.mjs; the talk-history, seat-choices, filing, character, person-card and panels browser checks pass in a drawn place; a before and after screenshot at 1440x900 of a household talk shows the same box, with place and seed written under each.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The same conversation box everywhere, built by one shared part.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/ui/talk-box.mjs, src/bench/play.mjs

**Notes.** Work order docs/work-orders/lead-screens-2026-10-26.md, part 7. Stacked on claude/screens-talk-history (#6188) and the stack under it; merge those first.
Merged Oct 27 in PR #6189
