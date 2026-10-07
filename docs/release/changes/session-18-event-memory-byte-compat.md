---
id: session-18-event-memory-byte-compat
impact: minor
section: Fixed
title: Event memories remain stable when existing saves are loaded
---

The accepted save bytes now include the two event memories written during the demo replay. Existing saves with an empty memory history still load without adding memories and serialize back byte-for-byte unchanged.
