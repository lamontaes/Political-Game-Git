---
id: held-bail-stays-out-of-spendable-budget-cash
impact: patch
section: Fixed
title: Refundable bail stays out of a government's spendable budget
---

The common government budget writer subtracts recorded refundable cash bail
from physical account cash before allocating balance and reserve. Deposits
and refunds retain their payment identities without becoming operating
revenue or spending. No forfeiture revenue is inferred without its own saved
event. Existing saved budget rows remain readable.
