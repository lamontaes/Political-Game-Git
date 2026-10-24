---
id: people-circle-turnover-too-low
title: "A person's closest ties almost never change: 2 to 4 percent of a circle is replaced in three years, against about 27 percent in the panel study"
area: people
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/quirky-ride-vrwwz4-turnover-fix
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T14:39:00.882Z
---

**What.** M0-07's turnover check (src/core2/tooling/m0-07-turnover-check.ts) pools every adult full person's five closest ties on the first day and asks how many are still among their five closest after three played years of the bench world. Mollenhorst, Volker and Flap (2014) found 48 percent of a Dutch adult's discussion partners and helpers still in the network after seven years, about 73 percent after three at a constant rate. The core keeps 95.9 percent in Fair Bluff, North Carolina (3722240, seed 0d1db17e428dddcbdaef4c08a0a53ff62d3f26b034b1c86635fa8d8f29f9db77), 98.3 percent in place 0464650 (seed b15beed42b2bb3154e5e44b4fbcb12766c806013385d86a88518b4879d1787b0) and 97.2 percent in Jamesville, North Carolina (3734320). Ties only fade by half-life, close ties keep being renewed by household and family contact, and new ties start too low to displace them.

**Rules.** No dice: a tie leaves someone's circle because of moves, deaths, new jobs, new partners and time apart, read from their own records, and the study's share only checks the town's total.

**Done when.** node --max-old-space-size=8192 --import tsx src/core2/tooling/m0-07-turnover-check.ts passes in the runner's drawn place and two more drawn places named with seeds, with the cause of the low turnover named by line in the PR and the change it makes; the check is unchanged.

**Files.** src/core2/closeness.ts, src/core2/life.ts, src/core2/data/parameters.json

**Notes.** TODO

Cause found Oct 24 by the M0-M2 lead's probe (Fair Bluff, North Carolina, 3722240, seed above, with a local guard around the three-year payroll crash below):

- Officials dominate the pool. Of 2,251 pooled ties, 2,040 (91%) belong to state and federal officials (tier calendar, id prefix official_), whose five closest ties are all coworker ties; 97% of them stay. Those ties are written once by colleagues() in src/core2/modules/officials.ts (about line 835) when an official is added. Nothing renews a tie while two people still serve together, a colleague leaving office changes nothing, and colleagues() also ties new members to rows that have already ended. Every tie fades by the same factor (src/core2/closeness.ts faded), so a uniform fade never changes the ranking, and an official's circle is frozen whatever the half-life. Officials have no family or friends modeled, so even with renewal their turnover is only the share of colleagues who leave office. Whether an official's circle should hold anyone outside the job is a design question for the government side.
- Residents: 165 ties, 82% kept. Family ties within the household at the start are 100% kept (62 of 62), other family ties 76%. A shared home builds hours up to about 6,400 (closeness 0.986; src/core2/closeness.ts steadyHours and towardSteady; src/core2/people.ts shareHomeTime, about lines 60-98), so someone who moves out needs about 15 years to drop out of the five.
- Ties to the dead stay: 49 pooled ties were to someone who died during the three years, and 43 of them are still among the five closest.
- Separately, current main stops any three-year world with "Payroll calendar lacks independently resolved job/person/employer owners" (src/core2/work-attendance.ts:439, through fillInPerson and hireStaff). That is jobs-counted-hire-other-employer-calendar, claimed on claude/counted-hire-own-calendar. The M0-07 check cannot run three years on main until it lands.
  Files to add: src/core2/modules/officials.ts.
