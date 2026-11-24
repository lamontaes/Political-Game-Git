---
id: world-jobless-households-no-income
title: "Households with no job and no cash have no income at all: 9 of the 20 largest living-cost arrears in a Utah town hold nothing and receive no pay or benefit"
area: world
kind: bug
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr: #4942
after:
blocked-on:
lead: jobs
model: sonnet
effort: high
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** In three towns drawn (Murphy, Idaho; Timberwood Park, Texas; Bay Pines, Florida; the played world from January 20, 2025 for 90 days, seeds n1 to n3) 61, 62 and 63 of about 1,700 full households, 3.6 to 3.8 percent, held no cash at the start and received no money at all in 90 days: no pay, no benefit and no transfer. About a quarter of them (12 to 19 a town) have only people 65 or older, and the rest have an adult under 65 and no job. Both groups are real in life, so the number is not obviously wrong: the American Community Survey puts the share of households with no income at roughly 3 to 4 percent (not yet checked against its table for each of these states). What is left to settle is why a household of people 65 or older is paid no retirement award, unemployment, SNAP or other benefit and holds no savings to spend.

**Cause.** Needs cause. Looked at the item's three-town measurement (Murphy, Idaho; Timberwood Park, Texas; Bay Pines, Florida; seeds n1 to n3) and src/core2/modules/residents.ts: the share with no income is near the ACS share, so the number itself is not shown wrong, but why households of people 65 or older receive no retirement award is not explained.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN: the share of households with no income starts from the ACS figure for the place with its source and spread, and is reported beside it, never pulled toward it. No dice: a household's benefits follow the law in force and its members' records. One rule, all 56 places.

**Done when.** A second session, on main in Murphy, Idaho, Timberwood Park, Texas and Bay Pines, Florida (seeds n1 to n3) and one drawn place, plays 90 days and reads the households with no income: every household of people 65 or older with no award is listed by record id with the reason the law in force and its members' records give. The share with no income is printed beside the ACS share for that place as a report, and a test in src/core2 names the place and seed.

**Waits on.** Nothing.

**Files.** src/core2/modules/residents.ts, src/core2/law-reach, src/core2/data/

**Notes.** Measured Oct 17 (claude) with a wrapper on `api.postJournal` summing positive postings by member account, for full households whose members held $0 at the start. The Utah town in the item's title was not reproduced in that later measurement; its earlier seed and observations are recorded below. The living-cost arrears this causes are `world-households-unpaid-living-costs-payday` and `world-living-costs-pay-from-household-members`.

Earlier Utah measurement from PR #4942 (before the later three-town measurement above): In a Utah town (place 4972280, seed `ae7138d0fe23b58bb40b941cea599b2992632daa0debb935363661593218e275`, bench world, two-level, 90 days from the start, after the carried-arrears and pay-from-members changes in #4937 and #4939) the households with the largest unpaid living costs hold no cash and have no pay: of the nine with arrears above $200, eight have no job and no income contract at all (a couple born 2001 and 1999 with a child born 2022 owing two months, single adults born 1980, 1986 and 1998, a family of four), and one is a 75-year-old whose retirement of $1,469.52 a month goes to the rent first. Households that earn owe under a tenth of what they were asked. A household with no job, no cash and nothing coming in cannot pay anything, so its rent, living cost and every bill go unpaid month after month with nothing changing for it.

Sent back 2026-10-23 from PR #5042 (branch claude/jobless-no-income-s6): Cabinet-pay test covers 70 days without the required 90-day ACS household comparison and older-household reasons, and the body lacks its Done-when table; use a valid bounded cabinet-pay item or supply the acceptance; finish on that branch, merge main into it first.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have settled whether 3.6 percent of households have no income; that is inside the ACS range of 3 to 4 percent and reads as real.
