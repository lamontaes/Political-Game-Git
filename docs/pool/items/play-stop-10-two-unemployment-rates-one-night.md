---
id: play-stop-10-two-unemployment-rates-one-night
title: "The opening night gives two different unemployment rates, 4.1 and 4.4 percent"
area: world
kind: bug
priority: 1
size: S
status: done
claimed-by:
pr: #6105
blocked-on: world-unemployment-rate-names-its-area
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** On the first evening of the v0.22.10 release, the President's speech line reads "The unemployment rate is 4.1 percent." The news panel on the same night ends "The unemployment rate is 4.4 percent. Good night." Nothing says one is national and one is the region. A week later News shows "NATION · 2025-01 Unemployment 4.1%" and "REGION · 2025-01 unemploymentPct 4.4". I expected one rate, or each labeled with where it applies.

**Rules.** Serves LAW.md §3, The opening and speeches; LAW.md §11, The world on screen makes sense. Ask why: every number on screen says where it comes from, and two rates on one night name their place. No hand-written player text: the sign-off line comes from the English engine with the scope in the fact packet.

**Done when.** The owner does the same steps on the next build and is not stopped: on the opening night, every unemployment rate shown names its scope (the nation, or the state or region), and two rates are never shown as the same thing. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** On the first night every unemployment rate names where it applies, and the speech and the news never give two rates as if they were one.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/director/opening-story.ts, src/bench/opening.ts, src/bench/economy.ts, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:53; screenshot 12. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was effects.

Sent back 2026-10-25 ~22:50 UTC from PR #6105 (branch play-first/play-stop-10-two-unemployment-rates-one-night, head 0d926d292bf7, main NOT merged: conflicts in code src/director/opening-story.ts plus banks and PROGRESS.md): resolve the conflicts on the branch, unwrap the backticked body screenshots so they render, and it goes back in the queue once the owner says yes (OWNER SCREENSHOT NEEDED stands); finish on that branch, merge main into it first.
