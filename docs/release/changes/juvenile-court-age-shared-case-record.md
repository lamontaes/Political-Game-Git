---
id: juvenile-court-age-shared-case-record
impact: patch
section: Fixed
title: Juvenile age laws are recorded with named adult charges.
---

The shared case-stage consequence dispatcher now records the operative numeric juvenile court age ceiling with a named defendant's adult charge and governing law stamp. The record is append-only and replay-safe; it does not authorize adult transfer.
