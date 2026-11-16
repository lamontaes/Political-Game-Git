---
id: industry-business-missed-payment-told-to-no-one
title: "A business that misses a loan payment is told to no one: not its owner, its workers or the paper"
area: words
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: words
model: sonnet
effort: medium
source: "Industries thread, Nov 16 (trace /mnt/project-files/account-lead/reports/industry-events-read-by-story.md), at the Account lead's direction, for the owner's Nov 16 01:58Z ask"
---

**What.** A business borrows on a credit line and can miss a payment, which the credit engine records as `credit.payment-missed`, marked not public. Every reader of that event serves a person's own loan (promises, partnerships), so when the borrower is a firm nobody reads it: its owner has no talk about it, its workers hear nothing, and the paper never prints a local firm in arrears. Seen: in the code's readers on Train head a62a2fda; no played case named yet.

**Cause.** Found in code: src/core2/modules/credit.ts around line 1559 emits `credit.payment-missed` with `personIds: [loan.borrowerId]` and `publicRecord: false`; its readers are src/director/promises.ts, src/core2/modules/partnerships.ts and src/core2/data/content.json, none of which match an organization borrower.

**Fix.** Where the borrower is a business, name its owner in the event's people, and let the owner's talk (the conversation engine's register) raise it; a run of missed payments that ends in a default or a closing becomes public for the paper through the existing desk. The player sees it in dev mode's Industries page months and in the owner's talk.

**Time box.** 4 hours; if not done, push what exists, open the draft PR and write the handoff in Notes.

**Rules.** The chain is the acceptance: the missed payment is followed to the owner and back out to a line, by record id. One model, two tiers: a counted business's missed payment is read the same way.

**Done when.** In a drawn place, a business that misses a payment has its owner raise it in talk, by the credit record's id, and a second session sees it in the running game.

**Waits on.** Nothing.

**Files.** src/core2/modules/credit.ts, src/director/conversation.ts
