---
id: play-join-party
title: "The player joins a party from /play"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr: #4706
blocked-on:
source: "split from gov-next, Oct 16"
claimed-at:
---

**What.** The filing overlay lets the player pick a party label to file under, but there is no control to join a party, though the parties engine has `joinParty` (it records a tie that the party's loyalty and filing read). Add a join control on the politics sheet and the route, and show the party the player belongs to and how their views fit it. A player who never joins one files as unaffiliated, as now.

**Rules.** No hand-written player text: control names come from controls.json. Wire to the world: the tie is read by filing eligibility and the party's loyalty at the moment they decide.

**Done when.** In a drawn place and seed (named in the PR body) the player joins a party from /play, the tie record id shows on the sheet with the agreement figure, and filing under the party's label then passes eligibility; a browser spec walks the control.

**Files.** src/bench/handler.ts, src/bench/play.mjs, src/bench/filing.ts, src/bench/data/controls.json

**Notes.** Split from gov-next. The campaign day controls (doors, volunteers, donations, endorsements, ad, poll) already exist.

Sent back 2026-10-16 from PR #4706 (branch claude/play-join-party): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4706 (branch claude/play-join-party): Merging current main into claude/play-join-party conflicts in src/bench/data/controls.json, src/bench/play.mjs. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.
