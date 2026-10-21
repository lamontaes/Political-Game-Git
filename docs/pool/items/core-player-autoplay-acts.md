---
id: core-player-autoplay-acts
title: "Does the character give the player's money to cause groups on its own while time advances?"
area: core
kind: owner-decision
priority: 3
status: done
claimed-by:
pr:
blocked-on: owner decision
milestone:
source: "found in core-player-money-spending (Lake Ridge, Virginia, seed d97611412a84)"
---

**What.** While time advances, the character answers its own choices with the core's selection (owner, Oct 14, 2026: "Day never opens a choice list", `src/bench/player.ts`). In a one-year run with the player holding a job, that selection included 71 gifts ($557.25) from the player's account to a cause group (`donation:person_b45799350d086afc:organization:cause-group:person_1948fb300a9fa2ce:cause:us-policy-positions:housing-land-use.allow-multifamily-in-single-family-zones:<date>`). The question: is giving the player's money away something the character does for itself while days run, or does a gift need the player's own choice (the Oct 14 ruling: "No engine accepts a job, a home, a filing or any choice for the controlled person")?

**Rules.** The player's choices are the player's (OWNER-DECISIONS.md, Oct 14, night); a self-answered day is the owner's own rule. Neither is changed here.

**Done when.** The owner rules; if gifts need the player's choice, the engine offers them as a stop and the year shows no `donation:` paid from the player's account that the player did not choose.

**Files.** src/core2/modules/drives.ts (`payDonation`), src/core2/life.ts, src/bench/player.ts

**Notes.** Searched the register and OWNER-DECISIONS.md: both rulings stand and neither names gifts. Campaign gifts to candidates were a different case (a candidate's campaign drew on the player's account outside any choice of the character) and are fixed in #4448.
Ruled in OWNER-DECISIONS.md, Oct 16/Oct 19.
