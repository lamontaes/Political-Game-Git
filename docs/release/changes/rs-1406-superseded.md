---
id: rs-1406-superseded
impact: none
section: maintenance
title: Close the obsolete monthly call-cost diagnostic
---

RS-1406's diagnostic patch is pinned to source files that are absent from current main and depends on closed PR #1353. Current main handles monthly obligations through its live life-opportunity route. The old diagnostic is superseded; no production instrumentation or behavior was added.
