---
id: screens-ui-card
title: "One shared card part in src/bench/ui"
area: play
kind: cleanup
priority: 1
size: S
status: in-pr
claimed-by: claude/screens-ui-card
pr: #6182
blocked-on:
source: added with npm run pool -- add
lead: screens
milestone: play-first
claimed-at: 2026-10-26T20:32:30.674Z
---

**What.** The owner ruled on Oct 26 that the play screen's controls come from one shared set. This is the fourth part: the card. Today play.mjs builds the law card, the family card, the money item, the job overview and the job offer each by hand with its own class. They move to src/bench/ui/card.mjs as one makeCard, and the hand-written elements are deleted. Looks and behavior do not change.

**Rules.** Serves LAW.md section 1 (one set of shared controls, owner Oct 26) and the screen-to-mock skill (cards where the mock has cards). Replace, never layer: the five hand-built card elements are deleted in the same change. Nothing about how a card looks changes here.

**Done when.** No el() call in play.mjs writes the class law-card, family-card, money-item, work-overview or job-offer; each is built through makeCard; the character, jobs, no-scroll and card browser checks pass in a drawn place and money fails the same way on clean main; a before and after screenshot at 1440x900 of Money and Jobs shows the same cards, with place and seed written under each.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The same cards on every screen, built by one shared part.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/ui/card.mjs, src/bench/play.mjs

**Notes.** Work order docs/work-orders/lead-screens-2026-10-26.md, part 4. Stacked on claude/screens-ui-list-row (#6181), then #6179 and #6178; merge those first.
