---
id: play-news-and-metrics-count-the-towns-jobless-differently
title: "The paper says eight people are looking for work while Metrics says 22, and the paper's rate fits neither"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: sonnet
effort: medium
root: rc2-done-from-records
source: "Playtester P3, Nov 13, 2026 (crew line #8928)"
checked:
claimed-at:
---

**What.** On Sunday, December 20, 2026, the North Hyde Park Register's lead story (News, then the Register tab) reads 'Unemployment down in North Hyde Park, to 5.1%. The unemployment rate in North Hyde Park fell to 5.1%, from 8.2%. That leaves eight people in North Hyde Park looking for work.' On the same day, Politics then Metrics, under 'Your town', shows 'People at work 211, People looking for work 22, Jobs open 11'. By Metrics' own counts the rate would be 22 of 233, or 9.4 percent, and 5.1 percent of 233 would be about 12 people. So the three figures come from three different counts. Seen: the Register's lead story and Metrics' Your town rows, read the same day.

**Cause.** Found in code: the three figures read three counts. (1) The paper's 'eight people' is `month.unemployed` from the world-metrics month row (src/bench/printed-words.ts, line 1349). src/core2/modules/world-metrics.ts (line 132) builds it by adding 1 for each row in the jobs engine's `seekers` and `countedSeekers` tables whose `employed` is false. That counts a counted resident once, not by its household weight, and leaves out seekers who already have a job. (2) Metrics' 'People looking for work 22' is townJobsPanel in src/core2/modules/world-panels.ts (line 52). It counts every row in the same two tables, employed or not, and weighs a counted resident by its weight (one model, two tiers). (3) The paper's 5.1 percent is the outcome web's `labor.unemployment-pct` measure, which divides by `residentsEmployed`, a third denominator. Measured: North Hyde Park, Vermont, seed a6b481a5-c6c9-432b-8cca-c0463c518da8, main 9ebc7c89 (Playtester P3, Nov 13, 2026). The live dev Trace was not read; the bench was restarted before it could be.

**Fix.** Settle on one count of the town's jobless, which is the jobs engine's seekers who are not employed, each counted resident weighed by its weight, as the rule for counted groups requires. Have world-metrics' month row, the web's rate and Metrics' row all read that one function, so that the paper's number, its percentage and the Metrics row agree. If 'looking for work' on Metrics is meant to include people with a job who are looking, give that row its own label rather than share the jobless figure's.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: a counted resident counts by its weight in every reader. Every figure is traceable in dev Trace to the same rows, and no blend or wider area stands in for the town (the owner's Metrics rulings). No speed cost: speed:year before and after.

**Done when.** A second session plays a drawn place, named with its seed, past a month whose paper runs the unemployment story on main. The paper's jobless count, its percentage and Metrics' row agree to within rounding, each traced to the same seeker rows. A test fails on main's three counts.

**Waits on.** Nothing. The Metrics plan's orders on townEmployed and townSeekers (orders 5 and 2) touch the same counts, so check with whoever holds them first.

**Files.** src/core2/modules/world-metrics.ts, src/core2/modules/world-panels.ts, src/bench/printed-words.ts
