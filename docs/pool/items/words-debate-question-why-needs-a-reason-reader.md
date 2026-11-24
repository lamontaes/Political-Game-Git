---
id: words-debate-question-why-needs-a-reason-reader
title: "The debate moderator can ask Why? once a reply can hold a reason"
area: director
kind: feature
priority: 3
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
root: none
source: owner's rules 111 and 113 on the debate at Lawrence MI (seed r2), Nov 15 2026
checked:
---

**What.** The debate moderator's "{rival} is for {about}. You're against it." now ends with "Is that still right?" because no reply the player is offered can give a reason. Once the sitting can hold a reason for the player's stand, the "Why?" wording comes back as its own line, and a reply to it gives the reason from the record.
Seen: the debate at a played place asks the player why they hold a stand and the reply they choose says the reason the record holds.

**Cause.** Found in code: the debate sitting builds its four replies in `answers` and `answerFacts` in src/director/sitting.ts (about line 336 to 375): each holds a side (`position`) and a flag set, never a reason. The only reader of what the player has done about a subject is src/director/vote-stand-facts.ts (line 13, `voted-yes` and `voted-no`), which holds votes and not why a stand was filed, and the reporter's-call thread's record reader (plan part 1b, /mnt/project-files/words-lead/regression/plan-replies-and-shapes.md) is the one to extend, not a second reader.

**Fix.** Extend the reporter's-call thread's record reader with the stand's reason (the platform line the player filed or the view the stand was drawn from, cited to its record), hand it to the sitting as a fact on each reply, and write the "Why?" question and reason replies placed by that fact. Nothing is added here until that reader is merged.

**Time box.** 4 hours for one Opus session with the Words lead's lines.

**Rules.** One engine per mechanic: extend the existing record reader, never build a second one. A reply states a reason only where the record holds it (rule 113). Review: words.

**Done when.** A second session plays a debate at three drawn places with fresh seeds where the player filed a stand on a question and sees the moderator ask why, a reply that gives the reason the filed record holds (the record id in the packet), and no reply that states a reason the record lacks.

**Waits on.** The reporter's-call thread's record reader (plan part 1b).

**Files.** src/director/sitting.ts, src/director/vote-stand-facts.ts, data/english/parts/conversation.json

**Notes.** The moderator's question was reworded to "Is that still right?" by the debate follow-up PR of Nov 15; the "Why?" lines were deleted then and come back with this item.
