---
id: canonical-paycheck-reader
impact: patch
section: Fixed
title: Paycheck tax records use one assessment path
---

Removed unused parallel paycheck preparation and partition helpers. Wage-tax
checks now read the existing statutory liabilities and collections, including
repeat assessment and saved-world continuity, without a second assessment path.
