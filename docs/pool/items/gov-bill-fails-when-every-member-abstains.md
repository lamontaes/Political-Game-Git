---
id: gov-bill-fails-when-every-member-abstains
title: "A bill fails 0 to 0 when every member of the body abstains, so a sponsor's bill on a question nobody holds a view on never passes"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/bill-abstain-sponsor
pr: #4929
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T13:54:27.856Z
---

**What.** In the ten-place path-check sweep of Oct 17 (claude), a resident officeholder's bill in Carolina, Puerto Rico (seed sw6e30e80c) failed 0 to 0 at its first meeting. The body is a 16-member municipal legislature. The bill sets a policy question (fare-free transit) to 1. No member holds a view on that question, so each member's position total is zero and each abstains (`chamberVote`, `src/core2/modules/legislature.ts`); `countVote` then fails any bill whose yes votes do not exceed its no votes, so a bill nobody opposes and nobody supports dies silently. The sponsor is a member and also abstains, since a controlled character is never voted for. Decide what a body does with a bill on a question none of its members has a stance on: the sponsor's own support should count as a yes, and members with no view should follow their relationships and deals (the accepted favor in this bill's record), not abstain by default.

**Rules.** No dice: a member's vote comes from their views, relationships and the deals made, never a roll or a fixed share. Sliding scales and causes: a vote with no view behind it leans on the sponsor's standing with that member, not on a threshold.

**Done when.** In the seed above (Carolina, Puerto Rico, `buildBenchWorld`, a played year), the sponsor's bill on a question nobody holds a view on is voted with the sponsor and the colleagues who accepted a favor counted as yes, and a test in `src/core2/` names the place, the seed and the member records behind each vote.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/views.ts

**Notes.** Bill record: `bill:office:municipio:72031:board:2025-11-09:person_4ab92ac9e9719cfd:103`, status failed, votes none, one accepted favor deal with `person_1636eb690e5d1e89`. Related: whether a controlled sponsor's own bill should abstain at all.

**Closed Oct 17 (claude, claude/bill-abstain-sponsor): the premise is wrong; not a bug in the vote.** I replayed the seed (`GOLDEN_PATH_SEED=sw6e30e80c node --import tsx src/bench/path-check.ts`, Carolina, Puerto Rico) and dumped the bill's records. No member abstained and no floor vote was held: the 16-member body sends a bill to a standing committee (`committeeStage`, `src/core2/modules/legislature.ts`), and the committee of 11 voted 2 to 9 against, so the bill failed there (`reported: false`) with no floor votes. The sponsor is not on that committee. Every member's position was a small negative or positive total: views of about -0.01 to -0.02 on fare-free transit, an organized interests' push of -0.15 on each member, and traits from -0.32 to +0.24; the one member with an accepted favor swung to yes (deal +0.51), and the sponsor's own closeness added +0.01 to +0.012. So the bill failed on the merits and the cause is readable from the committee record `committee:bill:office:municipio:72031:board:2025-11-09:person_4ab92ac9e9719cfd:103:office:municipio:72031:board`. What misled the sweep is the path-check line: it counts only floor votes, so a bill killed in committee prints as "failed (0-0)". That is filed as `play-path-check-committee-tally`. The CTO may drop this item.
