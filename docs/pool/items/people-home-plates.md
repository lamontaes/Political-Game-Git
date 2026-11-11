---
id: people-home-plates
title: "Mannequin plates for every home living room the opening evening can show"
area: people
kind: feature
priority: 1
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
after:
standard: 2
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
lead: cto
checked: fable 2026-11-10
branch: claude/pool-people-home-plates
---

**What.** On the opening evening at home the player's household is cast into the living room but nobody is drawn and nobody can be talked to when the home picture has no mannequin plate: every member is unplaced with reason no-plate. People are drawn only on a plate (owner, Oct 28 and 29), and of the home living rooms the opening shows only house-suburban-living at night has one. The owner's first screen is that evening, so every home living room the dwelling records can pick needs its plate, in the light the opening uses (night) and then the others. This is full-body staging, and on Nov 10 the owner ruled that staging waits while busts are decided. Seen: the opening evening at home, drawn with the household in the room.

**Cause.** Measured: Albany, Vermont, seed d25a6da2-6418-4903-aa38-7114f4ae08ac, home picture suburban-house: three housemates unplaced as no-plate (Red main report; panels.browser.mjs fails there). Code: plates are read by src/bench/mannequin-plates.ts and the staging engine stagePeople.

**Fix.** Paint a plate per home living room, in the order measured on Oct 29 over 30 drawn places: suburban-house; large-house; house-gulf-coast-raised, house-new-england-colonial, house-southwest-adobe, house-northwest-craftsman; then condition pictures of plated rooms (house-suburban-living lived-in); then the apartment rooms, rowhouse, rural-farmhouse, mobile-home, trailer and small-apartment. One plate serves all its lights (backdrops). The art session paints them (room-spots skill); each lands as data with no code change. Check panels.browser.mjs red separately under red-main if it still fails after.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: home plates are art data read by the one staging engine, stagePeople, with no place or dwelling named in code. Placeholders: a home picture without a plate draws nobody and stays a registered stopgap (SG-PLAY-people-pack-six) until its plate lands. An effect is a read, not a record: each plate is proven by the household drawn and talkable in a played opening evening.

**Done when.** A second session starts three lives in three drawn places from all 56 whose homes use different living rooms (name each place and seed) and sees the opening evening draw the player and their household on the home plate, at least one housemate talkable, and no household member unplaced as no-plate; panels.browser.mjs passes in each; a screenshot of each is in the PR body.

**Waits on.** The owner's decision on how busts are shown (OWNER-DECISIONS.md, Nov 10, "Staging waits for busts").

**Files.** art/people-rooms/mannequin-plates/, art/backdrops/manifest.json, src/core2/data/stopgaps/play.json

**Notes.**

- 2026-10-29 (claude/people-home-plates, people session): measured the order. In 30 drawn places the opening home was house-suburban-living 17 (plated), suburban-house 11, house-new-england-colonial 2; the player is 18 and lives in the family house, so apartments rarely open the game. Paint in this order, one plate per room, which now serves all its lights (#6848, `backdrops`): suburban-house; large-house; house-gulf-coast-raised, house-new-england-colonial, house-southwest-adobe, house-northwest-craftsman; then condition pictures of plated rooms (house-suburban-living lived-in); then the apartment rooms, rowhouse, rural-farmhouse, mobile-home, trailer and small-apartment. The plates are painted by the art session (Firefly, `room-spots` skill); each lands as data with no code change.

Lane 5 (pool truth, Nov 3): claim released under the 48-hour rule. Claimed 2026-10-29 on `claude/people-home-plates`; last push Oct 30, 02:12 UTC; no open PR. The branch keeps its work; claiming it takes the branch.

Released (2026-11-11): art plates wait on the owner's Nov 10 busts decision. Continue on branch claude/pool-people-home-plates.

**Notes (Nov 11, 2026, set aside).** Dropped: the owner ruled on Nov 10, 2026 (about 9:24 p.m.) "Remove all the people," and at about 9:27 p.m. "people will eventually be in the game, but right now for early access, it's just we have to do the busts." No plate is painted or measured while rooms draw nobody. The full-body system and what comes back after early access are in docs/art/full-body-people-after-early-access.md; this item is rewritten from that record when full bodies return.
