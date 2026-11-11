---
id: play-no-vote-moment-when-cannot-vote
title: "Election day offers no voting moment to a player who cannot vote"
area: play
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-play-no-vote-moment-when-cannot-vote
pr: #8496
after:
blocked-on:
standard: 2
model: sonnet
effort: low
root: none
lead: play-first
milestone: play-first
source: 'owner, Nov 9, batch 2 voice note (cto/voice-batch-2-part-1:docs/coordination/voice-notes/2026-11-09-batch-2-part-1.md): "3.2 shouldn''t even be in there. It just shouldn''t let you do it if you can''t vote."'
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:41:29.789Z
branch: claude/pool-play-no-vote-moment-when-cannot-vote
---

**What.** When the player lives outside the town whose race is counted (an eviction, a move), election day still stages the voting moment and narrates "There's no ballot for you here today. You no longer live where this race is voted." The owner graded that line out and asked that the game not offer the vote at all when the player cannot vote (voice note of Nov 9, batch 2: "It just shouldn't let you do it if you can't vote."). The election-day scene should skip the vote ask for a player with no polling visit, and the day should go straight on to the count.

**Cause.** Found in code: `electionDay` in src/bench/election-night.ts (lines 166 to 190) sets `away: !visit` for a player with no polling visit and still asks, using `electionDayLine` with the `vote-away` move (or `vote-none`). The `vote-away` move is in data/english/parts/scene-talk.json (line 1093) and in the grade files under data/english.

**Fix.** When there is no polling visit, leave the vote ask out of the day's lines and let the day go on to the count. Delete the `vote-away` and `narrate-vote-away` moves from data/english/parts/scene-talk.json, and their rows in the grade files under data/english, if nothing else reads them. The bank is the Words line's: put `Review: words` on the pull request for the deletion.

**Time box.** 1 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the fix removes a moment and writes no new words. Wire to the world: whether the player can vote comes from the polling visit the election engine already keeps, never from a new flag. Replace, never layer: the dead bank move goes in the same change.

**Done when.** A second session (not the builder) plays a drawn place's election day (place and seed named) for a player who moved out of town before it, and the day shows no vote ask and no vote-away line and goes on to the count; the same session plays the day for a player who lives in town and still gets the ask. A test over the election-day lines covers both players, and a screenshot at 1440x900 of the day for the player who moved away shows no voting choice.

**Waits on.** Nothing.

**Files.** src/bench/election-night.ts, data/english/parts/scene-talk.json, data/english/part-grades.json

**You will see.** On election day after moving away, the game tells you how the count went without asking you to vote.

**Screenshot.** The election-day panel for a player who moved away, with no voting choice.

**Notes.** Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 02:41 UTC) on branch claude/pool-play-no-vote-moment-when-cannot-vote.
