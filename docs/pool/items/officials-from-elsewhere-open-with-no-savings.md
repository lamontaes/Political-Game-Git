---
id: officials-from-elsewhere-open-with-no-savings
title: "A state's or territory's cabinet and the town's filing officers open with no cash, no savings and no household cost, and a territory's filing officers hold no job at all"
area: world
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after: opening-adults-cash-pinned-place
blocked-on:
root: none
lead: money
model: opus
effort: medium
source: "T54's trace of opening-adults-cash by person id, Nov 16 05:40Z (Leloaloa AS seed 6682f9f6c16ebcfb, Tutu VI seed 722c036a9cce0bae)"
---

**What.** At Leloaloa AS and Tutu VI (`drawPlace(seed, "opening-adults-cash")`, seeds 6682f9f6c16ebcfb and 722c036a9cce0bae), 19 adults open with nothing: 17 cabinet members `person:cabinet:US-AS:<department>:0` (and US-VI) and two filing officers `person:filing-officer:<town>:municipalOffice` and `:countyOffice`. The cabinet hold 0 until their first monthly pay on Mar 1 ($4,471.47; one still 0 on Mar 2) and have no household cost; the filing officers hold nothing and no job all year. `opening-adults-cash.test.ts` is red at both towns, 19 of 65 and 19 of 67 against a floor of about 25%. Seen: dev mode's trace of a cabinet member (Opening savings and the ledger) and the test's message.

**Cause.** Found in code: `giveLivingCost` (src/core2/official-living.ts) gives anyone seated from elsewhere a one-person household's cost and the savings a family at their pay keeps; official pay (`seat`), staff and press staff call it. `fillInCabinetPerson` and `seatDrawnOfficer` (src/core2/modules/executive.ts) fill people in with `fillInIdentity` and never call it, and the cabinet have no officials row, so official pay never seats them. Filing officers are put on a "city" or "county" payroll, and a territory's budgets hold only federal and state governments, so `startPublicJob` is never reached.

**Fix.** In executive.ts, where `fillInCabinetPerson` fills in someone from elsewhere and where `seatDrawnOfficer` fills in its officer, call `giveLivingCost` with the post's yearly pay (the job's hourly pay times the full-time hours, as staff.ts does) and the government that employs them, so they open with the same household cost and savings any official from elsewhere does. For a filing officer whose payroll level has no government in the place, say in the code what employs them where there is no city or county, from the place's records, and register a stopgap only if none answers.

**Time box.** 3 hours, Opus, medium.

**Rules.** One model, two tiers; one engine: the living-cost step official-living.ts already has, never a second; estimate, never unknown: savings from the survey's row by pay.

**Done when.** opening-adults-cash.test.ts passes at Leloaloa and Tutu with no change to its bound, and at both the 17 cabinet members hold the savings their pay keeps on day 0, by record id `savings:person:cabinet:US-AS:<department>:0:2025-01-20`. A second session sees in dev mode, at a drawn territory town it names with its seed, a cabinet member's opening savings and living cost.

**Waits on.** opening-adults-cash-pinned-place.

**Files.** src/core2/modules/executive.ts, src/core2/opening-adults-cash.test.ts.
