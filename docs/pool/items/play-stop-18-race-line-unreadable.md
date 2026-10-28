---
id: play-stop-18-race-line-unreadable
title: "The campaign's 'What the race turns on' line is unreadable"
area: play
kind: bug
priority: 2
size: S
status: done
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

Sent back 2026-10-25 ~22:35 UTC from PR #6104 (branch play-first/play-stop-18-race-line-unreadable, head 23d50c233a with main merged in): both body screenshots are wrapped in backticks so they render as code, not images, and OWNER SCREENSHOT NEEDED still awaits the owner's yes; unwrap the image tags and it goes back in the queue once the owner says yes; finish on that branch, merge main into it first.

Merger 0: Sent back 2026-10-26 from PR #6104 (branch play-first/play-stop-18-race-line-unreadable): Words-required singular/plural, non-numeral sentence openings, and warm/cool zero-case fixes are still absent at d0bef13179f759dee8acc38bff0b0779ce89b1a8 (campaign.ts 247–255 and campaign-standing.json 23, 67, 133); finish on that branch, merge main into it first.
Sent back 2026-10-27 from PR #6104 (branch play-first/play-stop-18-race-line-unreadable): code conflict with main in src/bench/play.mjs (the Campaigns row list, main's acts block beside the standing lines); finish on that branch, merge main into it first.

Fixer 6 (Oct 27): superseded by PR #6419 (standing sentences replace the per-act block; main merged).
