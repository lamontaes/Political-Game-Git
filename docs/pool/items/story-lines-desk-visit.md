---
id: story-lines-desk-visit
title: "A sponsor or a lobbyist at the executive's desk is written again from pattern C38, and the reply that signs or vetoes says so"
area: words
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/story-lines-after-office-3
pr:
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: CTO, Nov 18 13:47Z on the Story thread (issue 9750), the order for after office; pattern C38 (docs/story/scene-patterns.json)
checked:
---

**What.** A mayor or governor with a passed bill on the desk is visited by its sponsor, who asks for a signature, or by a lobbyist, who asks for a veto. The player's reply can sign or veto the bill through the desk. The cut of Nov 17 left one line of this scene, so it did not play. Seen: the desk visit after a bill passes, for a player who holds an executive office.

**Cause.** Design: the lines were written before Nov 15 and deleted by the cut (`docs/current.json`, replaced list, Nov 17); `src/director/scene-talk.test.ts` skips `desk-visit` by name in `CUT_PURPOSES` until its lines return. The twelve reply keys under `acts.sign` and `acts.veto` in `src/director/data/purpose-arcs.json` must exist for a reply to sign or veto.

**Fix.** Write the scene again from pattern C38 as rows in `data/english/parts/scene-talk.json`: the visitor's request by who they are (`for` or `against`) and the deadline, the player's questions answered from the bill's record (what it does, what it costs, who voted against it and why), bargains by cost and opposition, and the twelve act replies, each naming the act it does. `desk-visit` leaves `CUT_PURPOSES`.

**Time box.** 3 hours.

**Rules.** The player says only what they chose (scene-standard rule 12): a reply that signs or vetoes names the act. No hand-written player text in code. Every scene is built from a real-lives pattern (owner, Nov 18).

**Done when.** A second session, as a mayor in a drawn place, plays the desk visit for a passed bill, signs it with one reply and, in a second life, vetoes it with another, and the bill's record shows the act; the English guards hold no new red; every new reply pair and narration line has a fresh reader's verdict.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/scene-talk.test.ts

**Notes.** Nov 18 (Story): written by a Sonnet helper and read by the Story lead (four replies removed: two bargains that asked to see a bill work before it is signed, two agrees that agreed to nothing); 50 pairs and 6 narrations judged by fresh readers, every plant caught.
