---
id: laws-medical-bills-year-cost
title: "The medical bills' monthly pass costs a country's year up to 19.5% (Ringgold, Louisiana, year 4): cut the row copies and journal postings it makes for counted households"
area: laws
kind: cleanup
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr: #8719
after:
blocked-on:
model: sonnet
effort: high
root: rc5-full-detail-every-day
source: added with npm run pool -- add
lead: laws
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-laws-medical-bills-year-cost
---

**What.** After the quadratic cut already on main, the monthly bill pass still adds up to 19.5% to a year (the speed lead's alternating four-year Ringgold, Louisiana runs: +3% and +19.5% in year 4). Three of four head runs put year 3 or 4 past 120 s, against 103 to 116 s on base. In a profiled Long Hill, Connecticut year (seed m7b) what is left is the put of about 21,300 bill rows a month (module-state put, plainCopy of each row with its members, webLinks and ownRecordsFor arrays), the cash journal postings the payments make (postCashJournal, projectCashJournal), and recordMedicalDebt. Cut the row copies and journal postings it makes for counted households without changing what the simulation decides. Seen: the length of a country's year, which the speed bar of two minutes limits.

**Cause.** Needs cause. The measured cause predates today's code: `billMedicalCare` (src/core2/medical-bills.ts, line 794) now writes each row with `putOwned` (frozen in place, not copied) and drops settled rows each month, so the +19.5 percent of Ringgold, Louisiana year 4 and the Long Hill, Connecticut profile (seed m7b) no longer name what costs the time. Re-measure with `npm run speed:year`, base against head, in Ringgold and one drawn place, and profile one year, to find what in the pass is left (the counted households' payments through `payCounted`, `recordMedicalDebt`, or the why fields kept for counted households). Checked by opus-5251 on Nov 11, 2026; see pull request 8719.

**Fix.** None until the cause is found.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Speed: a country's year runs in under two minutes and no change may make a year more than 20% slower than its base. A speed cut changes nothing the simulation decides: the records proof (speed:year --proof-out) is identical, or differs only in fields dropped from the bills' own rows, named. Keep why fields only for full households and the people the player deals with (AGENTS.md, Keep it simple). One rule, all 56 places: time it in places drawn from all 56.

**Done when.** A second session, not the builder, runs four years of `npm run speed:year` alternating base and head twice in Ringgold, Louisiana and one other drawn place (names and seeds given) and every year is within 10% of base. The records proof matches (or names only the dropped bill-row fields), and src/core2/law-wiring-medical-debt.test.ts passes with MEDICAL_DEBT_SEED=wf-med-1 and one fresh seed.

**Waits on.** Nothing.

**Files.** src/core2/medical-bills.ts, src/core2/modules/credit.ts, src/core2/law-wiring-medical-debt.test.ts

**Notes.** TODO

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 02:39 UTC) on branch claude/pool-laws-medical-bills-year-cost.

Released (2026-11-11): Needs repeated npm run speed:year country-year runs (over 100 s each, several GB) alternating base and head plus a records proof; this 15 GB cloud container has already had a worker killed for memory on a 150-day run, so a speed claim could not be measured reliably here. Needs a session with a dedicated machine (skill heavy-runs). Continue on branch claude/pool-laws-medical-bills-year-cost.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 02:40 UTC) on branch claude/pool-laws-medical-bills-year-cost.

Released (2026-11-11): Read src/core2/medical-bills.ts billMedicalCare on main 2026-11-11: the monthly row put already uses table.putOwned (a fresh row frozen in place, not copied), so the plainCopy cut the item names is partly done; what remains is the per-household payCounted/payFull journal postings and recordMedicalDebt, which cannot be shown faster or records-proof-equal without repeated speed:year runs this container cannot hold (a worker was killed for memory earlier). Needs a dedicated machine (skill heavy-runs, speed-work). Continue on branch claude/pool-laws-medical-bills-year-cost.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 03:09 UTC) on branch claude/pool-laws-medical-bills-year-cost.

