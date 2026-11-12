---
id: play-stop-06-texas-shows-local-income-tax
title: "Issues shows a 37 percent local income tax in Texas"
area: laws
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/pool-play-stop-06-texas-shows-local-income-tax
pr: #8357
after:
blocked-on:
standard: 2
model: sonnet
effort: low
root: rc2-done-from-records
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-11-11T08:04:05.615Z
checked: fable 2026-11-10
branch: claude/pool-play-stop-06-texas-shows-local-income-tax
---

**What.** Politics, then Issues in Anson, Texas on the v0.22.10 release read "Local income tax rate 37% top rate". Texas has no state income tax and Anson no local one; 37 percent is the federal top rate shown under a local label, so a player choosing what to run on would believe the town taxes income at 37 percent. The fix is merged (commit 6029ce3efe and PR 6111, which name a rate's government from the budgets where no seat names it, in src/bench/government.ts). The item stayed open only for the owner's installed-build check, which the second-session rule replaces; the Texas no-income-tax row was never confirmed in a game.

**Cause.** Design: the owner's Nov 3 ruling (AGENTS.md, "How every session works", step 5): nothing is done until a second session replays its finish line on main. The fix is on main in src/bench/government.ts (the rate's government is named from the budgets where no seat names it). Not replayed in a game.

**Fix.** Nothing is built here. A second session replays the finish line below on main in the running game, records the result with `npm run pool -- seen`, and, if a step still fails, reopens the item with what was seen and files the failing part as its own item.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the tax rows come from the place's law records at each level and are labeled by the level that sets them. Ask why: each number is traceable to the law in force it shows. Look before you ask: the owner's installed-build acceptance this item used to wait on is replaced by the second-session rule (AGENTS.md step 5), so nothing is asked of him. Ask why: the replay records the screen, the place and seed and the record id behind what it shows.

**Done when.** A second session (not the builder) starts the bench in a drawn place in a state with no income tax (place and seed named) and in one with an income tax, opens Politics, then Issues, and takes a screenshot of each at 1440x900: the first shows no state or local income tax row, and in both every rate is labeled by the government that sets it, each traceable to its law record id. The Oct 24 repro was Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213 (the Oct 24 playtest place). Recorded with `npm run pool -- seen`.

**Waits on.** Nothing. What it was blocked on is done; what is left is a second session's check in the running game (skill seen-in-game).

**Files.** src/core2/modules/laws.ts, src/core2/data/legislature/bill-catalog.json, src/core2/data/laws/starting-law.json, src/bench/government.ts, src/bench/play.mjs

**You will see.** In a town with no income tax, Politics, then Issues shows no income tax line, and in any town each rate names the government that sets it.

**Screenshot.** Issues in two drawn places, with the place and seed under each.

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:57; screenshot 27. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was effects.

Sent back 2026-10-26 from PR #6111 (branch play-first/play-stop-06-texas-shows-local-income-tax): Merging current main conflicts in src/bench/government.ts and src/bench/play.mjs; resolve code on this branch and drop its main-only PROGRESS.md hunk under the October25 ruling.; finish on that branch, merge main into it first.

Acceptance audit 2026-10-27 from PR #6111: repaired implementation merged by Merger1 at caf4b9926aa60fc7ddab11d30d09abac5fc682a5; old conflicts cleared, no new code failure alleged. The original owner installed-build screenshot remains unrecorded, and the Oct25 CTO ruling says that owner check closes this item later. Keep original acceptance OPEN; this session claims no own runtime gate or merge. Audit comment6432467537.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-10 23:01 UTC) on branch claude/pool-play-stop-06-texas-shows-local-income-tax.

Released (2026-11-10): Replay passed in Abbott TX and Acalanes Ridge CA (details on #6111), but pool seen needs status merged; CTO to flip it and record the check. Continue on branch claude/pool-play-stop-06-texas-shows-local-income-tax and pull request #6111.

Claimed by next for sonnet-cc77 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:12 UTC) on branch claude/pool-play-stop-06-texas-shows-local-income-tax.

Released (2026-11-10): Replayed on main 269789a282, could not record: pool seen refuses a claimed item. issues-levels.browser.mjs passes at 1440x900 in Anson, Texas (no state income tax) and Fresno, California (income tax): every rate on Politics Issues names who sets it and none is shown for a level that levies none. Places by key 4803372 and 0627000, seed issues-levels. Continue on branch claude/pool-play-stop-06-texas-shows-local-income-tax and pull request #6111.

Claimed by next for sonnet-cc77 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:15 UTC) on branch claude/pool-play-stop-06-texas-shows-local-income-tax.

Released (2026-11-10): Replayed already (Anson TX and Fresno CA pass issues-levels.browser.mjs); pool seen refuses claimed items. Continue on branch claude/pool-play-stop-06-texas-shows-local-income-tax and pull request #6111.

Claimed by next for sonnet-cbfb (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:19 UTC) on branch claude/pool-play-stop-06-texas-shows-local-income-tax.

Released (2026-11-10): replay test passes on two seeds; needs a running-game session for pool seen, no code change. Continue on branch claude/pool-play-stop-06-texas-shows-local-income-tax and pull request #6111.

Claimed by next for sonnet-cbfb (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:22 UTC) on branch claude/pool-play-stop-06-texas-shows-local-income-tax.

Released (2026-11-10): partial in-game replay (6 random places); seed and place names not captured, needs a full seen check. Continue on branch claude/pool-play-stop-06-texas-shows-local-income-tax and pull request #6111.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:56 UTC) on branch claude/pool-play-stop-06-texas-shows-local-income-tax.

Released (2026-11-10): Already replayed twice with a pass (sonnet-fd29, sonnet-cc77); pool seen cannot record it while the item is claimed, so the CTO must flip it to merged and record the check. Continue on branch claude/pool-play-stop-06-texas-shows-local-income-tax and pull request #6111.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:57 UTC) on branch claude/pool-play-stop-06-texas-shows-local-income-tax.

Released (2026-11-10): Nothing a builder can build: replay already recorded on the PR, or its lines are under data/english/parts (Story only); released so the claim is not held. Continue on branch claude/pool-play-stop-06-texas-shows-local-income-tax and pull request #6111.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:58 UTC) on branch claude/pool-play-stop-06-texas-shows-local-income-tax.

Released by next (2026-11-11): no push to claude/pool-play-stop-06-texas-shows-local-income-tax since 2026-11-10 23:01 UTC, more than twice its 2-hour time box. Continue on branch claude/pool-play-stop-06-texas-shows-local-income-tax and pull request #8357.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 04:04 UTC) on branch claude/pool-play-stop-06-texas-shows-local-income-tax.

Released (2026-11-11): Replayed headlessly in drawn places; evidence is on the item's PR; not a played check with screens. Continue on branch claude/pool-play-stop-06-texas-shows-local-income-tax and pull request #8357.

Released (2026-11-11): Replayed on main 0dacfab: Anson TX (seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213) shows Federal 37% and State 0% with no local row; Burlington VT (seed income-tax-seed-1) shows Federal 37% and State 8.75%; the cause no longer holds and the item needs status merged before seen. Continue on branch claude/pool-play-stop-06-texas-shows-local-income-tax and pull request #8357.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 08:02 UTC) on branch claude/pool-play-stop-06-texas-shows-local-income-tax.

Released (2026-11-11): Replay on main 0dacfab passed (Anson TX and Burlington VT, see issue 7365); nothing to build, and the cap is on. Continue on branch claude/pool-play-stop-06-texas-shows-local-income-tax and pull request #8357.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 08:04 UTC) on branch claude/pool-play-stop-06-texas-shows-local-income-tax.
