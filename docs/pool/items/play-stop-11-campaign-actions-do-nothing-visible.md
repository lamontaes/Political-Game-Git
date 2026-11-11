---
id: play-stop-11-campaign-actions-do-nothing-visible
title: "Give a speech, Ask for an interview and Call donors show nothing and raise nothing"
area: elections
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: claude/pool-play-stop-11-campaign-actions-do-nothing-visible
pr: #8262
after:
blocked-on:
standard: 2
model: sonnet
effort: low
root: rc2-done-from-records
source: added with npm run pool -- add
lead: play-first
milestone: play-first
checked: fable 2026-11-10
claimed-at: 2026-11-11T04:14:43.704Z
branch: claude/pool-play-stop-11-campaign-actions-do-nothing-visible
merged-at:
---

**What.** After filing for Anson City Council on the v0.22.10 release, Give a speech made its button disappear and nothing else happened, Ask for an interview added a line and nothing more, Call donors left "$0.00 raised", Hold an event stayed grayed with no reason, and only Knock on doors showed a scene. Child -a is done (PR 6787) and -b is dropped as a twin of play-first-13-campaign-screen-to-mock-b (done); a grayed action now shows its reason from the records on its button. What is left is a second session's replay of the finish line.

**Cause.** Design: the owner's Nov 3 ruling (AGENTS.md, "How every session works", step 5): nothing is done until a second session replays its finish line on main. The fix is on main under child -a and play-first-13-campaign-screen-to-mock-b; the actions are in src/bench/campaign.ts and src/core2/modules/campaigns.ts. Not replayed in a game.

**Fix.** Nothing is built here. A second session replays the finish line below on main in the running game, records the result with `npm run pool -- seen`, and, if a step still fails, reopens the item with what was seen and files the failing part as its own item.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: each campaign action moves money, people or views and the player sees the result. This is a game, not a spreadsheet: a campaign day is told as a scene through the director and the English engine. Look before you ask: the owner's installed-build acceptance this item used to wait on is replaced by the second-session rule (AGENTS.md step 5), so nothing is asked of him. Ask why: the replay records the screen, the place and seed and the record id behind what it shows.

**Done when.** A second session (not the builder) starts the bench in a drawn place (place and seed named), files for a local seat, and in the first week after filing uses Give a speech, Ask for an interview and Call donors, taking a screenshot of each result at 1440x900: each shows a scene or a result line, Call donors can raise money from a named person (record id in the proof), and a grayed action says why. The Oct 24 repro was Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213 (the Oct 24 playtest place). Recorded with `npm run pool -- seen`.

**Waits on.** Nothing. What it was blocked on is done; what is left is a second session's check in the running game (skill seen-in-game).

**Files.** src/bench/campaign.ts, src/core2/modules/campaigns.ts, src/bench/play.mjs

**You will see.** Each campaign action shows what happened, or why it cannot.

**Screenshot.** The Campaigns screen after each action, from a drawn place, with the place and seed under it.

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:05, 16:06; screenshots 49, 50, 53, 54, 55. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was laws. Split Oct 24 into play-stop-11-campaign-actions-do-nothing-visible-a and play-stop-11-campaign-actions-do-nothing-visible-b, each four hours or less; the CTO sets this item done when the last part is done. A grayed campaign outing (Knock on doors, Hold an event, Ask for an interview, Call donors) now shows its reason from the records on its button, in the play-stop-25 fix on branch claude/play-stop-25-door-count (speed lead, Oct 25); this item's "a grayed action says why" can cite it once that lands.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:03 UTC) on branch claude/pool-play-stop-11-campaign-actions-do-nothing-visible.

Released by next (2026-11-11): no push to claude/pool-play-stop-11-campaign-actions-do-nothing-visible since 2026-11-10 23:04 UTC, more than twice its 2-hour time box. Continue on branch claude/pool-play-stop-11-campaign-actions-do-nothing-visible and pull request #8262.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 03:06 UTC) on branch claude/pool-play-stop-11-campaign-actions-do-nothing-visible.

Released (2026-11-11): Replayed by API on main (Indio Hills, CA, place seed 1cc574fd5e0997f2e017845121fcd8a6e28a462123d6e45cbfda333bd972d4ce; filed for the US House seat first after 3 weeks): doors returns a scene (backdrop door-knocking-suburban); interview returns an interview record; speech begins with opener choices; event and forum are unavailable with the reason eventMoney (price 36791 minor, cash 0); calls and donor meeting returned named people each with a reason line (not-warm, no-spare) and raised 0 in week one, so 'raise money from a named person' was not seen in this place. Browser screenshots not taken; pool seen refuses a claimed item. Continue on branch claude/pool-play-stop-11-campaign-actions-do-nothing-visible and pull request #8262.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 03:18 UTC) on branch claude/pool-play-stop-11-campaign-actions-do-nothing-visible.

Released (2026-11-11): Replay-only item needing a filed candidate and each campaign action in the running game; not replayed by me; pool seen refuses non-merged items. Continue on branch claude/pool-play-stop-11-campaign-actions-do-nothing-visible and pull request #8262.

Claimed by next for sonnet-13d3 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 04:10 UTC) on branch claude/pool-play-stop-11-campaign-actions-do-nothing-visible.

Released (2026-11-11): Replay-only item (Fix: nothing is built); needs a second session in the running game with screenshots, and pool seen refuses a claimed item; released twice already. Continue on branch claude/pool-play-stop-11-campaign-actions-do-nothing-visible and pull request #8262.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 04:14 UTC) on branch claude/pool-play-stop-11-campaign-actions-do-nothing-visible.
