---
id: words-hostile-call-after-a-declined-interview
title: "A reporter's hostile call after the official declined the outlet's interview"
area: words
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: design-words-machine
source: words-machine part 2 review (#9130), Words lead ruling, Nov 14, 2026
claimed-at:
---

**What.** When an official turns down an outlet's interview, the outlet's reporter can call about the refusal. The Words lead wrote two hostile asks for that call and parked them because no cause opens it yet: "{outlet} asked you to sit down. You said no." and "You wouldn't talk to {outlet}. Why not?"

Seen: the reporter's call in a talk after the player turns down an interview.

**Cause.** Design: docs/design/words-machine.md (a line plays only where the record makes it true) and the Words lead's ruling of Nov 14, 2026 on #9130. The press interview's causes (src/director/data/situation-types.json, type press-interview) are the vote, a signing or veto, a veto override, an introduction, a bill held in committee and a published interview the official did not sit for in a scene (press.ts `publish`, record `interview-published`, which carries the answers). A refusal is written by press.ts `refuse` (status "declined", reason "candidate-declined") and answered only by `snubbed` (the outlet's staff may hold a grudge). No situation cause reads it, so no reporter calls about it, and the two lines above have no spot where they are true.

**Fix.** Give the refusal a record the director reads: emit an `interview-declined` event from `refuse` (facts interviewId, outletId, candidateId), add it as a seventh press-interview cause (opener reporter, opening greet) and have purpose-scene.ts set a `declined-interview` fact from it. Add the two parked lines to data/english/parts/scene-talk.json as press-comment.hostile state asks requiring `outlet` and `declined-interview`, excluding `bill`, with a third from the Words lead so the spot holds three. Whether the call plays hostile stays with the variant's reads, as for every other cause.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** A line plays only where the record makes it true; the Words lead writes and reads the third line. Replace, never layer.

**Done when.** In a played world at a drawn place (name the place and seed), an official who declines an interview gets a reporter's call within the week whose ask is one of the three lines, with the refusal record's id in the scene's record ids; the published-interview asks never play on it. A second session sees it in the running game: in dev mode, an official who declines an interview gets the reporter's call, and its first ask is one of the three lines.

**Waits on.** nothing.

**Files.** src/core2/modules/press.ts, src/director/data/situation-types.json, src/director/purpose-scene.ts, data/english/parts/scene-talk.json, a test beside src/director/press-comment-variants.test.ts (new).
