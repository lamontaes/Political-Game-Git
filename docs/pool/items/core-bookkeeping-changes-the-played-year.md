---
id: core-bookkeeping-changes-the-played-year
title: "Turning bookkeeping on changes what people do in a played year"
area: core
kind: bug
priority: 1
size: M
status: in-pr
claimed-by: account lead thread 86yqt4
pr: 9343
blocked-on:
source: Hall test red on the train, Nov 14 (thread on #9276's fold)
claimed-at:
after:
lead: speed
standard: 2
model: opus
effort: medium
root: none
checked: account lead 2026-11-14
---

**What.** Bookkeeping is a debug switch (AGENTS.md, "Keep it simple"): it must not change what happens. It does. Edgar, Wisconsin (5522550), seed edgar-petition-1, one year from the opening on the train head ce166298: run as play (tsx, bookkeeping off), 31 people know Edgar Neighbors United's hall and 28 are members (three outsiders, person_6f1a81b9c75e1f33, person_071a3be732ec504e, person_2b73b44fa7a48cb6); run with `CORE2_BOOKKEEPING=1` (as every vitest test runs), 31 know it and all 31 are members. The same split shows on 9b7f0213 and 1747525 with #9276 applied. Tests prove a world that play never runs. Guards: every test that builds a played world, since vitest turns bookkeeping on.

**Cause.** Found in code: measured at Edgar, Wisconsin (5522550), seed edgar-petition-1, by diffing every act of a play run against a bookkeeping run day by day. Two reads differed. (1) `dependents` in `src/core2/modules/people.ts` held a person's relatives who need care for the whole day in a WeakMap keyed by the person's record. On day 1 (2025-01-21) person_0ac4764205321d33's rows were made at the morning's work attendance, before the health module gave relative person_0ac4754205321b80 a condition (care need 0 to 0.95). Play kept the morning rows and the person rested; bookkeeping's attendance (`work-attendance.ts`, `batch.map(people, id, nextActor)`) replaces the person's record with a copy, the cache missed, and the person cared for the relative. (2) With that fixed, the runs split on 2025-05-08: bookkeeping runs the drives engine's `predict` for every cause holder daily (`drives.ts`), and its offer round took the week's shortlist of ties to visit (`weeklyContacts`) on 2025-05-05; play first looked on 2025-05-08, so person_55b24a7791db6ad3 visited person_1211428ee6df2d5d in play and cared for person_1211418ee6df2baa with bookkeeping. The choice cache (`kindLean`) was checked first and changes nothing.

**Fix.** Read the relatives' care need fresh on every call (no day cache), and mark a prediction's offer round so a provider keeps nothing past the call (`OFFER_ROUND_PREDICTION`); the week's shortlist is taken at the person's own act in both modes.
**Time box.** 4 hours for one opus session.

**Rules.** Ask why: the first day the two runs differ is named by record id and the read that differs, before anything is changed. Bookkeeping is a debug switch (Keep it simple), so turning it on must never change what anyone decides.

**Done when.** A test pinned to two named places (Edgar, Wisconsin, 5522550, seed edgar-petition-1, and Denver, Pennsylvania, 4218888, seed cb7367e1) builds each played world twice with buildBenchWorld, bookkeeping off and on, runs a short stretch of days (the lead's word, Nov 14: "days, not a year") and finds the same records day by day; the same check over 200 days at two places and a year at Edgar shows the same records; and a second session, in a drawn place and seed, plays a year in the running game with dev mode and sees the same people join the same groups in both modes.

**Waits on.** Nothing.

**Files.** src/core2/modules/people.ts, src/core2/modules/drives.ts, src/core2/life.ts, src/core2/types.ts, src/core2/bookkeeping-same-records.test.ts
