---
id: gov-officials-legislators-know-no-one
title: "M1-12: 865 of 1,455 officials know no one: state legislators, the cabinet and the president get no colleague ties"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The new M1-12 check (src/bench/m1-12-check.ts) in Kagman IV, Northern Mariana Islands (place key territory:MP:kagman-iv, seed 4252c1f397d86092faf03bd7ede9af27f22cda070e32b1b7e0b0d3e767e2aac1) opened every official's card as a click does. 865 of 1,455 have no relationships: 829 state legislators, 16 unicameral legislators, 15 cabinet secretaries, the president, the vice president, a lieutenant governor, an attorney general and a board of education member. src/core2/modules/officials.ts colleagues (line 835) ties only a congressional delegation and its governor, and a member to a party leader from another state, so a state legislature's members, who share a chamber, never know each other.

**Rules.** No dice: a tie's strength comes from the years two officials served together, as the delegation ties already do. One model, two tiers: officials are full people, and their ties are read by the same engines as any person's.

**Done when.** The M1-12 command in Kagman IV, Northern Mariana Islands (seed above) and a second place drawn from all 56 shows every serving official with at least one relationship, by record id in the PR body, and a test fails when a chamber's members get no ties.

**Files.** src/core2/modules/officials.ts

**Notes.** Found by the M0-M2 lead writing M1-12's command, Oct 24. Blocks roadmap M1-12.
