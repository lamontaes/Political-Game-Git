---
id: words-no-quick-resolution-accusation-taken
title: "In the accusation scene, every reply offered gives in at once, with none that pushes back, deflects or raises the stakes"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: words-machine-part-3-checks-for-rules-that-judge-a-set-or-an-exchange
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: found by M5's no-quick-resolution reader on the train at 2190669e (#9365), Nov 15, 2026
---

**What.** In the accusation scene (conflict-accuse.taken/accusation), in the "taken" arc of an accusation, the accuser points to the firm on the bid list, and every reply the player is offered agrees at once. 3 reply set(s) failed no-quick-resolution when fresh reviewers read them:

- `0lk7hqknn09`: after "The firm is on the bid list in the packet. Page four." the replies are "Fine. The firm is on the bid list. I reported it, and I'll show you." / "I should have walked away before the money moved. I'm sorry.".
- `1rrb35pu0v0`: after "The firm is on the bid list in the packet. Page four." the replies are "Fine. The firm is on the bid list. I reported it, and I'll show you." / "I'm sorry, and I'll answer for it.".
- `2g3nxcpb3wf`: after "The firm is on the bid list in the packet. Page four." the replies are "Fine. The firm is on the bid list. I reported it, and I'll show you." / "I'm sorry. I got into something I couldn't get out of.".

Guards: data/english/judged/no-quick-resolution.json holds these ids as noes, and `npm run words:rules` lists them as gaps until the set changes.

**Cause.** Measured: `npm run words:pairs -- --rule no-quick-resolution` on the train at 2190669e built every reply set the composer can offer after a plea, press, request, confront, bargain or warning; fresh Opus reviewers with neutral-id plants judged them (list: /mnt/project-files/words-lead/no-quick-resolution/gaps.md). The scene's bank offers, at this step, only replies that concede, promise or apologize.

**Fix.** The scene's owner writes, in data/english/parts/scene-talk.json, at least one reply for this step that pushes back, deflects or raises the stakes, true to the scene's facts, so the player sees a real choice there. Story writes the line (owner, Nov 10); a reviewer judges the new set with `npm run words:review`, and the fold turns these noes to yes.

**Time box.** 2 hours for one Opus session.

**Rules.** No hand-written player text in code: the line goes in the bank. Four replies each move the talk somewhere (owner, Oct 15), and are four different answers (Oct 27). Ask why: each failing set is named by id with the reviewer's reason.

**Done when.** A second session judges the step's new reply sets with `npm run words:review` and sees them pass, then, in the running game in a drawn place it names with its seed, plays to this step of the accusation scene and sees a reply that pushes back, deflects or raises the stakes among the picks.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, data/english/judged/no-quick-resolution.json

**Notes.** Related: words-variants-accusation (the scene's own item).
