---
id: core-life-record-part-6-the-past-holds-what-happened-between-people
title: "The life record, part 6: a person's past holds an earlier partner and a serious illness or injury, at real rates"
area: people
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: lives
model: opus
effort: high
root: design-life-record
source: split from core-life-record by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
---

**What.** The owner, Nov 8: "None of my history is simulated. I can't see anything that my character went through. No, a girlfriend or a car accident or college or whatever." The past now tells school, work and moves. Nothing in it happened between people or to a body.

**Cause.** Found in code: the writers of the past are src/core2/past-school.ts (`schoolHistoryFor`, line 176), src/core2/past-work.ts (`pastWorkFor`, line 896), src/core2/past-moves.ts, src/core2/past-elections.ts and src/core2/past-business.ts; none writes an earlier partnership that ended, or a hospital stay or serious injury before the start.

**Fix.** Research first (skill researcher): by age, the share of adults with an earlier marriage or long partnership that ended, and with a hospital stay or serious injury, from published tables, as rows in a parameter table with citations. Then, when a person is opened, their past gains these events from who they are (age, traits, the health record, the household they are in now), made from the seed so the same person always has the same past, with the town's totals checked against the researched rates. Each is a remembered event told by a bank sentence; name the spots for Story. An earlier partner is a named person kept as a few facts, never a full person until met. College is already told from the school record: confirm it in the pull request.

**Time box.** 10 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No dice: seeded generation of who exists is allowed; real rates check totals and never pick one person's outcome. Research calibrates the simulation and never adds a step to the player's life. Two-level population. Story writes every line (CTO, Nov 10). Nothing about a pregnancy is shown beyond what the world already shows (owner, Oct 20).

**Done when.** A second session, on main in a drawn place it names with its seed, opens ten adults' cards: at least one tells an earlier partner or a serious illness or injury from before the start, each with a year, and Trace on the sentence opens its record. The part's test prints the town's shares beside the researched rates.

**Waits on.** Pull requests 8115 and 8123 on main. Lines from Story for the spots the pull request names.

**Files.** src/core2/person-life.ts (new), src/core2/past-work.ts, src/core2/modules/partnerships.ts, src/core2/modules/health.ts
