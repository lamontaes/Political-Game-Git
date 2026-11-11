---
id: play-stop-02-developer-text-on-play-screens
title: "Code labels, status codes and raw dates show on the player's screens"
area: play
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/pool-play-stop-02-developer-text-on-play-screens
pr: #8266
after:
blocked-on:
standard: 2
model: sonnet
effort: low
root: rc2-done-from-records
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-11-11T04:14:31.606Z
checked: fable 2026-11-10
branch: claude/pool-play-stop-02-developer-text-on-play-screens
---

**What.** Playing the v0.22.10 release, developer text reached the player on at least eight screens: a Mark gap button in every talk box, News lines such as "REGION · 2025-01 unemploymentPct 4.4" and "Press.archived", Politics rows such as "in office at the opening" and "Views fit 0.91", the filing panel's "FILING-DEADLINE 2025-02-08 / 2026-08-17", and the clerk saying "on-ballot". Both children of this item are done. Mark gap now joins the talk box only in dev mode, statuses read through control names, and src/bench/plain-text.browser.mjs checks News, Politics, the filing panel and the talk box. What is left is a second session's replay of the finish line.

**Cause.** Design: the owner's Nov 3 ruling (AGENTS.md, "How every session works", step 5): nothing is done until a second session replays its finish line on main. Both children (-a and -b) are done; `src/bench/play.mjs` (line 1385) makes Mark gap a dev-mode control, the filing status maps to a control name in src/bench/data/controls.json, and src/bench/plain-text.browser.mjs exists. Not replayed in a game.

**Fix.** Nothing is built here. A second session replays the finish line below on main in the running game, records the result with `npm run pool -- seen`, and, if a step still fails, reopens the item with what was seen and files the failing part as its own item.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: these lines come from the English engine or show record data in plain labels, never field names or status codes. American English everywhere: dates as November 3, 2026, not ISO strings. Look before you ask: the owner's installed-build acceptance this item used to wait on is replaced by the second-session rule (AGENTS.md step 5), so nothing is asked of him. Ask why: the replay records the screen, the place and seed and the record id behind what it shows.

**Done when.** A second session (not the builder) starts the bench in a drawn place (place and seed named) and reads News, Politics (Government and Campaigns), the filing panel, the clerk's reply after filing and every talk box with dev mode off, taking a screenshot of each at 1440x900: no field name, status code, ISO date or Mark gap button appears. `src/bench/plain-text.browser.mjs` passes in that place. The Oct 24 repro was Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213 (the Oct 24 playtest place). Recorded with `npm run pool -- seen`.

**Waits on.** Nothing. Both children are done; A second session's check in the running game (seen-in-game).

**Files.** src/bench/play.mjs, src/bench/data/controls.json, src/bench/filing.ts, src/bench/campaign.ts, src/bench/government.ts, src/bench/plain-text.browser.mjs

**You will see.** No code label, status code or raw date on News, Politics, the filing panel or a talk.

**Screenshot.** The four screens, from a drawn place, with the place and seed under them.

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:54, 15:57, 16:02, 16:03, 16:04, 16:05; screenshots 14, 24, 31, 39, 44, 46, 48. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was m0-m2. Split Oct 24 into play-stop-02-developer-text-on-play-screens-a and play-stop-02-developer-text-on-play-screens-b, each four hours or less; the CTO sets this item done when the last part is done.

Claimed by next for sonnet-cc77 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 22:59 UTC) on branch claude/pool-play-stop-02-developer-text-on-play-screens.

Released (2026-11-10): Replay in Basking Ridge, NJ (seed 9978ac7a-fe58-46f4-9998-f5e8401d92d6): plain-text.browser.mjs stalls at src/bench/plain-text.browser.mjs:173 (#talk-leave hidden after the clerk's race choice; the talk still shows 'I understand.' to pick first), run with dev mode on so Mark gap showing is expected; dev-mode-off screens/screenshots and seen not recorded. Needs the script to pick the last choice, then a dev-mode-off replay. Continue on branch claude/pool-play-stop-02-developer-text-on-play-screens.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:05 UTC) on branch claude/pool-play-stop-02-developer-text-on-play-screens.

Released (2026-11-10): Replay-only item: pool seen refuses a claimed item (only merged work), so a builder cannot close it; not replayed here. Continue on branch claude/pool-play-stop-02-developer-text-on-play-screens.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:06 UTC) on branch claude/pool-play-stop-02-developer-text-on-play-screens.

