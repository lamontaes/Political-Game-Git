---
id: play-no-vote-moment-when-cannot-vote
title: "Election day offers no voting moment to a player who cannot vote"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: play-first
milestone: play-first
source: 'owner, Nov 9, batch 2 voice note (cto/voice-batch-2-part-1:docs/coordination/voice-notes/2026-11-09-batch-2-part-1.md): "3.2 shouldn''t even be in there. It just shouldn''t let you do it if you can''t vote."'
---

**What.** When the player lives outside the town whose race is counted (an eviction, a move), `src/bench/election-night.ts` still stages the voting moment and narrates "There's no ballot for you here today. You no longer live where this race is voted." The owner graded that line out and asked that the game not offer the vote at all when the player cannot vote. The election-day scene should skip the vote ask for a player with no polling visit, and the narration should move on to the count.

**Rules.** No hand-written player text: the fix removes a moment, it writes no new words; the `vote-away` lines are already held by his grades. Wire to the world: eligibility comes from the polling visit the election engine already keeps, never from a new flag.

**Done when.** A test plays a drawn place's election day for a player who moved out of town before it and shows no vote ask and no `vote-away` line in the day's scene, while a player who lives in town still gets the ask; the `vote-away` bank move is deleted if nothing else reads it.

**Time box.** 1 hour.

**You will see.** On election day after moving away, the game tells you how the count went without asking you to vote.

**Screenshot.** The election-day panel for a player who moved away, with no voting choice.

**Files.** src/bench/election-night.ts, data/english/parts/scene-talk.json
