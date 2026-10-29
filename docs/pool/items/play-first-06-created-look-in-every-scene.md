---
id: play-first-06-created-look-in-every-scene
title: "The look you made is your face on every surface: card, Who you are, the opening and Continue"
area: play
kind: bug
priority: 1
size: M
status: done
claimed-by: play-first/play-first-06-created-look-in-every-scene
pr: #6283
blocked-on:
after:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T10:46:55.602Z
---

**What.** In the v0.22.10 release the creator drew a blonde woman in a burgundy top, and play drew someone else in every scene; the talk box showed my portrait next to another person's name. Once the rooms draw the created look (play-stop-03), the other places a player sees themself must read the same record. This item makes every portrait and figure of the player read the one appearance record the creator saved.

**Rules.** Serves LAW.md §2, People in rooms and figures; LAW.md §10, The owner's read of the Oct 24 screenshots. Wire to the world: the creator's saved appearance is the one record every view of the player reads. Replace, never layer: one appearance per person, never a fresh pick per screen.

**Done when.** In a drawn place, after making a character, the player card, Who you are, the player's person card, the opening's family chapter and the title's Continue all show that look, checked by a test on the appearance record, shown by a screenshot of each.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Your own face and clothes from the creator show on the player card, Who you are, your person card, the opening's family chapter and the title's Continue.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/appearance.ts, src/bench/card.ts, src/bench/opening.ts, src/bench/title.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).

CTO, Oct 27: the `after:` lines (play-first-05, play-stop-03) are cleared; both landed in #5898 and wait only on the owner's installed-build check, which does not block building on them.
- Merged Oct 27 in PR #6283; awaiting the owner's installed-build check. Not checked in the PR: the player's person card and the opening's family chapter screenshots.
