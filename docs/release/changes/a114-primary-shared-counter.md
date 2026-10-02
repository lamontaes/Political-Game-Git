---
id: a114-primary-shared-counter
impact: patch
section: Changed
title: Primary voters choose from their views of the candidates
---

Primary voters choose from their views of the candidates. Party ballots require their saved registration and ballot selection; missing records do not grant access.

Unopposed filed candidates retain their existing nomination path without a
voter count. Contested party primaries still require recorded ballot admission;
this repair does not infer those actions from public party affiliation.

Primaries and runoffs now read jurisdiction-specific party registration and
election-specific ballot selections recorded through the existing event writer.
An elector with unread admission is excluded without discarding other admitted
votes. No admitted votes, missing candidate views, and tied results remain
unresolved. Public affiliation never becomes registration.
