---
id: adopted-income-tax-ratio
section: Fixed
title: Keep an adopted income-tax rate in the paycheck schedule
impact: patch
---

An adopted flat income-tax rate such as 7% stays in the existing paycheck
schedule when its decimal representation introduces a multiplication residue.
Rates finer than the schedule's whole-basis-point precision remain unsupported.
