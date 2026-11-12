---
id: screens-campaign-board
title: "Campaigns is one board: standing and polls, an inbox of requests, and a campaign team built from people you know"
area: play
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-screens-campaign-board
pr: #8391
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: sonnet
effort: medium
root: design-screen-principles
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:23:20.508Z
branch: claude/pool-screens-campaign-board
---

**What.** The owner ruled at 5 PM on Oct 27 that the campaign screen is one board. It carries an inbox of media requests and the like, and a campaign team the player builds from people they know and met in scenes, such as a partner or best friend as manager, as in The Political Process. The board itself now exists on main: src/bench/play.mjs builds a campaign-board with the race standing and the money. What is missing is the inbox and the team area, and the old Campaigns rows still sit beside the board. The owner sees the board before anything more is asked of him.

**Cause.** Design: docs/coordination/OWNER-DECISIONS.md, the Oct 27, 5 PM ruling (the campaign screen is one board), and docs/design/screens/principles-2026-10-27.md. The team record exists in the campaigns module: the volunteer-offered event (VOLUNTEER_OFFERED_EVENT, src/core2/modules/campaigns.ts line 2042) with role manager, shown by src/director/campaign-manager.test.ts; the board in src/bench/play.mjs reads neither.

**Fix.** Add the inbox (only records that exist: a debate invitation, an interview request, a donor's ask, each opening its scene) and the team area (people the player knows, read from the campaign's volunteer-offered rows and its manager) to the existing campaign-board in src/bench/play.mjs, replacing the old Campaigns rows. An empty inbox shows no heading. Words come from the English banks.

**Time box.** 6 hours.

**Rules.** Wire to the world: the inbox lists only requests a record holds and each opens its scene; the team reads the campaign record, one source per fact (owner, Oct 27, 4 PM), never a screen-side copy. No hand-written player text: words come from the English banks. Replace, never layer: the old Campaigns rows are deleted in the same change.

**Done when.** A second session, in a drawn place (name the place and seed), files for office and opens Politics, then Campaigns, on a restarted bench and sees one board with the race standing, an inbox listing at least the records that exist (or none, with no empty heading), and a team area listing people the player knows. src/bench/campaign.browser.mjs asserts it, and a 1440x900 screenshot is in the PR body for the owner.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/campaign.ts, src/bench/campaign.browser.mjs, src/core2/modules/campaigns.ts

**Notes.** OWNER-DECISIONS Oct 27, 5 PM (the campaign screen: one board). Needs the campaign-team record from the systems integrator (Integration channel section). lead: play-first. Filed by the screens designer.

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 00:23 UTC) on branch claude/pool-screens-campaign-board.
