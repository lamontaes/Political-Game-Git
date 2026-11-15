---
id: campaigns-endorsement-reach-exceeds-yes-endorsers-in-the-voters-circle
title: "The campaign traits test finds endorsements counted for voters with no yes endorser in their circle, red on the Train"
area: elections
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: effects
model: opus
effort: medium
root: none
source: "Account lead's request on PR 9525, Nov 15, 2026 (src/core2/modules/campaigns.traits.test.ts, test candidates ask for volunteers and endorsements)"
---

**What.** On the Train head c43bf7e0 the test "candidates ask for volunteers and endorsements, and the answers are on the campaign's record" fails at fixed seeds, the same way with and without the endorsement-ask fix (PR 9525). Seed s1: one voter's endorsements counted 2 against 0 yes endorsers with the voter in their circle. Seed s2: eight voters, each counted 1 against 0. Seed s3 (Vaughn, New Mexico, 3582570): 161 yes endorsements "heard on the eve and the last day", and no per-row check ran (expected more than 0). Seen: a voter's "endorsements counted" on the campaign summary names an endorsement that nobody in their circle gave.

**Cause.** Needs cause. Known: the same assertion fails with and without the ask fix at seeds s1 to s3 (the Train head c43bf7e0 fails it on its own), so it is not the endorsement ask; the reach and the yes endorsers are counted from different rows, and which row the extra reach comes from is not yet traced.

**Fix.** None until the cause is found.

**Time box.** 2 hours to find the cause.

**Rules.** No dice. A counted endorsement is a read of a yes row that reached the voter through a person in their circle.

**Done when.** A second session runs `GOLDEN_PATH_SEED=s1`, `s2` and `s3` on the test (drawn places from all 56) on main and sees every assertion hold, with the cause named by record id.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/core2/modules/campaigns.traits.test.ts
