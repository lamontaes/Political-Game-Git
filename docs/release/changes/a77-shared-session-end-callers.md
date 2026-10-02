---
id: a77-shared-session-end-callers
impact: patch
section: Fixed
title: Council and player actions obey one session-end reader
---

Automatic D.C. council actions and legacy player legislative actions use the
same session-end reader as the institutional bill driver. Recorded procedure
and adjournment decide whether a pending bill dies, carries over or waits for a
later sitting. Open-session vote writers and supplied ballots retain their
existing behavior. No legal end date is supplied where one is unestablished.
