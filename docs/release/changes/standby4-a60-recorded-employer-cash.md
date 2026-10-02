---
id: standby4-a60-recorded-employer-cash
impact: patch
section: Fixed
title: Limit town payroll to recorded payer cash
---

Town payroll pays only what the recorded payer has available. A shortfall
keeps the promised wage and actual payment on record with its cash reason.
Several workers share the same payer balance without spending it twice.

New games record employer cash from their own payroll and the existing industry
cost estimates, using JPMorgan Chase Institute's sourced cash buffer days.
The estimate converts annual outflows into daily outflows before applying the
industry median. Employers added after opening use comparable recorded employer
cash. Existing balances and saved payments stay intact.
