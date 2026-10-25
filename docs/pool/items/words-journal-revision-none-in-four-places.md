---
id: words-journal-revision-none-in-four-places
title: "The journal-revision test finds no revised entry in four drawn places on clean main"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On clean main (cbe562fd49) with GOLDEN_PATH_SEED=b41188c9f661356873b5bc20796fc875943ffdaa, src/director/journal-revision.test.ts plays a year in each of four drawn places, watching every full person, and no journal revises an early entry in any of them: Washington, District of Columbia; Agingan, Northern Mariana Islands; Cortland, Nebraska; Clayton, Delaware. The run took 605 seconds. CI drew the same seed on PR 5914 and failed the same way, so the test goes red by draw. Find which record a revision reads and why none reached a watched journal in those four places, and fix it at the root: the revision rule, the producer of the later record, or the test's draw.

**Rules.** One rule, all 56 places: the fix holds for any drawn place and seed. Ask why: name the record a revision would have read and why it was missing, by record id. No vacuous tests: the test still fails when no revision happens.

**Done when.** src/director/journal-revision.test.ts passes on seed b41188c9f661356873b5bc20796fc875943ffdaa and on three more seeds the builder did not choose, each place named in the PR body with the revised entry and the record id that changed what it meant.

**Files.** src/director/journal-revision.test.ts, src/director/journal.ts, src/director/data/journal.json

**Notes.** Probed Oct 25 on clean main with the same seed, all four places, everyone watched for a year (`scripts/tmp-probe/revise-probe.ts` on branch words/journal-revision, not committed). The ledger has plenty of candidates: an earlier moment small then (impact under 0.5), grown since (hindsight 0.5 or more), at least an eighth of a year before the later moment that echoes it, with the same counterpart. Washington, D.C. has 111, Agingan 33, Cortland 296 and Clayton 281. All four revise lines in data/english/parts/journal.json play. What stops the revision is the journal: it tells about 1.3 to 1.7 lines per watched person per year (102 lines for 77 people in Agingan, 189 for 111 in Cortland), and a revision needs both the earlier and the later moment told. Of Cortland's 296 candidates the earlier moment was told for 2 and the later for 8, never both; Agingan had none told. So the question is what the journal tells, not the revision rule: either small moments that later grew are told when they happen, or the revision may look back on a moment the journal did not tell.
