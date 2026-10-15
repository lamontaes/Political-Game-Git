---
id: core-player-autoplay-acts
title: "Time advancing with no choice lets the engine give the player's money to cause groups"
area: core
kind: bug
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "found in core-player-money-spending (Lake Ridge, Virginia, seed d97611412a84)"
---

**What.** In a one-year run with the player holding a job, the day engine chose acts for the player and paid 71 gifts ($557.25) from the player's account to the cause group `organization:cause-group:person_1948fb300a9fa2ce` (journal ids `donation:person_b45799350d086afc:organization:cause-group:person_1948fb300a9fa2ce:cause:us-policy-positions:housing-land-use.allow-multifamily-in-single-family-zones:<date>`). The owner's ruling (Oct 14) says no engine makes a choice for the controlled person. Find how the real game controls the player's days (`isExplicitlyControlledPersonV1`, the controller in `life.ts`), and make an uncontrolled stretch of time (a skipped week) not give the player's money away: the engine offers, the player decides.

**Rules.** The player's choices are the player's (OWNER-DECISIONS.md, Oct 14, night); an effect is a read.

**Done when.** A one-year run where the player never chose a gift shows no `donation:` entry paid from the player's account; the household's bills (rent or mortgage, living costs, taxes) still leave it.

**Files.** src/core2/life.ts, src/core2/modules/drives.ts

**Notes.** If skipping time is meant to let the character live on their own, the owner can say so; ask in the PR body rather than deciding. The bench's autoplay may be the only caller; verify against the real UI before changing the engine.
