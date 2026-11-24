---
id: laws-effect-learned-for-local-sales-tax
title: "A passed local sales-tax ordinance reaches nobody as a learned effect, and conversation never reads law.effect-learned, so no neighbor says how it touched them"
area: laws
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: laws
source: golden path "pass an ordinance, the town visibly changes, people bring it up" played in Bear Valley, California (words helper, Nov 10)
---

**What.** The player's county sales-tax cut was enacted (4 to 1, county board), a `law-took-effect` story was printed for it (county:06043 sales-tax 2025-1, four outlets), and the law in force changed, yet over 400 days the log holds zero `law.effect-learned` records for it: those come only from place-prices rules (a price a law set), budget obligations and estate taxes. And the conversation engine has no subject that reads a `law.effect-learned` record (`learnedFrom` names the story the person heard), so a neighbor can say that an ordinance passed (from the press) but never what it did to them (a price, a service, a rule). The words helper did not build it, per the rule that a missing record is the owning lead's. Seen: a neighbor bringing up the player's passed sales-tax ordinance in conversation (golden path: people bring it up).

**Done when.** A played year with the player's local tax or wage ordinance in force shows a `law.effect-learned` record per person it reached (citing the story or notice they learned it from), and a conversation line names the ordinance and that effect for the speaker, by record id.

**Rules.** Wire to the world: the effect is a read, not a record, so a different engine (the conversation engine) reads it when it decides what a person says; no dice decides who learned it, and the owner's rule that nobody attributes a change to a law unless they learned of it holds.

**Files.** src/core2/modules/place-prices.ts, src/core2/modules/budgets-treasury.ts, src/director/conversation.ts, src/director/bring-it-up.ts

**Notes.** Evidence: src/director/bring-up-ordinance.test.ts (seed 1, Bear Valley, California). Lines wanted: "The sales tax went down after your ordinance; I noticed at the register" only from a person's own learned-effect record, never from the law alone.
