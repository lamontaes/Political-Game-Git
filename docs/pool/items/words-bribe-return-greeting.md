---
id: words-bribe-return-greeting
title: "Someone who offered you a bribe before, and was taken up or turned down, says so when they offer again"
area: words
kind: wiring
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: director-relation-passed-between
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Account lead, Nov 15 (the asked-before fact on a second bribe offer has no line that reads it and no played run)
claimed-at:
checked: words builder A 2026-11-15
---

**What.** A second bribe offer from the same person carries `asked-before` and, once the first was answered, `refused-before` or `helped-before` in its scene packet, and no greet in `data/english/parts/scene-talk.json` reads them for the bribe-offer scene type, so the second offer opens as if it were the first. Seen: a bribe offer a second time from the same person opens on a line that says they were turned down or taken up before.

**Cause.** Found in code: `relationFacts` (src/director/relation-facts.ts) reads every `scene.reply` record between two people, and `purposeScene` (src/director/purpose-scene.ts) puts the three facts in every packet; the two open-greet parts added by #9444 (you-helped-me-once, you-told-me-no-last-time) are used only by the constituent-help purpose (key favor-asked), so no bribe-offer line reads them. A played run of the class H proof at an earlier head showed the facts on a second offer (a bribe offer through `considerBribe`, answered through `replyInScene`), and the deleted played test did not ship a line.

**Fix.** Add a use of each open-greet part for the bribe-offer scene type (or a new part where the wording must differ: a man who offers money again says it differently from a resident asking for help), played at a named place and seed: the first offer from a resident of the player's town through `considerBribe`, answered by the player through `replyInScene`, the second offer composed by `purposeScene`; print the second scene (greet, statement, replies) and the earlier reply's record id. The Words lead owns the wording; the builder lists the lines it needs.

**Time box.** 3 hours for one Sonnet session; push what passes and stop.

**Rules.** No dice: the records decide. Replace, never layer: the greets go on the existing open-greet parts. Each greet is printed in its second scene at the head before it ships; a bribe is offered only by the game's own route, never a hand-made record. Nothing here changes who offers or what is offered.

**Done when.** At a named place and seed, a second bribe offer from the same person after a refusal and after an acceptance prints its greet, the earlier reply's record id and the packet facts; a case that cannot be shown stays off. The second reader stamps the lines at that head. A second session (not the builder) takes a bribe in the running game at a drawn place from all 56 (place and seed named), is offered another, and sees the greet.

**Waits on.** director-relation-passed-between (#9444).

**Files.** data/english/parts/scene-talk.json, src/director/purpose-scene.ts, scripts/words/relation-greets-replay.ts
