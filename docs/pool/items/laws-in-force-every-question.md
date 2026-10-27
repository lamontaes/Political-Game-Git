---
id: laws-in-force-every-question
title: "One reader returns every law in force at each level for a place, read by the address and the Issues screen"
area: laws
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: laws-effects
source: CTO opening root-cause report, Oct 27
claimed-at: 2026-10-27T10:07:03.633Z
---

**What.** The only reader of laws in force returns 10 money series (lawHere, src/core2/modules/laws.ts:584-598). The starting-law records answer 121 policy questions per place (58 of them state powers), and nothing returns them as laws in force with their level and citation. So the opening address can name no law, and Issues lists only laws with a dollar amount. The owner's Oct 27 words: if there are 58 laws, there are 58 choices in the speech. Evidence: docs/reports/opening-root-cause-2026-10-27.md.

**Rules.** Wire to the world: the reader returns starting answers and laws enacted in play from the same law chain, and both the address and Issues read it by record id. One rule, all 56 places: levels come from question-powers.json, never a state named in logic. Speed: an index read, never a scan of history per day.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, the reader returns one row per policy question in force at each level with its citation and record id, a law enacted in play replaces its starting row the day it takes effect, and the opening and Issues each read at least one row by record id in that world.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**Files.** src/core2/modules/laws.ts, src/core2/policy-answers.ts, src/bench/government.ts

**Notes.** Filed by the CTO root-cause report of Oct 27 (docs/reports/opening-root-cause-2026-10-27.md). Lead: laws-effects. Reopened Oct 27 by the laws-and-effects lead: #6289 put the reader and the Issues half on main (merged 15:40), but the bot set the item done from its pr field although line 1 said "Touches"; the opening's read of `lawHere` is still open and is carried by `director-president-asks-within-powers`.
