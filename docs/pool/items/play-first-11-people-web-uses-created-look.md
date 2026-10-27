---
id: play-first-11-people-web-uses-created-look
title: "The face at the center of the People web is the one you made"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: play-first/play-first-11-people-web-uses-created-look
pr: #6286
blocked-on:
after:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T10:59:42.288Z
---

**What.** The owner's read of the playtest screenshots: the person in the people web is the one you made. In the v0.22.10 release the People web's center showed a figure that was not the created character. This item makes the web's center portrait read the player's saved appearance.

**Rules.** Serves LAW.md §2, People in rooms and figures; LAW.md §10, The owner's read of the Oct 24 screenshots. Wire to the world: the web reads the same appearance record as every other view of the player. Replace, never layer: the web's own portrait pick for the player is removed.

**Done when.** In a drawn place after making a character, the People web's center portrait matches the creator's portrait, checked by a test comparing the two images, shown by a screenshot.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** In People, the face at the center of the web is the one you made in the creator.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.mjs, src/bench/appearance.ts, src/bench/people.browser.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).

CTO, Oct 27: the `after:` lines (play-first-05, play-stop-03) are cleared; both landed in #5898 and wait only on the owner's installed-build check, which does not block building on them.
- Merged Oct 27 in PR #6286; awaiting the owner's installed-build check. The PR's check also passes on main in the home room; the change removes the room dependency.
