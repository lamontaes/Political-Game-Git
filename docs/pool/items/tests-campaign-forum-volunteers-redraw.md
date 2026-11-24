---
id: tests-campaign-forum-volunteers-redraw
title: "The forum and volunteer-shift tests redraw a place where the player can enter a race, so they cannot turn main red by draw"
area: elections
kind: bug
priority: 1
size: S
status: done
claimed-by: governing/campaign-tests-redraw
pr: #6950
blocked-on:
source: Merger 0, Oct 30 (after merging #6874)
lead: governing
claimed-at: 2026-10-30T07:45:00.499Z
---

**What.** Two campaign tests fail on some drawn places, not on a code fault. In campaign-day.test.ts the forum test fails with "the player could file for nothing: Wahiawa, Hawaii" (run seed b3fa5eec...) because its one draw lands where no town or county race takes the player. In campaigns.test.ts the volunteers test failed in 555 ms on one draw, before the campaign ran, which points at its own draw: no open contest to file for, or fewer than three willing volunteers. Merger 0 saw two such failures in its first nine runs and none in the next 37, so main can turn red by draw.

**Rules.** Never skip or weaken a test: the tests redraw by salt from all 56 places, as seat-leavings.test.ts does, until the place has what the test needs, and fail naming every place tried when none does. One rule, all 56 places: no place is named or excluded by name. The assertions themselves are unchanged.

**Done when.** campaign-day.test.ts and campaigns.test.ts each redraw (seed, seed:1, and so on, up to a bound) until the player can file for a town or county race and, for the volunteers test, three willing volunteers exist, naming the place and seed used; with GOLDEN_PATH_SEED set to the Wahiawa run seed the forum test passes on a later draw; each file passes on five fresh draws in a row.

**Files.** src/core2/campaign-day.test.ts, src/core2/campaigns.test.ts

**Notes.** TODO
