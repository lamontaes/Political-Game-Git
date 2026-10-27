---
id: release-red-profit-pass-through-counted-owner-filled-in
title: "profit-pass-through test: a counted owner of a pass-through business is already a full person (Mantoloking, New Jersey, seed 40a63403...:counted:0); fails on main too"
area: world
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/political-game-pool-3xfqef-9
pr: #5398
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T02:00:20.304Z
---

**What.** The profit-pass-through test for a counted owner fails in Mantoloking, New Jersey, seed 40a6340376bb8deb9116120b34d4e90e238483e1:counted:0, for the row pass-through:organization_0fd68c3e0cb93c25:2025-07-01: the test expects the owner is not a full person (core.people.has false) and finds they are. Find whether the owner was filled in between the pass-through and the check, or the pass-through ran on a person who was already full and was wrongly marked counted. A counted row must be for a counted owner at the time it is written.

**Rules.** Fix at the root: a red test is fixed in place or the code it guards is, never skipped or loosened. No dice. One rule, all 56 places: place facts come from data, and the test names the place and seed it drew.

**Done when.** In Mantoloking with that seed and in two other drawn places, every counted pass-through row is for an owner who was counted when it was written, and src/core2/profit-pass-through.test.ts passes.

**Files.** src/core2/profit-pass-through.test.ts, src/core2/modules/employer-taxes.ts

**Notes.** Found running src/core2 on main, Oct 19 to 20 (release-suite-red-list-on-main). Reproduced with GOLDEN_PATH_SEED=40a6340376bb8deb9116120b34d4e90e238483e1 and also with main's code (checked by restoring main's versions of the files the column-read change touches), so it is not caused by that change.
