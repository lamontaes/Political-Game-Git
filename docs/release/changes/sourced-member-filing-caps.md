---
id: sourced-member-filing-caps
impact: patch
section: Fixed
title: Member filing reads sourced chamber limits
---

The existing member filer checks saved bills against declared chamber limits before introducing a bill. A missing research row leaves filing uncapped. Sourced limits require bound periods, conditions and exemptions; an unread exemption leaves its whole limit unapplied instead of blocking a potentially exempt bill. The existing filer records “limit not applied: exemption unread” for that intake.

Quoted exceptions and competing conditional rows stay labeled until their saved-record bindings exist.
