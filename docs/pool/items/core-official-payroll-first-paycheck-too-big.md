---
id: core-official-payroll-first-paycheck-too-big
title: "official-salary-payroll test: a U.S. House member is paid 7,295,261 in one paycheck against a bound of 164,942 (Willow Creek, Alaska, seed 162056d164d81980)"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-payroll-test
pr: #5380
blocked-on: gov-dead-official-still-seated
source: added with npm run pool -- add
claimed-at: 2026-10-20T01:06:50.224Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Reproduced Oct 20 (claude, claude/political-game-pool-l9cym2) on clean main, correcting my first reading: `src/core2/official-salary-payroll.test.ts` fails in a random place on every run I made (three runs, three places: Deckerville, Michigan; Newcastle, Maine; Noank, Connecticut). The assertion is that paid plus owed matches the pay earned from the opening to the pay date within 1 percent; the title's "too big" is a guess, since the failure only shows the gap. Newcastle, Maine, seed 8b066a49a1c92e6e, `official:seat:US-TX:us-house:15`: a gap of 2,909,508 against 1 percent of earned of 164,942, so earned is about 16.5 million and the gap is about 17.6 percent, roughly two months of pay. Noank, Connecticut, seed ba25c2955a65ea43, `official:term:seat:US-CT:lower:071:0:2025-01-20`: a gap of 370,695 against a cap of 41,330, about 9 percent. A gap of about two months for an out-of-town House member matches the item `world-official-pay-not-caught-up-us-house` (PR #5008, in review), so this is probably that bug, not a new one; check this test against that PR's branch before anyone works it. The state House seat in Connecticut is not a federal seat, so it may be a second cause.

Findings Oct 20 (claude, claude/political-game-pool-l9cym2), not fixed. Three different failures of `official-salary-payroll.test.ts` on main, each in a random place. (1) A federal member who died in the year is measured as if paid to the pay date: Newcastle, Maine, seed 8b066a49a1c92e6e, `official:seat:US-TX:us-house:15` has `alive: false` and no paycheck after the December payday, so paid plus owed falls two months short; adding `&& api.state.people.get(row.personId)?.alive` to the measuring condition made both this seed and Noank, Connecticut (seed ba25c2955a65ea43, the same kind of case) pass. (2) A territory's delegate is expected to be paid by the territory's treasury but is paid by the outside federal government: Barrigada, Guam, seed 9770b75323bad22d, `official:term:seat:US-GU:us-house:at-large:2025-01-20`, expected `organization:treasury:US-GU` and got `organization:outside-government:US`; the test's list of federal offices names only `us-house`, not a delegate. (3) This item's own title, a U.S. House member paid 7,295,261 in one paycheck (Willow Creek, Alaska, seed 162056d164d81980), which I did not reproduce and which is the case in `gov-dead-official-still-seated` (#4991): the pay engine's `alive` check is the only guard. The skipped-when-dead fix covers only the first. Do all three together.
