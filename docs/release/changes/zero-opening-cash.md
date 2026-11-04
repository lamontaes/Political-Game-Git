---
id: zero-opening-cash
impact: patch
section: Fixed
title: Keep governments with empty opening treasuries valid
---

A government that starts with no available reserve now keeps a valid budget record without an absent journal number. Its opening balance stays zero, and reopening budgets does not fund it again.
