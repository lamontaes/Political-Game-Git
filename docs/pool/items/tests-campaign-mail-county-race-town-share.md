---
id: tests-campaign-mail-county-race-town-share
title: "The mail check's amounts assume the town is the whole race, and fail where the only local race is a county seat"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: Red desk, Nov 13 (PR #8984, the red left in campaign-mail.test.ts)
---

**What.** src/bench/campaign-mail.test.ts fails "mail spends what the player set on mailers" at `expect(sent.spentMinor).toBeGreaterThan(0)` in Horn Hill, Alabama (34c05193691935ba), Modena, Utah (2c89147eae23b180) and East Griffin, Georgia (b4fa578480553dbf), once PR #8984 clears the trace check before it. The candidate files for a county board seat, the only local race open, and $20.36 of mail buys no mailer. Seen: a candidate's mail in a county race reaches the town's share of the households it pays for.

**Cause.** Found in code: `sendMail` in src/core2/modules/campaigns.ts buys `floor(min(amount, available) * townShareOfRace / perPiece)` pieces, the town's share of a district or county race. The test sets its amount to at most 21 pieces' price and checks that the amount buys whole pieces up to less than one piece short, which holds only where `townShareOfRace` is 1 (a town race). Horn Hill's share of its county is a few hundredths, so nothing is bought. Even waiting up to 120 days for a town race (tried on PR #8976's branch) finds none in these three places.

**Fix.** The test prices its amount from `townShareOfRace` for the race it filed (enough for twenty pieces at that share) and checks the pieces bought as `floor(amount * share / perPiece)`, or it files for a town race and draws another place where none opens within the wait, naming each place passed over. No check is dropped.

**Time box.** 1 hour

**Rules.** One rule, all 56 places: the test draws and names its place, and a county race is as real as a town one. Never loosen an assertion: the expected pieces follow the engine's own share rule.

**Done when.** A second session runs campaign-mail.test.ts on main at GOLDEN_PATH_SEED=34c05193691935ba and at a fresh seed, each naming its drawn place, and both cases pass, with the mail bought in the drawn place matching the share of the race the candidate filed for.

**Waits on.** PR #8984 (the trace check before it).

**Files.** src/bench/campaign-mail.test.ts
