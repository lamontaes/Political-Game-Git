---
id: gov-sampled-legislator-seats-never-refilled
title: "Every place nightly: a sampled member of another state's legislature who leaves leaves a seat no one ever fills"
area: gov
kind: bug
priority: 2
size: M
status: done
claimed-by: claude/sampled-seats-refilled
pr: #6701
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T20:39:08.586Z
---

**What.** The Every place nightly's Seats check fails in all 56 places, on Oct 27 (run 40512841605) and Oct 28 (run 40706056832, run seed 5a7c867eec0d34f1). Each failure is a sampled seat of another state's legislature, for example seat:US-WA:lower:sample:Democratic:0 roster empty since 2025-02-21 in Sugar City, Idaho (seed 7fc7b53d5104). src/core2/modules/officials.ts builds those seats at the opening (the sample of members per chamber) and the vacancy engine in the offices module never opens a vacancy for them, so when the member dies, retires or resigns the seat stays empty until the run ends. Real legislatures fill such a seat by special election or by appointment, by each state's rule.

**Rules.** One engine per mechanic: the sampled seats are filled through the offices module's one vacancy engine and its rule rows, never a second filler for the sample. One rule, all 56 places: each state's vacancy method is a data row the engine reads, never a state named in code. No dice: who fills the seat is decided by the method and the people the engine already casts, not by a seeded pick.

**Done when.** npm run all-places -- --years 2 --seed 5a7c867eec0d34f1 --only US-ID,US-VA shows Seats pass in both places, and a test in a buildBenchWorld drawn place (place and seed named) follows one sampled legislator who leaves to the vacancy record and the official who fills the seat, by record id.

**Files.** src/core2/modules/officials.ts,src/core2/modules/offices.ts,scripts/core2-year/all-places-worker.ts

**Notes.** lead: wire-office-budgets-justice. Filed by the standing red-main owner Oct 28 16:25 UTC from the nightly's JSON. Read: OWNER-DECISIONS (through Oct 28 05:30 UTC), DECISION-REGISTER; searched docs/pool/items for roster empty, sample seat: only the done official-pay death item.

Oct 29 (CTO): set done; PR #6701 merged (the done flip failed while branch protection refused the flip job's push).
