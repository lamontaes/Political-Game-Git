---
id: play-stop-02-developer-text-on-play-screens
title: "Code labels, status codes and raw dates show on the player's screens"
area: play
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/pool-play-stop-02-developer-text-on-play-screens
pr:
after:
blocked-on:
standard: 2
model: sonnet
effort: low
root: rc2-done-from-records
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-11-10T23:07:01.037Z
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
