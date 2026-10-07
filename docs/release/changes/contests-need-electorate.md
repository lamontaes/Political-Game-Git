---
id: contests-need-electorate
impact: patch
section: Fixed
title: Missing election counts leave the contest pending
---

An automatic contest without a supported electorate no longer invents ballots
or names a winner. Supplied election results still use the existing validation.
