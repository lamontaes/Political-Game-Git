---
id: words-relative-news-talk-second-turns
title: "A relative's news talk goes on past the first answer"
area: words
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: rc3-thin-life-record
source: Words lead ruling on the relative-news carry (#9124), Nov 14, 2026
checked: s3 2026-11-14
---

**What.** The talk where someone at home tells the player a relative died, is seriously ill or is in prison carries as one exchange: the telling, one reply, one answer, and then nothing more is offered (seen in three drawn places in the carry's proof, `lines.md`). The depth rule is that a scene is a tree: after the first answer there are at least two more turns on at least two branches, the branches end differently, and each ending writes something a later scene reads. Seen: the talk at home after a relative's news.

**Cause.** Design: `docs/design/words-machine.md` (a scene is a tree, not an exchange; Words lead, Nov 14, 2026). The carry (#9124) wires the telling and its answers through the composer but the answer back is a leaf; no second-turn move exists for `death-news`, `illness-news` or `prison-news` in `src/director/data/conversation-rules.json` (`replyMoves` ends at the answer), and nothing the talk ends on is written for a later talk to read (a tie's grief, a promise to call, a worry named).

**Fix.** After the answer, offer the player two or three follow-up replies by what was said (what the teller named, a bearing, the tie), each answered in its own wording; end the branches differently (the teller says what they will do about the funeral or the visit, or closes the talk); write the ending as a record the next talk with the house reads, through the conversation engine's own mechanism. The Words lead writes the lines after #9067 folds; no second talk system, no dice, no count or tally said in a scene.

**Time box.** 4 hours, Opus medium.

**Rules.** No dice; plain American English; a person says how it feels and never a figure; a name marks attention (at most one line of a talk); replace never layer.

**Done when.** In three drawn places (fresh seed, each named), a relative's news talk runs at least two turns past the first answer on two branches that end differently, and a later talk with the house names what an earlier branch ended on, by record id. A second session, on main, plays one of those places and sees the follow-up and the later mention.

**Waits on.** The conversation engine (#9067) and the eviction carry (#9120) folding into the train, so the follow-up moves are built on the one engine.

**Files.** src/director/data/conversation-rules.json, src/director/conversation.ts, data/english/parts/conversation.json

**Notes.** Filed on the #9124 branch (claude/words-carry-8959-family-news) at the Words lead's request.
