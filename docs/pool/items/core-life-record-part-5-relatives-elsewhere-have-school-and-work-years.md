---
id: core-life-record-part-5-relatives-elsewhere-have-school-and-work-years
title: "The life record, part 5: a relative who lives elsewhere has their school years in town and their work since"
area: people
kind: stopgap
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
effort: medium
root: design-life-record
source: split from core-life-record by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
---

**What.** A relative who grew up in the player's household and moved away opens with a birth year and little else, unless something has happened to them in play. The household's own records already say where they went to school and when they left. This part builds their school years in town and their work since from those records, when they are opened.

**Cause.** Measured: Agana Heights, Guam, seed 170bfc65-a2ed-43db-9c8f-3665dac576a4: the player's 20-year-old sister reads "Born in 2004" and nothing else. Found in code: the stopgap SG-P15-kin-light-past (src/core2/data/stopgaps/p15.json) says relatives outside the town are not run through the years before the start; `schoolHistoryFor` (src/core2/past-school.ts line 176) and `pastWorkFor` (src/core2/past-work.ts line 896) are not called for them.

**Fix.** When a relative elsewhere is opened, build their schooling in the household's town up to the year they left, and their work since in the place they live, with `schoolHistoryFor` and `pastWorkFor`, from the seed, the same every time. They stay a few facts until opened (skill `lives`). Clear the stopgap.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No dice: the school and work years are made from the seed and the household's records, with no roll deciding an outcome. Two-level population and skill `lives`: no fill-in until opened or met. A filled-in person matches what the household's records already say (the school the player's siblings attended, the year of the move). No dice.

**Done when.** A second session starts the game in Agana Heights, Guam with the seed above on main and opens the player's sister: her card shows schooling in town and the year she left, the same way twice. It then does the same for one relative elsewhere in a drawn place it names with its seed.

**Waits on.** Nothing. The life record's steps it waited on are on main (pull requests #8115 and #8139, which holds #8123).

**Files.** src/core2/past-school.ts, src/core2/past-work.ts, src/core2/opening-kin.ts, src/core2/data/stopgaps/p15.json
