---
id: finding-payments-use-saved-accounts
impact: patch
section: Fixed
title: Finding liability survives missing cash without inventing payment accounts
---

Findings no longer create a respondent's cash account or a government recipient while ordering repayment. An actual order with an existing creditor retains its unpaid obligation when payer cash is missing. Recorded payments reduce that same debt. Existing funded repayments retain their amount and record order. A missing creditor remains unsupported.
