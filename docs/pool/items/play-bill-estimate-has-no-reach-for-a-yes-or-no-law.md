---
id: play-bill-estimate-has-no-reach-for-a-yes-or-no-law
title: "A bill on a yes-or-no law gives no estimate of who it would reach"
area: play
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: play-bill-page-says-the-same-sentence-three-times
blocked-on:
lead: laws
model: opus
effort: medium
root: rc10-screens-keep-own-facts
source: lead's walk of the screens train, Nov 11, 2026
checked:
claimed-at:
branch:
---

**What.** A drafted bill that turns a yes-or-no law on or off (a Medicaid work requirement, legal cannabis sales) shows no estimate of who it would reach or what it would cost them. A wage bill says how many workers get a raise and what it adds to pay; these bills say nothing. Seen: "What it would do" on the bill's page in Politics, Bills.

**Cause.** Needs cause. Known so far: `costOf` in src/core2/modules/legislature.ts fills `workersRaised`, `annualPayMinor` and `note`, and for a yes-or-no provision all three come back empty. Not yet found: which reader the laws engine already has that counts the people a law in force covers in a jurisdiction (the one a finished bill's card reads to say who the law reached), and whether `costOf` can call it for a law that is not yet in force.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one cause finder.

**Rules.** Estimate, never UNKNOWN. One model, two tiers: the count covers counted people with the same rule as full people. A view never computes its own version of a fact.

**Done when.** The cause names the reader by file and function and says whether it can run on a law not yet in force, and the Fix is written so a builder can build it from the item alone. Once built: a second session, in the running game on main in a drawn place it writes down with its seed, opens a drafted bill on a yes-or-no law and sees under "What it would do" how many people the law would cover, the same count the law's own record gives after it takes effect.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts

**Notes.** Split from play-bill-page-says-the-same-sentence-three-times by the lead, Nov 11, 2026.
