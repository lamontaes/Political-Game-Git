---
id: gov-bill-fails-when-every-member-abstains
title: "A bill fails 0 to 0 when every member of the body abstains, so a sponsor's bill on a question nobody holds a view on never passes"
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

**What.** In the ten-place path-check sweep of Oct 17 (claude), a resident officeholder's bill in Carolina, Puerto Rico (seed sw6e30e80c) failed 0 to 0 at its first meeting. The body is a 16-member municipal legislature. The bill sets a policy question (fare-free transit) to 1. No member holds a view on that question, so each member's position total is zero and each abstains (`chamberVote`, `src/core2/modules/legislature.ts`); `countVote` then fails any bill whose yes votes do not exceed its no votes, so a bill nobody opposes and nobody supports dies silently. The sponsor is a member and also abstains, since a controlled character is never voted for. Decide what a body does with a bill on a question none of its members has a stance on: the sponsor's own support should count as a yes, and members with no view should follow their relationships and deals (the accepted favor in this bill's record), not abstain by default.

**Rules.** No dice: a member's vote comes from their views, relationships and the deals made, never a roll or a fixed share. Sliding scales and causes: a vote with no view behind it leans on the sponsor's standing with that member, not on a threshold.

**Done when.** In the seed above (Carolina, Puerto Rico, `buildBenchWorld`, a played year), the sponsor's bill on a question nobody holds a view on is voted with the sponsor and the colleagues who accepted a favor counted as yes, and a test in `src/core2/` names the place, the seed and the member records behind each vote.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/views.ts

**Notes.** Bill record: `bill:office:municipio:72031:board:2025-11-09:person_4ab92ac9e9719cfd:103`, status failed, votes none, one accepted favor deal with `person_1636eb690e5d1e89`. Related: whether a controlled sponsor's own bill should abstain at all.
