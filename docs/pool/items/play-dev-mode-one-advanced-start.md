---
id: play-dev-mode-one-advanced-start
title: "Watch the World and the custom world become one Advanced start where you play anyone, with no questionnaire"
area: play
kind: feature
priority: 1
size: M
status: done
claimed-by: play-first/play-dev-mode-one-advanced-start
pr: #6232
blocked-on:
source: "owner, Oct 26 evening and Oct 27 (OWNER-DECISIONS), added by lane agent 5"
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T05:41:05.100Z
---

**What.** The owner ruled (Oct 26 evening, OWNER-DECISIONS): "Watch the World and the custom world become one dev mode where you can do anything from the start, more like RimWorld or Crusader Kings... get rid of the opening questions. The questionnaire, that's useless." Today New game offers Custom world, Start a life and New world, and the title carries a dead Watch the world button. This item makes New game offer Start a life and one Advanced entry; Advanced holds the seed and the world's settings (the old custom fields), builds the world with no questionnaire, then offers every person who holds an office in that world, each with their office, to play as, plus a random resident. Choosing one plays that person from today, with no opening address.

**Rules.** Serves LAW.md §1 (OD Oct 24: one Advanced link beneath Start a life; Oct 26: one dev mode, no questionnaire). Wire to the world: the picker reads the world's own serving terms in the offices module, never a list written in code. One rule, all 56 places: any drawn place builds; the picker names no state. This is a game, not a spreadsheet: the controls come from `src/bench/ui/`.

**Done when.** In a drawn place at 1440x900, `src/bench/advanced.browser.mjs` passes: New game shows Start a life and Advanced and no Custom world, New world or Watch the world; Advanced builds a world with no creator step; the picker lists officeholders read from the world's serving terms, each with its office title; choosing one makes that person the player (the player card names them and their office shows under Politics); shown by a screenshot with the place and seed.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** New game has Start a life and Advanced. Advanced builds a world and lets you step in as any officeholder in it.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.html, src/bench/play.mjs, src/bench/handler.ts, src/bench/officeholders.ts, src/bench/advanced.browser.mjs, src/bench/data/controls.json

**Notes.** Supersedes the Custom world and New world buttons (replace, never layer). Officials whose term names no person yet (statewide and federal officials not filled in) are not listed until the engine fills them in; that is a core item for the laws and effects lead (`needs-from: laws-effects`). Place choice stays with the seed's draw. Lead: play-first (lane agent 5, Oct 27; docs/play-first/ORDER.md).
Merged Oct 27 in PR #6232; awaiting the owner's installed-build check
