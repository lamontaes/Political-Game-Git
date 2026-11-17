---
id: words-relation-greets-other-asks
title: "Greets that remember an earlier ask play on a donor's ask, a job favor, a hearing and an appointment"
area: words
kind: wiring
priority: 3
size: M
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
source: Words second reader, Nov 15 (class H: a line is stamped only when seen played in place)
claimed-at:
checked: words builder A 2026-11-15
---

**What.** Four greets ("You helped me once. I haven't forgotten.", "You came through for me before. So I came to you.", "You told me no last time. I'm asking anyway.", "I know what you said before. Hear me out.") play only at office hours (constituent-help), the one ask class H could show played. The same earlier-reply facts reach the donor's ask, the job favor, the hearing ask and the appointment offer, which open with the plain greet. Seen: a donor who gave, was put off, and comes back says so in their own greet.

**Cause.** Found in code: `relationFacts` and the scene packet carry `asked-before`, `helped-before` and `refused-before` into every purpose (src/director/purpose-scene.ts tie block), and the bank's greets for those four purposes were taken out of class H (#9444) because none was seen played at the head. The stagings differ: donor-ask from a campaign gift, favor-job from a `work.job-lost` call, hearing-ask from `bill-held-in-committee`, appointment-offer from the executive's act.

**Fix.** For each purpose, stage a first scene from its own producer in a played world, play a real reply, stage the second from its producer, print the second scene (greet, statement, replies) at a named place and seed, and put the greets back on the purposes shown. On the appointment offer, a refused-before greet needs the earlier no to have been to the same offer; a greet there says "asking" only when the speaker brings their own request. The `asked-before` greet ("I came to you before. Nothing came of it.") needs a fact that says the same matter, not any earlier ask between the two.

**Time box.** 4 hours for one Sonnet session; push what passes and stop.

**Rules.** No dice: the records decide. Replace, never layer: the greets go on the existing open-greet parts, not a second set. Seen: each greet is printed in its second scene at the head before it ships.

**Done when.** At Sheridan WY, seed 7 (named in the test), each purpose's second scene is printed with its greet, the earlier reply's record id and the packet facts; a purpose that cannot be shown stays off. A second session checks the same on main at a drawn place from all 56.

**Waits on.** director-relation-passed-between (#9444).

**Files.** data/english/parts/scene-talk.json, src/director/purpose-scene.ts
