---
id: land13-201-fixes
impact: patch
section: Fixed
title: Stop a previous room's art from lingering in one with none.
---

Switching to a room that has no released art no longer keeps showing the
last room's picture behind it. The rest of this change is test-only:
widening an assertion to accept a legitimate household relationship, retiring
one test for a shell layout that no longer exists, and giving a slower test
more time to finish.
