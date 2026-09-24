---
id: main-pending-runs-die-on-each-merge
impact: none
---

Documentation only. Records two measured findings about why main could not get
a validation verdict, and reorders the morning click-through list.

The first finding is that `cancel-in-progress: false` on main protects nothing
while main's runs never start: the setting governs a run that is already
executing, and a run still waiting for a slot is canceled outright when the
next merge enters its concurrency group. Three consecutive main runs were
measured being canceled with zero jobs allocated. The second is that the CI
sweep grouped only `queued` runs, so it could never free a slot — a slot is
held by something `in_progress`, and both slots were held by superseded runs
invisible to that listing.

The list itself now leads with the Politics menu label, notes which pull
requests are still drafts and cannot be merged until they are marked ready,
and records the pinned world-event line as a real bug carried in no pull
request. No game, build or release change.
