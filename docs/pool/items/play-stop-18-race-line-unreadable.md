---
id: play-stop-18-race-line-unreadable
title: "The campaign's 'What the race turns on' line is unreadable"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #6104
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** On Politics → Campaigns in the v0.22.10 release, after a few weeks of knocking on doors the block "What the race turns on" reads "Doors 172 · +105 · −67 · Retold 86 · +57 · −16". Nothing says what plus and minus mean, what "Retold" is, or whether I am winning. There is no poll result, no opponent and no count of votes needed. I expected a plain sentence about how the race stands and who I am running against.

**Rules.** Serves LAW.md §4, Scenes and conversations; LAW.md §8, Dev-speak. No hand-written player text: the race summary comes from the English engine from the campaign records. Ask why: each number names what it counts.

**Done when.** The owner does the same steps on the next build and is not stopped: after a month of campaigning, the Campaigns screen says in plain words how many voters were reached, how many moved toward or away, who the opponents are and what a poll would cost. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** After a month of campaigning, Campaigns says in a plain sentence how many voters you reached, how many moved toward you or away, and who you are running against.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/campaign.ts, src/bench/play.mjs, src/bench/data/controls.json

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:05, 16:12; screenshots 53, 61. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was m0-m2.
