---
id: missing-wage-term-keeps-clock-running
impact: patch
section: Fixed
title: A missing wage-law amount no longer stops the clock
---

When a saved wage law lacks its numeric amount, payroll now records the
specific missing term and leaves that adjustment unapplied. It does not
invent a wage, move money, or stamp an adjustment that did not happen.
