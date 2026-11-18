---
id: gov-world-governors-and-president-never-give-their-address
title: "World governors and the President never give their yearly address"
area: gov
lead: laws
kind: bug
priority: 3
size: M
status: in-pr
standard: 2
claimed-by:
pr: 9346
after:
blocked-on:
model: opus
effort: medium
root: none
source: "Account lead builder, Nov 14 (world address PR, coordinator's request)"
checked:
---

**What.** In a played world the governors' state of the state and the President's address are given only by the player's own character; world governors and the President give none, though a mayor's and county executive's now are (gov-world-officials-never-give-yearly-address). Seen: the news for a world governor's address in its season.

**Cause.** Found in code: src/core2/office-day-state.ts (the state kit's `address` act, due on its own date, line 479 and 1079) and src/core2/office-day-federal.ts (the `joint-address` stop) are registered acts for the controlled actor only; the local act `state-of-the-city` in src/core2/office-day-acts.ts does not cover them, each level having its own date rule.

**Fix.** Run the same custom-and-temperament decision (worldAddresses in office-day-acts.ts) for each level's own address date, by the state and federal kits' own handlers, so one engine decides and each level's act delivers. Prove it in one state and the federal level in a one-year world with and without, with the speed check (one decision per official per year).

**Time box.** 4 hours for one Opus session.

**Rules.** No dice; one engine per mechanic (the offices engine's acts, no second scheduler); cadence-and-summaries (a yearly event, never a daily scan); an effect is a read, not a record.

**Done when.** A one-year world at three drawn places (names and seeds in the PR) shows the state's governor and the President giving their address on its date, each by record id, and a second session sees the news or Journal read it in the running game.

**Waits on.** gov-world-officials-never-give-yearly-address merged.

**Files.** src/core2/office-day-state.ts, src/core2/office-day-federal.ts, src/core2/office-day-acts.ts

**Built.** The state kit schedules each world governor's State of the State on the module calendar from the state's own convening date plus the kit's days-after parameter (monthly step, no daily scan); the day's handler runs the kit's own `state-of-the-state` act. The federal kit gives the joint address on its date for a President the player does not control, through the same `deliverAddress`. Governors and the President give it every year: the State of the State and the joint address are a constitutional and customary duty, so no custom-and-temperament decision runs (only a mayor's varies, in worldAddresses). Seen in src/bench/world-state-address.test.ts at Edmore ND and Odessa WA through 2026-05-01: of 55 governors, 49 give it once on their state's own day (January to April 2026), 4 (ND, MT, TX, NV) have no session in 2026 by the session calendar table, and 2 (IN, whose 2026 session convened 2025-12-01, and the Marianas, a continuous body since 2025-01-13) had their address date in 2025, before this year's window; the joint address comes 2025-03-04. The January 2025 sessions convened before the world's first day: gov-opening-lacks-last-years-address. Both acts already print news through existing bank lines (headlines.office-act.name-gives-the-state-of-the-state, news.office-act.office-name-delivered-the-state-of-the-state-address, news.joint-address.*); no line was written.

**Notes.** Owner, Nov 14 19:27Z: 'And not just town, but country and state. Remember, it's all one simulation.'
