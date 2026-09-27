# Civic calendar source packet

`corpus.json` is the bounded, source-backed calendar for the 2026 regular
election cycle across the fifty states, the District of Columbia, and the five
inhabited territories. The corpus records governor or DC mayor election years,
legislative chamber sizes, terms and seats up in 2026, state primary dates and
systems, and federal congressional term and class references. It does not
assert special elections, every office on every ballot, future ballot orders,
or unstated district identities.

The full publisher pages are in the ignored local
`.source-cache/civic-calendar/` and are **not distributed in Git**. NCSL's
[terms](https://www.ncsl.org/terms-of-use) require permission to republish its
material. `artifact-lock.json` records the publisher URL, retrieval date, byte
count, SHA-256, rights status and cache path for each source. `corpus-manifest.json`
binds the compiled corpus to those receipts and marks this packet
`research-only`. Source rights have not been cleared for runtime production.

With the original cached pages available, run
`node --import tsx scripts/source/compile-civic-calendar.ts` to rebuild the
corpus, source lock and manifest. Add `--check` to compare every rebuilt byte
with the committed outputs. Without the pages, `--check` verifies the committed
corpus digest, manifest linkage and coverage invariants but cannot recheck the
publisher's bytes. Do not treat that portable check as source admission.

The `gaps` array is part of the data contract. `null` means the locked sources
do not establish a value. A numeric zero means the source explicitly reported
zero seats up. In particular, the packet does not infer lieutenant governor
cycles, other statewide offices, most staggered district cohorts, territorial
primary dates, or member titles. Nebraska's even-numbered district cohort is
backed by its legislature's statute. Chamber names are reused only where the
existing state-legislature corpus marked them known. Congressional class data
comes from the repository's existing Senate-class table.

This is a research and compiler checkpoint. No player route reads this packet
until a rights-cleared source path and consumer are integrated and verified
separately.
