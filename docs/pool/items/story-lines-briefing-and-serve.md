---
id: story-lines-briefing-and-serve
title: "The emergency briefing and the ask to serve are written again from patterns B55 and A38"
area: words
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/story-lines-briefing-serve
pr: 10136
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: CTO, Nov 18 13:47Z on the Story thread (issue 9750), the order for after office; patterns B55 and A38 (docs/story/scene-patterns.json)
checked:
---

**What.** Two scenes the cut of Nov 17 left without lines. In the emergency briefing an executive's aide asks the player to declare an emergency for a disaster before a deadline; the player agrees, asks what it changes, declines or holds off. In the ask to serve the player asks someone to take a post or to run with them; that person agrees, asks why, or declines for a reason from their record. Seen: the briefing after a disaster for a player in an executive office; the ask to serve from the player's own menu.

**Cause.** Design: the lines were written before Nov 15 and deleted by the cut (`docs/current.json`, replaced list, Nov 17); `src/director/scene-talk.test.ts` skipped `emergency-briefing` and `serve-sought` by name in `CUT_PURPOSES` until their lines returned. The engine's `serve-sought` has the player asking, the reverse of pattern A38, where a colleague asks the player.

**Fix.** Write both scenes again as rows in `data/english/parts/scene-talk.json` from their patterns: the briefing names `{disaster}` and `{deadline}`; the ask names `{office}`, and its replies give the reasons the record holds (`reason-yes-*`, `reason-apart`, `reason-heard`, `reason-own-race`, `reason-own-seat`, `reason-stranger`). Both leave `CUT_PURPOSES`. The A38 direction (a colleague asks the player to serve) is a separate engine item.

**Time box.** 3 hours.

**Rules.** No figure aloud; every line of four words or more carries an insert from the record; the player says only what they chose (scene-standard rule 12). Every scene is built from a real-lives pattern (owner, Nov 18).

**Done when.** A second session, as a mayor or governor in a drawn place, sees the briefing after a disaster, declares with one reply and holds off with another in a second life; and, as a candidate, asks someone to serve and sees an answer with its reason; the English guards hold no new red; every new reply pair has a fresh reader's verdict.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/scene-talk.test.ts

**Notes.** Nov 18 (Story): written by a Sonnet helper and read by the Story lead (three replies removed, three reworded: one named the state where the briefing can be a town's, one tacked on the asker's name); 564 pairs judged by fresh readers, every plant caught.
