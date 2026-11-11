---
id: people-housemates-named-to-each-other
title: "Full housemates know each other by name, and relatives in one home are kin on record"
area: core
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-people-housemates-named-to-each-other
pr: #8456
blocked-on:
source: added with npm run pool -- add
lead: m0-m2
after:
standard: 2
model: sonnet
effort: medium
root: design-life-record
checked: fable 2026-11-10
claimed-at: 2026-11-11T01:46:47.147Z
branch: claude/pool-people-housemates-named-to-each-other
---

**What.** In a drawn bench world many full housemates are neither kin on record nor in each other's knownIds, so a scene or journal cannot name them: the family filing talk at home and the journal line for a strained ending both skip them. People who live together know each other's names, and relatives in one household carry the family fact that says how they are related. Fix the opening so every full housemate pair is either kin on record or known by name.

**Cause.** Measured: buildBenchWorld two-level, Stem, North Carolina, seed hh-a, draw hh: 68 of 258 full housemate pairs are neither kin on record nor known by name (Christopher Walton and Lily Walton, person_006f9e0e33a27d16 and person_006f9f0e33a27ec9, tier weekly); Crooked Creek, Alaska, seed hh-b: 0 of 32.

**Fix.** Where the opening writes a household (src/core2/population.ts, src/core2/modules/people.ts) add known-by-name links between housemates and the family fact for relatives.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places. Two-level population: a person filled in matches the records. No dice. People who live together know each other's names; relatives in one household carry the family fact that says how they are related.

**Done when.** A second session runs buildBenchWorld in Stem, North Carolina (seed hh-a, draw hh) and one more drawn place named with its seed, and sees a test count full housemate pairs and find every pair either kin on record or known by name, with the record id of the fact or the known-person source; the family stake scene test's journal line check is not skipped for a housemate.

**Waits on.** Nothing.

**Files.** src/core2/modules/people.ts, src/core2/population.ts

**Notes.** TODO

Claimed by next for sonnet-a266 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 01:46 UTC) on branch claude/pool-people-housemates-named-to-each-other.
