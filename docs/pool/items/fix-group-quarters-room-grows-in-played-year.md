---
id: fix-group-quarters-room-grows-in-played-year
title: "Stop an opening group-quarters room from gaining a person during the played year"
area: core
lead: governing
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
after: core-group-quarters-turnover-part-2-institution-intake
source: account lead, Nov 14, red on the clean train found while gating #9215
claimed-at:
standard: 2
model: opus
effort: medium
root: design-one-model-two-tiers
---

**What.** The test of the group-quarters rooms in a played year says no opening room ends the year with more people than it opened with, and it fails: a room that opened with 2 people holds 3 at the year's end. The player would see a nursing-home or dorm room quietly fill past what the town's records opened it with. Seen: the town's group-quarters rooms, where a room's people count rises with no admission or birth record behind it.

**Cause.** Measured: `npx vitest run src/core2/group-quarters.test.ts` with `GOLDEN_PATH_SEED=bd1e0471f9ebb7f8e60872344c012dbfadaecbdf` fails at Storrs, Connecticut (0973980, room household_fcbe71515440c1ec, "expected 3 to be less than or equal to 2", line 310) and at Charlotte Amalie, U.S. Virgin Islands (territory:VI:charlotte-amalie, room household_4cc3fa27a139b8aa, same message, line 329), identically on the clean train head 42fa31a904 and on the head with #9215's changes. Which step adds the third person (a birth, a marriage or an arrival recorded into a counted room) is not yet found; the first step is to find it.

**Fix.** Find the step that adds a person to an opening room and route it through the room's admission rule, or give the room's count the same rule a full person's home follows; leave the test as it is.

**Time box.** 3 hours for one opus session.

**Rules.** One model, two tiers. No dice. Do not loosen the test.

**Done when.** A second session plays a world in a drawn place (place and seed named, and also Storrs and Charlotte Amalie with the seed above) in the running game and sees both pass, and sees no opening room above its opening count at the year's end by room record id.

**Waits on.** Nothing.

**Files.** src/core2/group-quarters.test.ts, src/core2/modules/counted-moves.ts

**Notes.** Found while gating #9215. Filed by hand.
