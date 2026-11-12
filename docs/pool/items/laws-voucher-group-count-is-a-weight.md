---
id: laws-voucher-group-count-is-a-weight
title: "The school voucher's counted-group records hold a weight where the people count belongs"
area: laws
kind: bug
priority: 3
size: S
status: merged
standard: 2
claimed-by: claude/pool-laws-voucher-group-count-is-a-weight
pr: #8543
blocked-on:
source: added with npm run pool -- add
after:
lead: laws-effects
model: sonnet
effort: low
root: rc8-law-judged-by-paperwork
checked: fable 2026-11-10
claimed-at: 2026-11-11T03:48:39.785Z
merged-at: 2026-11-12T18:51:03.371Z
---

**What.** The school voucher law's applied records for counted groups put a weight in the `count` field, which every reader takes as the number of people the group stands for (`src/core2/law-reach/group-b-money.ts (line 1521)`, found by the health-schools helper, Oct 25). In the health-schools year run in Uehling, Nebraska (seed 5e27b0c4196fd3a8) the voucher's group records say 310,500 people, where the same town's SNAP group record says 16. The matrix's reach cells and anything that sums people under a law then overstate the voucher's reach by orders of magnitude. Seen: the reach count on the voucher bill card (310,500 people where it should say how many).

**Cause.** Found in code: src/core2/law-reach/group-b-money.ts (line 1521, in the voucher payer after `voucherShare`) records `count: Math.max(1, Math.round(weight))`, where `weight` is the flow weight, not the group's people.

**Fix.** Write the number of people into the voucher group record count and test it against the group's size.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted group is read by every engine with the same rule as a full person, times its count, so the count must be people.

**Done when.** A second session, not the builder, plays the health-schools year in Uehling, Nebraska (seed 5e27b0c4196fd3a8) and sees the voucher's counted-group records carry the number of people the group stands for, a voucher reach of the same order as the town's counted population, by record id; a test asserts the count against the counted group's own size in a drawn place.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b-money.ts

**Notes.** From the laws lead, Oct 25, on the health-schools helper's report.
