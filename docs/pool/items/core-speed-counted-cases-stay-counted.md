---
id: core-speed-counted-cases-stay-counted
title: "Counted residents out of work are filled in when they bring a case to an official the player never sees, so full people double in four years"
area: core
kind: bug
priority: 1
size: M
status: merged
standard: 2
claimed-by: claude/cases-keep-counted-seekers-counted
pr: #8861
after:
blocked-on:
model: opus
effort: medium
root: rc5-full-detail-every-day
lead: speed
branch: claude/cases-keep-counted-seekers-counted
source: written by the speed lead from the Nov 11 counts (#7365)
merged-at: 2026-11-12T01:35:50.041Z
---

**What.** In South Hooksett, New Hampshire (key 3371220, seed s8333), full people grow from 1,961 to 2,921, 3,525 and 4,109 at the ends of years 1 to 4, while the counted population holds. Three in four fill-ins are counted residents out of work who bring a case to a local official's office hours (`bringCases`, src/core2/modules/constituent-cases.ts): 164 households in year 1, 179 in year 2. Every engine that walks full people slows with them: a campaign event's guest list, people acting each day, news, coverage and the collector. The two-level rule (owner, Oct 11, "Keep it simple") fills a counted person in when the player meets or clicks them, not when an official the player does not watch holds office hours. Seen: the game running; a year, and so a Week, takes less time, and the town's people the player meets are filled in as before.

**Cause.** Measured: South Hooksett, New Hampshire (3371220), seed s8333, main 972d0800, a counter in `fillInPerson` by caller: `bringCases` ← `officeHours` 164 and 179 households in years 1 and 2, of 224 and 243 fill-ins in all. With counted residents bringing no cases at all (an ablation), year 1 took 121 s against 184 s and kept 439,962 records against 549,949. Found in code: src/core2/modules/constituent-cases.ts `bringCases` calls `fillInPerson` for every counted seeker whose case reaches an official.

**Fix.** In `bringCases`, pick the official as before (`officialFor`). If the player watches that official (`keepsWhy`), fill the resident in and bring the case as today. Otherwise bring the case for the counted resident's id: the same case row, the `office.approached` event naming the official (the resident is in its facts, not its people), no tie, and the case made to the official by the resident's own lean (`makeCase` with `countedSpeakerLean`, as a speech carries a counted speaker). Resolution, referrals and the office's caseload read the case by id as before. The resident is filled in when the player meets them.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Keep it simple, two-level population: a counted person is filled in when the player meets or clicks them, and full detail is kept for the player and the people they deal with. One model, two tiers: the counted resident's case moves the official by the same rule a full person's does, with the counted lean the views engine keeps for them. No dice: who brings a case is still their own problem, traits and engagement. Speed: a country's year runs under two minutes in every year.

**Done when.** A second session, not the builder, runs the four-year world for South Hooksett, New Hampshire (key 3371220, seed s8333) on main and on the branch, one process at a time: full people after year 4 fall well below main's 4,109 and every year is faster. The same session plays a drawn place in the running game as an official with office hours, and sees counted residents' cases arrive on the Office hours desk as before (the `constituent-cases-counted` test passes in drawn places).

**Waits on.** Nothing.

**Files.** src/core2/modules/constituent-cases.ts, src/core2/modules/speech.ts, src/core2/modules/constituent-cases-counted.test.ts

Taken over by opus-5251 (Nov 11, the lead's call): pull request 8861 replaces #8738, built on that day's main. #8738's test failed because its resident was full from the opening (`countedSinceOpening` counts people the opening filled in), not because anything filled them in.
