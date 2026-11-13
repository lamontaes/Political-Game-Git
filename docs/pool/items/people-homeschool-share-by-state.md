---
id: people-homeschool-share-by-state
title: "Source the homeschool share of school-age children by state and read it where private share is read"
area: people
kind: research
priority: 3
size: S
status: merged
claimed-by: claude/pool-people-homeschool-share-by-state
pr: #8553
blocked-on: a researcher: choose the homeschool definition (Household Pulse is broader than NHES), then build the state table from the Pulse public-use files; see the Notes
source: added with npm run pool -- add
claimed-at: 2026-11-11T04:03:10.243Z
after:
standard: 2
model: sonnet
effort: low
root: none
lead: lives
checked: fable 2026-11-10
merged-at: 2026-11-12T20:23:04.456Z
---

**What.** The private share of students by state is sourced, but the homeschool share by state is not read anywhere. A researcher already built the 51-state table from the Census Household Pulse public-use files, scaled to the national NHES figure (1.8 to 4.4 percent, median 2.6), with the definition, limits and script written up in docs/reports/homeschool-share-2026-10-20.md. The table never shipped because the school engine reads one national private share. Move the table into data/research/people with a reader in the tuition opening.

**Cause.** Found in code: src/core2/opening-private-tuition.ts (privateShareOf, line 43, and publishedPrivateShareOf, line 27) reads one national private share and has no homeschool share; the state table is written up in docs/reports/homeschool-share-2026-10-20.md, with source file data/research/people/census-household-pulse-homeschool-replicate-errors-2023.json.

**Fix.** Move the 51-state table (plus five territories at the median, tagged ESTIMATED) into data/research/people with a reader in the tuition opening, and have the played world report the share used. Describe it as a state-share calibration of the tuition quota, not as identifying individual homeschooling families.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: a share calibrates the band the proof reports, never the chance one family homeschools. Estimate, never UNKNOWN: a state the source lacks starts from the median, marked ESTIMATED. One rule, all 56 places: the table is keyed by state data, none named in code.

**Done when.** A second session plays a drawn place in buildBenchWorld (place and seed named) and sees the played world report the homeschool share it used for that place's state, with tuition records present in the world. A research file lists each state's homeschool share with its source and year, a reader in the school engine uses it, and the research-data guard in tests/guards passes with the file named.

**Waits on.** Nothing.

**Files.** data/research/people, src/core2/opening-private-tuition.ts, docs/reports/homeschool-share-2026-10-20.md

**Notes.** TODO

Oct 20 (claude, claude/homeschool-share-note): researched, not shipped. The Household Pulse public-use files download without a Census API key (www2.census.gov, 2022 weeks 41 to 48), so the key was not the real blocker. The Pulse homeschool level is 14.4 percent of enrolled children, about five times NCES's own 2.8 percent for 2019 (Digest 2022 Table 206.10), so the state share here is the NHES national figure scaled by each state's shrunk Pulse share relative to the nation, 1.8 to 4.4 percent with a median of 2.6. The definition, the table of 51 states, the script and the limits are in docs/reports/homeschool-share-2026-10-20.md. The data file is not added because research-data-has-reader would fail: the school engine reads one national private share, not a state-level one, and the state-level private share the item refers to (research-school-assignment-sources) is not on main. Next step for a researcher: after that lands, move the table into data/research/people with the reader, tag the territories with the median as ESTIMATED, and report the share a played town used.

Sent back 2026-10-20 from PR #5493 (branch claude/political-game-pool-yucp92-ll): The base PR #5428 is merged, so I retargeted this PR to main. Merging current main conflicts in src/core2/opening-private-tuition.ts and src/core2/opening-private-tuition.test.ts. Resolve both code conflicts on this branch, retaining the sourced per-state data and an ordinary drawn-world tuition proof, then rerun the changed-file gate.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5493 (branch claude/political-game-pool-yucp92-ll): The conflict repair now applies the sourced homeschool share inside privateShareOf, and the existing comment names a played-world reader. The body still has no Done when evidence table required by merger skill section 2.5. Map the state source/year/spread file, territory estimates, school-engine reader, named research-data guard, and played-world share to actual evidence with a full place/seed and record id. The current body also says this stacks on a private-share branch although its base is main; describe the final product calculation rather than the earlier subtraction receipt. No local gate pass is claimed here.; finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5493 (branch claude/political-game-pool-yucp92-ll): The source/table repair is present, and I verified 51 sourced state/DC rows plus five estimated territory rows, with the stated 0.0468 median matching the data. One player claim still exceeds the implementation: docs/release/changes/people-homeschool-share-by-state.md:5 says homeschooling families no longer pay private tuition. src/core2/opening-private-tuition.ts:52 and its quota at line 118 only reduce the aggregate private-school share; the household selection loop does not read a homeschool enrollment/status record or exclude particular homeschooling households. Describe this as a state-share/tuition-quota calibration, without promising individual homeschool families are identified and exempted. Keep the final product calculation and the territory estimates. Main was merged and plain-pushed as b259a5f854; this is a source-review finding, and no local gate pass is claimed.; finish on that branch, merge main into it first.

Sent back 2026-10-22 from PR #5493 (branch claude/political-game-pool-yucp92-ll): Positive played-world tuition proof fails in six fresh drawn places at draw seed874f956eac81771bbcc27e455a8dc46e (no tuition records); ordinary generated-world positive record/source proof remains required.; finish on that branch, merge main into it first.
