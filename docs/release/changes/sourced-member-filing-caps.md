---
id: sourced-member-filing-caps
impact: patch
section: Fixed
title: Member filing reads sourced chamber limits
---

The existing member filer checks saved bills against declared chamber limits before introducing a bill. The initial research table is empty, so a missing row leaves filing uncapped. Later sourced limits require explicit periods and exemptions; unbound rules cannot silently invent exceptions or session dates.
