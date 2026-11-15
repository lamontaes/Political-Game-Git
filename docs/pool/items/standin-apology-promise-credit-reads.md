---
id: standin-apology-promise-credit-reads
title: "A promise to pay on time after a money quarrel warms the tie when the next payments are made and strains it when one is missed"
area: people
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10
lead: effects
standard: 2
model: sonnet
effort: medium
root: design-life-record
---

**What.** Stand-in SG-WORDS-apology-promise-unread. When the player promises after a quarrel over a missed payment to pay on time or check the bills, the promise is written on the reply and nothing reads it, so a later missed payment is not a broken promise. Seen: in the tie between two people on their page after payments are made or missed.

**Cause.** Found in code: src/core2/modules/quarrel.ts quarrelOverMoney (line 19) writes family.quarrel and strains the tie; src/core2/modules/partnerships.ts onEvent (line 963) reads scene.reply only through answerProposal; no module reads a promise on the apology scene's reply.

**Fix.** In quarrel.ts, when the apology scene's reply keeps a promise, mark the quarrel record promised. At the next credit.payment-made or credit.payment-missed event for that borrower, close the promise: kept (a payment made in the following months with none missed) warms the tie, broken (a missed payment) strains it, by recorded time together on the tie as the quarrel already does. Resolve the stand-in in src/director/data/stopgaps.json. Cost: one lookup per payment event of a borrower with an open promise.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the tie reads the closed promise. No dice. Sliding scale: warmth scales with the months kept, nothing flips at a threshold. One rule, all 56 places.

**Done when.** A second session plays a year in a drawn place (place and seed named), has a borrower miss a payment, answers the apology with a promise, and finds the promise closed by id after the next payments, with the tie warmer if kept or colder if a payment was missed; the stand-in is resolved.

**Waits on.** Nothing.

**Files.** src/core2/modules/quarrel.ts, src/core2/modules/partnerships.ts, src/director/purpose-scene.ts, src/director/data/stopgaps.json

**Notes.**

- Nov 14: built on branch claude/project-thread-yq65dx with the promise record (src/director/promises.ts, promise-kinds.json `pay-on-time`): the apology's promise is a kept fact held by the borrower, broken by their next `credit.payment-missed`, kept when the window closes; SG-WORDS-apology-promise-unread removed. Every quarrel on record is a money quarrel, so no variant needed cutting.
