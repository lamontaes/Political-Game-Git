---
id: opening-world-holds-causes-lived-before-its-start
title: "A world started after January 20 has nobody with a cause, so the people who would run on one never file"
area: elections
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: design-electorate-one-model
lead: governing
model: opus
effort: medium
source: Views thread, Nov 14 (measuring the rivals test for campaign-money-refit-after-views-carry-popularity)
---

**What.** A world opened on a later date has no causes formed before that date, so the people who would file for office on one never do. Its fields come out thin and one-sided. It holds for the town, the state and the country alike (owner, Nov 14, 19:27Z: "And not just town, but country and state. Remember, it's all one simulation."): a state or federal candidate's reasons to run come from the same drives and must also be lived before the opening. Seen: the candidates in a local race, and every test that opens a world close to the race it needs.

**Cause.** Measured: Marshfield, Massachusetts (2538820), world seed 75d9b7ad36560f47b03a252ae33001b88ec529e8f4871fa480acf053c7642a78, the township board seat 0 race on Oct 15, 2025 (`contest:seat:gus2025:208271:board:0:2025-11-04`).

- Opened Jan 20, three candidates file: leans -1.01, -0.20 and +0.11. The moderate files on a cause drive formed from a remark at the Feb 3 board meeting (`decideToRun`'s cause reason, from `src/core2/modules/drives.ts`).
- Opened Aug 1 or Sep 1, only the two liberals file, and they are opposed on 0 of 11 and 0 of 8 questions.
- Monument Beach, Massachusetts (2542670), seed fe201a3d055185f7cb3755ca2e4ab2b0014453280c5384e9778eddbad2130364, board seat 0 race: opened Jan 20, -1.29 against +1.07. Opened Jun 1, the +1.07 candidate never files.
- In 36 places drawn and opened Sep 1, 2025 and played to Oct 15, no local race had rivals on opposite sides.

A drive forms only from something the person perceives while the world runs (`perceive` in drives.ts). Nothing at opening gives anyone the causes a life before that date would have left.

**Fix.** At opening, each full person who would hold one starts with the drives that the world's own past records give them: the records dated before the start that the world already writes (the past view shifts in `src/core2/modules/views.ts`, past layoffs, past meetings and acts of the town's bodies). Give these to `perceive` with their own dates, so a drive's strength has faded by the opening day exactly as a lived one would. A counted resident's share of drives held (`countedDrivesHeld`) starts from the same rule, times its count, and people outside the town (the state's and the country's officials and candidates) start from the same rule at their own cadence. No new drive kinds, and no draw. If no past record exists for a kind of cause, record that in Notes; do not invent one.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places. No dice: a drive comes from a record the person lived. One model, two tiers.

**Done when.** A second session, on main, opens a played world (`buildBenchWorld`) at Marshfield MA (seed above) on Sep 1, 2025, and in the running game sees a candidate in the board seat 0 race on Oct 1 who filed on a cause, naming that drive's record id and the past record it came from. It then repeats this in a drawn place whose state holds races that fall, naming the place and seed, and sees a state or federal candidate whose cause was lived before the opening. A world opened on Jan 20 keeps its winners in a year-1 run at three places, within the speed rule. The pinned test `src/core2/candidate-platform-spread.test.ts` then opens late (Sep 1), runs near a minute, and still fails when platforms carry the country's view.

**Waits on.** Nothing.

**Files.** src/core2/modules/drives.ts, src/core2/modules/views.ts, src/core2/modules/candidacy.ts, src/core2/candidate-platform-spread.test.ts

**Notes.**
