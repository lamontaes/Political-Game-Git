---
id: words-sponsor-temper-reason-has-no-line
title: "A sponsor whose strongest reason is temperament asks for a vote with no reason"
area: words
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: Found by the bargaining thread (brief O) playing amount bills (#9310), Nov 14 2026
lead: words
standard: 2
model: opus
effort: medium
root: none
---

**What.** When a sponsor asks a colleague for a vote on their own amount bill, the request says the reason that weighs most for them (src/director/bargain-facts.ts `sponsorAmountFacts`, the `own-reason-<term>` fact). Five reasons have a line: their own view, the people back home, the party, the next election, the people the bill helps. Temperament (the position's `trait` term, mapped to `temper` in src/director/data/bargain-reasons.json) and their last vote (`consistency`, mapped to `last-vote`) have none, so such a sponsor says the plain request ("Can I count on you for SF 1?"). Measured at Iowa (1926400), seed cost1, 2025-03-10: of 48 senators who could sponsor SF 1, 6 have temperament as their strongest reason, 28 their own view, 5 the party, and 9 no reason above zero. Seen: the request line a colleague says when asking the player for a vote on their own bill.

**Cause.** Design: docs/design/words-machine.md (lines say only what the record holds). The reason lines were written for the reasons a person would say aloud. Temperament here is a member's taste for change measured against how settled the law is, which is a disposition, not a reason someone gives.

**Fix.** Keep the plain request for temperament: a person does not say "I like change" to ask for a vote. If a line is wanted, the Story session writes it, and it says only what the record holds: how long the law has stood unchanged. The last-vote reason gets the same review. The Words lead rules.

**Time box.** 1 hour.

**Rules.** No hand-written player text in code; a line says only what the record holds.

**Done when.** The Words lead's ruling is recorded here. If a line is added, a second session sees a temperament sponsor say it in the running game, in a drawn place of its own choosing with a state amount bill.

**Waits on.** The Words lead's ruling.

**Files.** src/director/bargain-facts.ts, src/director/data/bargain-reasons.json, data/english/parts/scene-talk.json
