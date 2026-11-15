---
id: core-bookkeeping-changes-the-played-year
title: "Turning bookkeeping on changes what people do in a played year"
area: core
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
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

**Cause.** Measured: Edgar, Wisconsin (5522550), seed edgar-petition-1, `CORE2_BOOKKEEPING=1` against bookkeeping off, one year from the opening on ce166298, 9b7f0213 and 1747525: the two runs differ by the year's end (above). Needs cause: the exact read is not found. First suspect, Found in code: `kindLean` in `src/core2/choice.ts` trusts its cache keyed by the traits object in play and re-checks it by checksum only with bookkeeping on, so a trait record changed in place (the trait-change module) is read stale in play only; `kindLean`/`leanBetween` in `src/core2/trait-decisions.ts` likewise takes another path when bookkeeping is on.

**Fix.** Find the first day the two runs differ (diff the durable log by day between a play run and a bookkeeping run of the same world), name the read, and make play read what bookkeeping reads (or drop the stale cache).
**Time box.** 4 hours for one opus session.

**Rules.** Ask why: the first day the two runs differ is named by record id and the read that differs, before anything is changed. Bookkeeping is a debug switch (Keep it simple), so turning it on must never change what anyone decides.

**Done when.** A test pinned to Edgar, Wisconsin (5522550), seed edgar-petition-1, builds the played world twice with buildBenchWorld, one year each, bookkeeping on and off, and finds the same memberships and the same durable log record ids on the year's last day; and a second session, in a drawn place and seed, plays a year in the running game with dev mode and sees the same people join the same groups in both modes.

**Waits on.** Nothing.

**Files.** src/core2/choice.ts, src/core2/trait-decisions.ts, src/core2/bookkeeping.ts
