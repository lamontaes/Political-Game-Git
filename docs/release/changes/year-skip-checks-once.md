---
id: year-skip-checks-once
impact: patch
section: Fixed
title: Year skips in childhood take about half as long on big saves.
---

"Let the year run on" advanced a month at a time and checked the entire save after each month. Each scheduled item also triggered its own check. A year skip now checks the save once, and the checks for laws, national elections and their sources use lookups instead of searching every record. On the 68 MB Ketchikan save, two year skips went from 20 and 24 seconds to 10 and 12 seconds in Node, and the saved world is byte-identical.
