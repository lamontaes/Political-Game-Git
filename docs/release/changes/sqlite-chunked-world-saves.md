---
id: sqlite-chunked-world-saves
impact: patch
section: Fixed
title: SQLite saves can use the existing chunked world format
---

SQLite world saves now preserve the existing chunked payload when a saved world exceeds one JavaScript string. Legacy saves remain readable, and replacing a save writes its metadata and chunks together.
