---
id: a-new-party-records-where-it-came-from
impact: patch
section: Fixed
title: A party organized out of a party body records the body it came from
---

When people organized a new party out of a body they belonged to, the history
recorded the new party as having come from nowhere. The founders were walked
out of their old organization during the same step, and then the record wrote
an empty list of parent organizations, so the one moment that knew the
parentage discarded it.

The record now keeps it. A founding proposed from nothing still records no
parent, because it genuinely has none.
