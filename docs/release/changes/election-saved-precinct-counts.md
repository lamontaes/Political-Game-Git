---
id: election-saved-precinct-counts
impact: patch
section: Added
title: Retain precinct counts from the canonical voter count
---

The existing voter-count loop groups the same candidate ballots by saved, dated
precinct membership. The contest resolver saves validated precinct returns on
the result, preserving the aggregate winner and count. Old and manual results
without precinct evidence retain their existing aggregate count.

Replaces: aggregate-only return from the voter-count loop. National unit results
and existing voter decisions are unchanged. Played election-night proof remains
pending.
