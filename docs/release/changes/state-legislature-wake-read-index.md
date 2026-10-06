---
id: state-legislature-wake-read-index
impact: patch
title: Reuse recorded state legislature wake dates
section: Fixed
---

State legislature queue planning reuses an append-aware index of recorded fields instead of scanning unrelated history for every pack and election year. Recorded dates, event order, decisions and canonical dispatch remain unchanged.
