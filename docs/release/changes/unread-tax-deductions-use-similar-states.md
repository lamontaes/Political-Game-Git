---
id: unread-tax-deductions-use-similar-states
impact: patch
section: Changed
title: Unread state tax deductions use the most similar researched states
---

When a state's personal exemptions or credits have not been read, its modeled
deduction now uses a weighted average of researched deductions. States with
the same tax structure rank first, followed by the same Census region and the
nearest median household income. Closer references receive more weight, and
equally close references receive equal weight. The estimate stays the same
across worlds. Researched deductions and tax brackets keep their values.
