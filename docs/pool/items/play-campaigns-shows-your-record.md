---
id: play-campaigns-shows-your-record
title: "Campaigns shows the player's record in office when they run again: votes cast, bills passed or failed, promises kept or broken"
area: play
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: sonnet
effort: medium
root: rc7-player-cannot-drive
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-play-campaigns-shows-your-record
---

**What.** Path 11 of Lane 1 starts with the player seeing their own record on Campaigns when they run for re-election. The records exist (legislature roll calls, bills the player sponsored, promises and their status), and voters already weigh them, but the screen the player plans a campaign from does not show them, so the player cannot see what a rival will attack or what to run on. The section reads the same records voters read, worded through the English engine. The old src/bench/campaigns.ts no longer exists; the screen is `campaigns()` in src/bench/play.mjs fed by src/bench/campaign.ts.

**Cause.** Design: docs/roadmap/political-process-baseline.md (the Political Process shows a player's voting record to plan a campaign) and the golden path in AGENTS.md ('the next election uses the record'); the records exist in the legislature module and promises, and the Campaigns screen (`campaigns()` in src/bench/play.mjs, src/bench/campaign.ts) shows none of them.

**Fix.** Add a record section to Campaigns when filing again that lists the player's roll-call votes, sponsored bills with outcomes and promises with status, read from the same records voters read (src/core2/campaign-views.ts), worded by the English engine, each citing its record id in Trace.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model: the screen is a view of the legislature and promise records, never its own copy. No hand-written player text: labels and lines come from the English engine's banks (player-screen-text). Screen-to-mock: the section uses the shared controls. Agreement 1-4: Lane 4 owns the screen; Lane 1 supplies the record view.

**Done when.** A second session, in the bench with a New Game life that won a seat and voted, in a drawn place named with its seed, opens Campaigns when filing again and sees a record section naming its roll-call votes, its bills and their outcomes and its promises with their status, each line citing its record id, in a 1440 by 900 screenshot.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/campaign.ts, src/core2/campaign-views.ts

**Notes.** TODO

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 01:52 UTC) on branch claude/pool-play-campaigns-shows-your-record.

Released (2026-11-11): Needs a new record view (src/core2/campaign-views.ts has none; no reader of the player's roll calls, sponsored bills and promises for a screen) plus English-engine lines for each row, which are Story's under data/english/parts; not buildable by a builder alone in one pass. Continue on branch claude/pool-play-campaigns-shows-your-record.

Claimed by next for sonnet-8597 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 01:53 UTC) on branch claude/pool-play-campaigns-shows-your-record.

Released (2026-11-11): Same note as before. Continue on branch claude/pool-play-campaigns-shows-your-record.
