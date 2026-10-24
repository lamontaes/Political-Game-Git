---
id: play-stop-10-two-unemployment-rates-one-night
title: "The opening night gives two different unemployment rates, 4.1 and 4.4 percent"
area: world
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: effects
milestone: play-first
---

**What.** On the first evening of the v0.22.10 release, the President's speech line reads "The unemployment rate is 4.1 percent." The news panel on the same night ends "The unemployment rate is 4.4 percent. Good night." Nothing says one is national and one is the region. A week later News shows "NATION · 2025-01 Unemployment 4.1%" and "REGION · 2025-01 unemploymentPct 4.4". I expected one rate, or each labeled with where it applies.

**Rules.** Ask why: every number on screen says where it comes from, and two rates on one night name their place. No hand-written player text: the sign-off line comes from the English engine with the scope in the fact packet.

**Done when.** The owner does the same steps on the next build and is not stopped: on the opening night, every unemployment rate shown names its scope (the nation, or the state or region), and two rates are never shown as the same thing. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/director/opening-story.ts, src/bench/opening.ts, src/bench/economy.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:53; screenshot 12. Lead: effects (CTO, Oct 24; play-first order docs/work-orders/play-first-2026-10-24.md).
