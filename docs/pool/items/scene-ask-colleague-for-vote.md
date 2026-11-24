---
id: scene-ask-colleague-for-vote
title: "The player asks a colleague for their vote the evening before a close roll call: a scene with the player as the asker"
lead: director
milestone: play-first
area: words
kind: feature
priority: 1
size: M
status: done
claimed-by: claude/director-player-asks-for-a-vote
pr: #6460
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T00:17:57.681Z
---

**What.** Every scene type the director stages casts the player as the one asked (src/director/data/situation-types.json); none lets the player ask. The legislature now writes a vote-ahead record the evening before a floor vote in the player's chamber: when a bill would fail, its sponsor asks the members it needs, nearest the line first (askBeforeTheRoll in src/core2/modules/legislature.ts, branch claude/ask-before-the-roll for legislature-ask-before-the-roll-moves-the-vote). The asked member's answer, a scene.reply on that record with personIds [asked, asker], is a pull their position reads at the roll and their vote cites (replyPull). When the player is the sponsor, the records name the colleagues the player would ask, but no scene lets the player make the ask, so the owner's model (Oct 14: convince one member to switch) is still out of reach.

**Rules.** An effect is a read, not a record: the colleague's answer is written as a scene.reply citing the vote-ahead record, asked first, so the legislature's existing reader counts it. No dice: the colleague's answer comes from their own position, ties and traits, never a roll. One rule, all 56 places: any chamber the player sits in, town or state.

**Done when.** In a buildBenchWorld drawn place with a seed named in the PR body, the player sponsors a bill short of votes, and the evening before its floor vote a scene stages with the player asking a member the vote-ahead record names; the member answers from their own reasons, the answer is recorded as a scene.reply citing the record, and the member's recorded vote at the roll cites it in replyIds, shown by a test and a bench screenshot at 1440x900.

**Files.** src/director/data/situation-types.json, src/director/purpose-scene.ts, data/english/parts

**Notes.** Filed Oct 27 by the laws-and-effects lead from legislature-ask-before-the-roll-moves-the-vote: the engine half (the record and the read) is on claude/ask-before-the-roll; this is the scene that lets the player make the ask.

**Time box.** 4 hours.

**You will see.** The night before the vote on your bill, you ask a colleague who is against it for their vote; they answer from where they stand, and the next day's roll call shows how they voted and why.

**Screenshot.** The ask with the player asking, and the roll call after it, from a drawn place.
