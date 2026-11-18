---
id: words-own-view-back-reply-names-no-wage-or-employer
title: "The reply that gives the reason for a stand says the wage or the employer from the job record"
area: words
kind: bug
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
root: none
source: Words builder A, Nov 16 (pinning src/director/view-learned.test.ts, #9637; the third test is red on 8 of 9 seeds tried)
claimed-at:
checked: words builder A 2026-11-16
---

**What.** When the player asks someone with a job why they stand where they do, the reply is meant to say the hourly pay or the employer from the job record, and on most places it says neither: "Because the pay is thin, you. Do the math." The test was red at Scranton SC (4564600) on a random draw and on seeds a1, b2, d4, e5, f6, 07 and 18 of src/director/view-learned.test.ts's own-view test; it passes on seed c3. Seen: the reply to why a person stands where they do names the wage or the employer.

**Cause.** Found in code: the test's last check on the "own-view-back" composed line (src/director/view-learned.test.ts, the `subject.facts.wage` branch) expects the line to contain the wage text or the employer text; the composer picks an own-view-back-core piece (data/english/parts/conversation.json) that carries neither slot when the job has a wage, so the reply says "the pay is thin" with no figure or employer. Not yet traced to the exact piece: the builder reads the played line's parts and slots with dev mode's "Why these lines" panel (#9611) at a failing seed.

**Fix.** Name the failing piece from the panel, then give own-view-back-core a use that requires the wage or employer slot when the job has a wage (a fact gates, a figure never weights), or make the composer prefer a piece that carries the slot; no new line unless the Words lead asks for one. The pinned seed c3 stays; the test also runs the failing seeds above.

**Time box.** 3 hours for one Sonnet session at medium effort.

**Rules.** Never lower the assertion. People say how it feels, never the figure, except the hourly pay the record carries as the reason (owner via the lead, Nov 12). Pinned places and seeds.

**Done when.** The own-view test passes at seeds a1, b2, d4, e5, f6, 07 and 18 as well as c3 (one test, a seed each, pinned), with the reply's wage or employer printed for each. A second session (not the builder) asks a person with a job why they stand where they do, at a drawn place from all 56 (place and seed named), and reads the wage or the employer in the reply.

**Waits on.** Nothing.

**Files.** data/english/parts/conversation.json, src/director/view-learned.test.ts
