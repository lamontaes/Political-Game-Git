---
id: core-official-payroll-first-paycheck-too-big
title: "official-salary-payroll test: a U.S. House member is paid 7,295,261 in one paycheck against a bound of 164,942 (Willow Creek, Alaska, seed 162056d164d81980)"
area: gov
kind: bug
priority: 2
size: S
status: blocked
claimed-by:
pr:
blocked-on: gov-dead-official-still-seated
source: added with npm run pool -- add
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Reproduced Oct 20 (claude, claude/political-game-pool-l9cym2) on clean main, not fixed: `src/core2/official-salary-payroll.test.ts` fails in a random place every run I made (three runs, three places: Deckerville, Michigan; Newcastle, Maine; Noank, Connecticut). Each time one official's first paycheck is many times the pay due: Newcastle, Maine, seed 8b066a49a1c92e6e, `official:seat:US-TX:us-house:15` paid 2,909,508 against a cap of 164,942; Noank, Connecticut, seed ba25c2955a65ea43, `official:term:seat:US-CT:lower:071:0:2025-01-20` paid 370,695 against 41,330. The failing seats are out-of-town officials. The same test passed alongside my other changes only when the drawn place's officials all paid under the cap, so it is a main failure, not one from any open PR of this session.