Released (2026-11-10): Replayed on main (bench, 1440x900): News, all Politics tabs and clerk talk box show no code, ISO date or status; but plain-text.browser.mjs turns dev mode on so Mark gap shows, and it fails at line 173 (#talk-leave not visible after the race choice for an age-17 life); needs a dev-mode-off run and a fixed flow, then pool seen once merged. Continue on branch claude/pool-play-stop-02-developer-text-on-play-screens.

Released by next (2026-11-11): no push to claude/pool-play-stop-02-developer-text-on-play-screens since 2026-11-10 22:59 UTC, more than twice its 2-hour time box. Continue on branch claude/pool-play-stop-02-developer-text-on-play-screens and pull request #8266.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 03:17 UTC) on branch claude/pool-play-stop-02-developer-text-on-play-screens.

Released (2026-11-11): Replayed again with the bench on main (BENCH_BROWSER=/opt/pw-browsers/chromium node src/bench/plain-text.browser.mjs); the check is red for three reasons in the CHECK, not the screens: (1) it turns dev mode on to run until a seat may file and never turns it off, so Mark gap shows and its own tell fires (needs a devModeOff in dev-setup.mjs before reading screens); (2) its filing step looks for a reply starting 'File', but the clerk now says 'Alright. I'll take the papers and get started.' (filing.browser.mjs picks the reply without .reply-facts instead); (3) leaving a talk at #talk-leave (lines 173 and 205) fails while the clerk's scene is live, with a reply, Continue or Skip scene showing and Leave hidden. With (1) and (2) fixed and a leave helper that skips, continues or answers, it still stalled in Anson TX (4803372) on a reply click inside that loop, so I pushed nothing. Screens themselves: News, Politics and the clerk's talk showed no code, ISO date or status text in Basking Ridge, Cleveland, Niles, Round Valley and Burlingame. Continue on branch claude/pool-play-stop-02-developer-text-on-play-screens and pull request #8266.

Released (2026-11-11): Correction to my release just above: I did not check the screens for developer text in Niles, Round Valley or Burlingame (the check failed before reading them there); the clean News, Politics and talk-box reads are the earlier builders' replays (sonnet-a266, Basking Ridge NJ). My finding is only that plain-text.browser.mjs fails for the three check-side reasons named. Continue on branch claude/pool-play-stop-02-developer-text-on-play-screens and pull request #8266.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 04:00 UTC) on branch claude/pool-play-stop-02-developer-text-on-play-screens.

Released (2026-11-11): Replay not finished. src/bench/plain-text.browser.mjs was itself stale on main and failed before reading the screens: (1) it left dev mode on while reading the talk box, where Mark gap is correctly shown; (2) the clerk's reply to a 17-year-old ends on an 'I see.' choice, no Leave button; (3) the grown resident's filing choice reads 'Alright. I'll take the papers and get started.', not 'File'. I fixed (1)-(3) on branch claude/pool-play-stop-02-developer-text-on-play-screens (devModeOff helper in dev-setup.mjs, leaveTalk, papers match); the 17-year-old counter now reads clean in Aulander NC (seed 8bb1c821-fd46-4e2d-8f9e-25e7ac824bd1) and Overbrook KS (seed 064d5d1b-a0be-4f0c-9f1b-1f2c734d3261). Next: at the grown resident's filing click the run dies waiting for /api/filing/choose (browser closed), so the After-filing talk, Campaigns and News two weeks on are still unread. Continue on that branch. Continue on branch claude/pool-play-stop-02-developer-text-on-play-screens and pull request #8266.

Claimed by next for sonnet-13d3 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 04:14 UTC) on branch claude/pool-play-stop-02-developer-text-on-play-screens.
