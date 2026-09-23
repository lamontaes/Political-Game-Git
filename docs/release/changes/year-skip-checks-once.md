---
id: year-skip-checks-once
impact: patch
section: Fixed
title: Year skips in childhood take a fraction of the time on big saves.
---

"Let the year run on" advanced a month at a time and checked the entire save after each month. Each scheduled item also triggered its own check. A year skip now checks the save once. The checks for laws, national elections, political views and their sources look records up instead of searching every record, and a view's earlier version is found in one pass instead of once per record. On the 68 MB Ketchikan save, two year skips went from 49 and 61 seconds to 9 and 11 seconds in Node, and the saved world is byte-identical.
