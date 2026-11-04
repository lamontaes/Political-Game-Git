---
id: campaign-favor-called-in
title: "A colleague who owes the player a favor from a deal helps the player's next campaign, and one the player owes asks"
area: elections
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Deals in the legislature leave obligations rows (legislature.ts obligationsOf), but nothing outside the legislature reads them, so a favor owed never reaches a campaign. Path 11 of Lane 1 says a favor gets called in at the next election: a colleague the player helped pass a bill endorses, volunteers or gives when the player runs again, and a colleague the player owes asks for the player's endorsement or help in their own race. The engines exist: legislature deals and obligations, campaigns' endorsements, volunteers and gifts.

**Rules.** An effect is a read, not a record: the obligation row is read by the campaigns engine at the moment it decides an endorsement or gift, and the row is settled by that act. No dice: whether the colleague helps follows their traits, the size of the favor and their relationship, never a roll. One engine: campaigns.ts decides endorsements and gifts by its usual rule with the favor as one reason.

**Done when.** In a played world (drawn place and seed printed), a deal recorded in a council session leaves an obligation, the obligee's later campaign records an endorsement or gift from the colleague whose decision reasons cite the obligation's id, the obligation is marked settled by that act, and a test fails when the obligation reader is removed.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/campaigns.ts

**Notes.** TODO
