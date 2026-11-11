---
id: play-stop-08-no-high-school-at-seventeen
title: "A 17-year-old has no high school; only a middle and an elementary school are listed"
area: core
kind: bug
priority: 1
size: S
status: blocked
claimed-by: claude/pool-play-stop-08-no-high-school-at-seventeen
pr: #8515
after:
blocked-on: jobs-and-study-shows-no-current-school
standard: 2
model: sonnet
effort: low
root: rc2-done-from-records
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-11-11T07:54:44.532Z
checked: fable 2026-11-10
branch: claude/pool-play-stop-08-no-high-school-at-seventeen
---

**What.** A life started as a 17-year-old in Anson, Texas on the v0.22.10 release listed "Anson Middle" and "Anson El" under school, no high school, and no enrollment in the senior year. It is implemented by play-teen-has-current-high-school (done; merged as 48d74a8b39). The Nov 4 check in the Notes (Anson, Texas, age 17) shows Who you are with School "Anson Public Schools" and Jobs and study reading "You went on to high school." What is left is a closing check by a second session in a drawn place, including whether a current high school should be named by its own name and not its district.

**Cause.** Design: the owner's Nov 3 ruling (AGENTS.md, "How every session works", step 5): nothing is done until a second session replays its finish line on main. The fix is merged under play-teen-has-current-high-school; the school history is written in src/core2/past-school.ts and shown by src/bench/card.ts and src/bench/words.ts. Not replayed in a game since the Nov 4 check, which found the school named by its district, not as "Anson High School".

**Fix.** Nothing is built here. A second session replays the finish line below on main in the running game, records the result with `npm run pool -- seen`, and, if a step still fails, reopens the item with what was seen and files the failing part as its own item.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN: a 17-year-old's school starts from the town's real schools and enrollment, marked as an estimate if needed. One rule, all 56 places: school age and grade come from age, not from the place. Look before you ask: the owner's installed-build acceptance this item used to wait on is replaced by the second-session rule (AGENTS.md step 5), so nothing is asked of him. Ask why: the replay records the screen, the place and seed and the record id behind what it shows.

**Done when.** A second session (not the builder) starts a new life at age 17 in a drawn place (place and seed named) and opens Who you are and Jobs and study with screenshots at 1440x900: a current high school or school is shown by a full name with no cut-off, and the history reads that the player went on to high school. The session reports whether the name shown is the school's or its district's. The Oct 24 repro was Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213 (the Oct 24 playtest place). Recorded with `npm run pool -- seen`.

**Waits on.** Nothing. What it was blocked on is done; what is left is a second session's check in the running game (skill seen-in-game).

**Files.** src/core2/past-school.ts, src/bench/card.ts, src/bench/words.ts

**You will see.** At 17, Who you are and Jobs and study show the school you go to now.

**Screenshot.** Both screens, from a drawn place, with the place and seed under them.

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:56; screenshots 20, 22. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was m0-m2.

Oct 25, 16:25 UTC (speed lead): the fix is in PR 6038 under `play-teen-has-current-high-school`, with bench screenshots and tests, as Merger 1 suggested on PR 6037. This item stays open, blocked on the owner's steps on the next installed build (its done-when); close it when the owner confirms.

Sent back 2026-10-25 ~21:30 UTC from PR #6038 (branch claude/play-stop-08-high-school, head b7173de4e3 with main merged in): every body screenshot is wrapped in backticks so none render as images; unwrap the image tags and it goes back in the queue; finish on that branch, merge main into it first.

2026-10-26 Merger 2: implementation PR #6038 merged at 48d74a8b3939f04b92f5399b506ec51ef607b83a with local tests and fresh bench browser proof. This owner-installed-build acceptance item remains open/blocked until the owner confirms; no installed-build acceptance is claimed.

Lane 4 check, Nov 4 (main b78f83fb42): New Game through the creator, Anson, Texas, age 17 (born 2007). Who you are shows School "Anson Public Schools"; Jobs and study reads "2013 You started school at Anson Public Schools. / 2019 You went on to middle school. / 2022 You went on to high school." No cut-off name and no missing high school. The school is named by its district, not "Anson High School", so this item is ready for a closing check against that one line.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:02 UTC) on branch claude/pool-play-stop-08-no-high-school-at-seventeen.

Released (2026-11-10): Replayed on main in two drawn places: history reads high school, name is the district's; seen refuses a claimed item, see handoff on PR 6038. Continue on branch claude/pool-play-stop-08-no-high-school-at-seventeen and pull request #6038.

Claimed by next for sonnet-cc77 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:05 UTC) on branch claude/pool-play-stop-08-no-high-school-at-seventeen.

Released (2026-11-10): Replayed on main 94969ad22a, not recorded as seen (pool seen refuses a claimed item; it needs status merged): Fort McDermitt, Nevada, seed c1b4258f-ab41-4038-b653-ca22b9a44c71, age 17, 1440x900: Who you are and Jobs and study read 'I started school at Fort McDermitt Public Schools. I went on to middle school. I went on to high school.' with no cut-off and no missing high school; the school is named by its district, not as a high school. Same in Platte Center, Nebraska. Ready for pool seen once the item is merged. Continue on branch claude/pool-play-stop-08-no-high-school-at-seventeen and pull request #6038.

Claimed by next for sonnet-cc77 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:07 UTC) on branch claude/pool-play-stop-08-no-high-school-at-seventeen.

Released by next (2026-11-11): no push to claude/pool-play-stop-08-no-high-school-at-seventeen since 2026-11-10 23:02 UTC, more than twice its 2-hour time box. Continue on branch claude/pool-play-stop-08-no-high-school-at-seventeen and pull request #6038.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 03:09 UTC) on branch claude/pool-play-stop-08-no-high-school-at-seventeen.

Released (2026-11-11): Replayed (details on #6038): history reads high school, but no current school is named by its own name; pool seen refuses non-merged items. Continue on branch claude/pool-play-stop-08-no-high-school-at-seventeen and pull request #6038.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 03:10 UTC) on branch claude/pool-play-stop-08-no-high-school-at-seventeen.

Released by next (2026-11-11): no push to claude/pool-play-stop-08-no-high-school-at-seventeen since 2026-11-10 23:02 UTC, more than twice its 2-hour time box. Continue on branch claude/pool-play-stop-08-no-high-school-at-seventeen and pull request #8515.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 07:24 UTC) on branch claude/pool-play-stop-08-no-high-school-at-seventeen.

Released (2026-11-11): Replayed headlessly in three drawn places: a 17-year-old's school history holds only an elementary start, named by its district; evidence on #8515; needs a played check and a cause. Continue on branch claude/pool-play-stop-08-no-high-school-at-seventeen and pull request #8515.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 07:28 UTC) on branch claude/pool-play-stop-08-no-high-school-at-seventeen.

Released (2026-11-11): Replayed headlessly in drawn places; evidence is on the item's PR; not a played check with screens. Continue on branch claude/pool-play-stop-08-no-high-school-at-seventeen and pull request #8515.

Claimed by next for opus-d23b (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 07:54 UTC) on branch claude/pool-play-stop-08-no-high-school-at-seventeen.
