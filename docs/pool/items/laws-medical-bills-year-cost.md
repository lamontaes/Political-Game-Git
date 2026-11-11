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
pr:
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

**Cause.** Measured: `npm run speed:year` alternating base and head in Ringgold, Louisiana (+3 percent and +19.5 percent in year 4), and a profile of Long Hill, Connecticut, seed m7b: about 21,300 bill rows put per month in `billMedicalCare` (src/core2/medical-bills.ts, line 794).

**Fix.** Cut the per-row put and copy of bill rows and the journal postings the payments make for counted households, and keep why fields only for full households and the people the player deals with. Prove the records proof is unchanged.

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
