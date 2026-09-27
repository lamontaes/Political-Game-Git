# Civic calendar source packet

`corpus.json` is the bounded, source-backed calendar for the 2026 regular
election cycle across the fifty states, the District of Columbia, and the five
inhabited territories. The corpus records governor or DC mayor election years,
legislative chamber sizes, terms and seats up in 2026, state primary dates and
systems, and federal congressional term and class references. It does not
assert special elections, every office on every ballot, future ballot orders,
or unstated district identities.

Run `node --import tsx scripts/source/compile-civic-calendar.ts` to rebuild the
corpus, source lock, and manifest. Add `--check` to verify the committed outputs
without writing. The compiler rejects changed source structure or totals that
no longer match the locked pages. `artifact-lock.json` records the publisher URL,
retrieval date, byte count, SHA-256, and rights status for each retained page.
The manifest binds the corpus hash to those inputs. Source rights have not been
assessed; the lock does not claim a public-domain license for non-government
publisher pages.

The `gaps` array is part of the data contract. `null` means the locked sources
do not establish a value. A numeric zero means the source explicitly reported
zero seats up. In particular, the packet does not infer lieutenant governor
cycles, other statewide offices, most staggered district cohorts, territorial
primary dates, or member titles. Nebraska's even-numbered district cohort is
backed by its legislature's statute. Chamber names are reused only where the
existing state-legislature corpus marked them known. Congressional class data
comes from the repository's existing Senate-class table.

This is a research and compiler checkpoint. No player route reads this packet
until its consumer is integrated and verified separately.
