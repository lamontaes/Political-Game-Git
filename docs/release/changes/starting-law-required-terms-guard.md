---
id: starting-law-required-terms-guard
impact: patch
section: Fixed
title: Starting-law checks identify missing numeric terms.
---

The starting-law guard checks every yes row and its separate dated phases
against the catalog's numeric parameters. It reports absent, duplicate and
wrong-unit terms, and refuses scalar substitutes for structured schedules.
The current data still fails this check. Shared category, table and dimensional
unit admission remains with Audit; policy owners supply their own cited rows.
