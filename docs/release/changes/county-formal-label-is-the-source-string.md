---
id: county-formal-label-is-the-source-string
impact: patch
section: Fixed
title: A county's formal name is the record's own string again
---

A county's formal label had the state appended to it, so the Census row
"Baltimore city" was carried as "Baltimore city, Maryland". The state is
already shown separately, and the formal label exists to be the source's exact
string. Towns are unchanged: their formal label still carries the state.
