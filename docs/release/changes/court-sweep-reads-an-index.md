---
id: court-sweep-reads-an-index
impact: patch
section: Fixed
title: The weekly court and clemency pass no longer slows with a long life
---

Each week the game reads every open court case, every sentence and every
clemency request. It used to scan the whole history of the world for each
one, so a tenth year of play spent far longer in court than the first. It now
reads cases, sentences and requests from an index that grows with history.
No outcome changes.
