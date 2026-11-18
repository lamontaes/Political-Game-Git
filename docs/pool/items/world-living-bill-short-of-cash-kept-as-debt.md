---
id: world-living-bill-short-of-cash-kept-as-debt
title: "A household's monthly living bill larger than the payer's cash: is the unpaid part kept as a debt?"
area: world
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: money
model: opus
effort: medium
root: none
source: twin run for PR 9222, Nov 14
---

**What.** In Charlotte Amalie East, U.S. Virgin Islands (place key territory:VI:charlotte-amalie-east, seed quit-job-1, the draw `drawPlace("quit-job-1", "player-quits-job")`), a player who left a job on 2025-08-06 had 61,944 in cash, was paid 61,200 in arrears and had 11,549 withheld. On 2025-09-01 the household's living bills were charged to the player's cash: `living:household_e6ba3b68991c9508:2025-09-01:organization_9033674c4ad73565:1` (11,459), `living:household_e6ba3b68991c9508:2025-09-01:organization_c5dab4fe88252a08:0` (1,339) and `residents:outside-living:household_e6ba3b68991c9508@2025-09-01:person_ad8b4c909c0f0075` (98,797), 111,595 in all, and the player's cash ended at exactly 0. Those three receipts sum to exactly what the player had, so the payments look capped at the cash on hand. It could not be seen whether any part of the bill above that stays owed. If it is dropped, a jobless person's household never falls behind on bills, which breaks the arrears the rent and living-cost rules rely on. Seen: on the money card of a player who has no income, as bills the household owes after the cash runs out.

**Cause.** Needs cause. How to find it: run the twin described in What with the cash journal on (the leaving player and the staying player), and for the three 2025-09-01 receipts read the paid amounts against the household's assigned monthly cost, then follow what the living-cost writer does with the difference.

**Fix.** None until the cause is found.

**Time box.** 3 hours, one Opus session. When it runs out, push what is found and set the state honestly.

**Rules.** Money moves only through the existing accounts and journal. No dice. Estimate, never unknown.

**Done when.** A second session, on main, in Charlotte Amalie East with seed quit-job-1 (and in one other drawn place named with its seed), takes the player's job, leaves it, plays 35 days with the cash journal on, and reads by receipt id whether the part of the 2025-09-01 bill above the cash on hand is kept as a debt and later settled, or dropped.

**Waits on.** Nothing.

**Files.** src/core2/modules/residents.ts, src/core2/accounts.ts

**Notes.** Found while tracing the cash drop for PR 9222 (Leave this job). The twin run with the player staying paid two monthly bills of about 110,000 each out of pay and ended with the same cash it started with.
