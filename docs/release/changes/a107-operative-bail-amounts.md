---
id: a107-operative-bail-amounts
impact: patch
section: Fixed
title: Cash bail requires an operative or saved amount
---

New money-bail charges now read offense-specific numeric terms from the law
in force. The existing adopted-text reader consumes `cash-bail:<offenseKey>`
under the cash-bail question, in USD minor units. No national median is used
as a legal schedule. Missing numeric authority leaves the pretrial money
consequence pending rather than inventing a deposit or detention decision.

Payments reuse the amount already saved on the charge, including old saves,
through the existing full-cash payment and refund writers. Commercial bond
premiums remain separate. Current starting-law records contain no structured
bail amounts, and the existing detention decision sets release or hold rather
than cash. This change supports recorded authority; sourcing those terms or
an amount-setting court producer remains a separate input gap.
