---
id: core-player-household-no-income
title: "A seeker with no work for a full year gets no job offer; check the jobs match for a long-term unemployed household head (Colebrook, New Hampshire)"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: found by a Claude session verifying core-player-money-spending in a played year
claimed-at:
---

**What.** In Colebrook, New Hampshire (place 3313700, seed cfa61ad11b9653ed75640a7ae2762a424b830ac48efd67c06f0e19580d907725, from January 20, 2025) the player's household (the player, 18, a 12-year-old, and the head, 41) has no earner. Its consequences do run: the head is registered as a job seeker from the opening (reason `opening-unemployed`), the $1,820 of cash is gone after the first month's bills, rent goes unpaid from March 1, 2025 (arrears of $564.49 a month on the lease), the lease ends on April 27, 2025 and the household moves away. What did not happen in a year: the seeker received no job offer (offers 0 at three, six and twelve months), no benefit paid them (no work history to claim on), and no entry in the journal records help of any kind. Check whether a year with no offer in a small town is the jobs match working (no open positions that fit, which should be a recorded reason) or a defect, and whether a player in such a household can see why.

**Rules.** No dice; an effect is a read; one rule, all 56 places; ask why: each month without an offer needs its recorded reason (no openings, skills, distance). Do not add a new form or sink; check OWNER-DECISIONS.md ("Why money exists for the player").

**Done when.** For the seeker in that place and seed, each month after the opening has a recorded reason for no offer, by record id, or an offer is made and answered from the person's own records.

**Files.** src/core2/modules/jobs.ts (matching), src/core2/modules/housing (eviction already ends the lease).

**Notes.** First thought a no-earner household did nothing; a deeper probe found the arrears, the lease ending and the move. The household with an earner is covered by player-money-year.test.ts. Probe notes: counted seekers table, finance contracts of the household, one year.
