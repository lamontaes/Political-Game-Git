---
id: world-job-listing-shows-the-pay-the-call-offers
title: "A job listing shows the pay the player would be hired at, so the call that follows offers the same pay"
area: world
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by: claude-places-and-names
blocked-on:
after:
lead: world
model: sonnet
effort: medium
root: none
source: Player's finding on #9995, Nov 17 (the call offered about 10% above the listing in three drawn places), the owner's ruling R16 ("Listings show actual pay and hours")
---

**What.** The Jobs list showed an opening's posted pay, and the call that followed an application offered the pay the person would actually be hired at, which moves with their schooling. In Townsend, Delaware, Tiki Gardens, Hawaii and Jamesport, Missouri the call was about a tenth above the listing. Seen: the Player's replay on #9995, on the Jobs list and then on the employer's call. Seen: You, Jobs and school, the openings list.

**Cause.** Found in code: `openingsView` in `src/bench/openings.ts` returned `row.hourlyMinor`, the position's own pay, while `offerToPlayer` in `src/core2/modules/jobs.ts` prices the offer with `hirePay`, the position's pay moved by the person's schooling.

**Fix.** The list shows `hirePay(api, row, personId)`, the same price the offer uses, so the listing and the call agree for this player. The engine's pricing is unchanged.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** Wire to the world: the list reads the jobs engine's own pricing rule, so the screen and the call cannot drift apart. No dice: pay is the position's pay moved by schooling, as before.

**Done when.** In a drawn place and a seed the builder did not choose, the offer that follows an application has exactly the pay the list showed the player for that opening, shown in `src/core2/jobs-player-offers.test.ts`; a second session reads the list, applies, and hears the same pay in the call.

**Waits on.** Nothing.

**Files.** src/bench/openings.ts, src/core2/jobs-player-offers.test.ts

**Notes.** The existing test now applies only to the openings in the player's town, as the Jobs list shows them, and holds the offer to the listed pay; it asserts more than before.
