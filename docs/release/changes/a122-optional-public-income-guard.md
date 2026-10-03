---
id: a122-optional-public-income-guard
impact: patch
section: Fixed
title: Missing income records no longer crash the money clock
---

The money clock continues when a production world has no aggregate personal-income definition. Completed payments remain recorded. Without compatible recorded income for the exact jurisdiction and month, public payments produce no macro shock. Worlds with compatible income keep the existing calculation.
