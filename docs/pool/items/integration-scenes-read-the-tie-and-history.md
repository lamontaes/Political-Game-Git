---
id: integration-scenes-read-the-tie-and-history
title: "A known person never gets a stranger's scene, and four replies are four answers"
area: director
kind: bug
priority: 1
size: M
status: done
claimed-by:
pr: #6412
blocked-on:
source: "Integrator (Opus), Oct 27, from the owner's v0.56.2 sitting (Salida, Colorado, as Carlos Washington)"
lead: director
milestone: play-first
claimed-at:
---

**What.** Brian Shah joined the campaign as a volunteer; two months later a cafe scene opened "You've been running into Brian Shah around town... Nice to see you. What do you do?" with four replies that were one answer reworded. The owner: "these scenes aren't making sense... These scenes have zero depth to them." Casting and line selection read the relationship record (its kind, how they met, what they did together): becoming-friends fires only for a person with no shared record, the conversation never asks a known volunteer or coworker what they do, and the four replies are four different moves, never one move reworded.

**Rules.** scene-standard (roles cast from the world, lines tie to the player); ask why: the scene's reason is a record. The finisher session and the words lead own the banks; this item owns the data path.

**Done when.** A test in a drawn place: a person on the player's campaign never opens a becoming-friends scene; the conversation with a known person offers no 'what do you do' ask; every offered set of replies has distinct moves; director tests pass.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** A volunteer you know talks to you like someone who knows you.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/director/scheduling.ts, src/director/data/situation-types.json, src/director/conversation.ts, src/director/ledger.ts

**Notes.** Coordinate lines with the finisher (Opus, English engine and scenes) and the words lead through the Words and scenes channel section. Owner, Oct 27, 4 PM Eastern: "Systems are being made for individually instead of linking everything together... The UI needs to be linked to the systems as it works... Sessions should not be building their own shit." Read: OWNER-DECISIONS (Oct 27, afternoon), DECISION-REGISTER, prior-rulings/words.md, LAW; searched docs/ for the subject.
Sent back 2026-10-28 from PR #6412 (branch claude/integration-ties-in-scenes): tie-history-scenes.test.ts hard-fails when a drawn place's volunteers are all kin (Newkirk NM seed c1ba9dc53f1eed201684:0); make it pass over such places; finish on that branch, merge main into it first.