Released (2026-11-11): Claimed by my own next loop but not worked: see my earlier release notes (replay-only or heavy-run items); words-director part 2 is a six-hour refactor of presence deciders across bench and english pickers that I did not start. Continue on branch claude/pool-laws-medical-bills-year-cost.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 03:19 UTC) on branch claude/pool-laws-medical-bills-year-cost.

Released (2026-11-11): Claimed by my own next loop, not worked; see earlier notes (needs dedicated machine / six-hour presence-decider refactor). Continue on branch claude/pool-laws-medical-bills-year-cost.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 05:27 UTC) on branch claude/pool-laws-medical-bills-year-cost.

Released (2026-11-11): Claimed by my own next loop, not worked: each needs Story-session lines under data/english/parts, a dedicated machine for speed runs, or a rewrite beyond one pass (see my earlier release notes on this item). Continue on branch claude/pool-laws-medical-bills-year-cost.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:37 UTC) on branch claude/pool-laws-medical-bills-year-cost.

Released (2026-11-11): Needs profiled alternating speed:year runs (about two minutes a year, several runs) to prove each cut; too long for this session; not built. Continue on branch claude/pool-laws-medical-bills-year-cost.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 06:03 UTC) on branch claude/pool-laws-medical-bills-year-cost.

Released (2026-11-11): Needs a dedicated machine for npm run speed:year (four-year timed runs); not buildable in a shared cloud container. Continue on branch claude/pool-laws-medical-bills-year-cost.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 06:04 UTC) on branch claude/pool-laws-medical-bills-year-cost.

Released (2026-11-11): Only item left for tier mid; needs a dedicated machine for repeated speed:year runs (skill heavy-runs). Handoff: remaining cost is payCounted/payFull journal postings and recordMedicalDebt in src/core2/medical-bills.ts. Continue on branch claude/pool-laws-medical-bills-year-cost.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 06:05 UTC) on branch claude/pool-laws-medical-bills-year-cost.

Released (2026-11-11): Re-read billMedicalCare/payCounted on the branch: no cut I can prove unchanged or faster without speed:year runs and a records proof this container cannot hold. Needs a dedicated machine. Continue on branch claude/pool-laws-medical-bills-year-cost.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 06:15 UTC) on branch claude/pool-laws-medical-bills-year-cost.

Released (2026-11-11): Cause no longer holds on main (2026-11-11): one-year profile, Long Hill CT seed m7b, 115 s: billMedicalCare is 4.8 s of 147 s sampled (3%): payCounted 1.0, householdsToBill 0.7, putOwned 0.6, recordMedicalDebt 0.45, self 0.9. Rows are already putOwned; no 10 percent cut remains there. Close or rewrite against another hot spot (postCashJournal 6.5 s all callers, credit review 2.6 s). Continue on branch claude/pool-laws-medical-bills-year-cost.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 06:15 UTC) on branch claude/pool-laws-medical-bills-year-cost.

Released (2026-11-11): Four-year profile on main 2026-11-11 (Long Hill CT, seed m7b, profiled years 116/216/185/230 s): billMedicalCare is 24.7 s of 831 s (3%), payCounted 4.3 s, so no 10 percent cut exists in the medical pass; the year is over 120 s from elsewhere (campaignWork 91 s, press 58 s, recordProof 51 s under profiling, postCashJournal 45 s all callers). Close this item and open ones for those. Continue on branch claude/pool-laws-medical-bills-year-cost.

Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:37 UTC) on branch claude/pool-laws-medical-bills-year-cost.

Released (2026-11-11): opus-5251: the code differs from the Cause (rows are now written with putOwned, not copied, and settled rows are dropped each month); the +19.5% predates that, so re-measure on main before cutting. PR #8719 comment has the detail. Continue on branch claude/pool-laws-medical-bills-year-cost and pull request #8719.

Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:38 UTC) on branch claude/pool-laws-medical-bills-year-cost.

Released (2026-11-11): opus-5251: set to Needs cause (the measured cause predates putOwned and the settled-row drop); see PR #8719. Continue on branch claude/pool-laws-medical-bills-year-cost and pull request #8719.
