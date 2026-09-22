---
id: candidate-lift-empty-publication
impact: patch
section: Fixed
title: A review catalog built from nothing says so instead of producing an unreadable number
---

Composing banked artwork for review against a publication that contained no generations gave every part a catalog generation of negative infinity. Nothing downstream could match a part numbered that way, so the review surface came up empty and said nothing about why.

An empty publication means nothing has been published yet, which is the same situation as never having published at all, so parts now join the first review generation exactly as they would have on a first run.

No shipped artwork was numbered this way; every caller in play passes a publication that already has generations in it.
