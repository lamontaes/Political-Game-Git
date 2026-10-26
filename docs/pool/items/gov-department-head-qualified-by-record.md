---
id: gov-department-head-qualified-by-record
title: "A department head is weighed by their recorded work and schooling, so an 18-year-old with neither doesn't run a city department"
area: gov
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/department-head-by-record
pr: #6149
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T06:16:50.634Z
---

**What.** The owner's playtest (play-stop-20): by December 2025 his sister, 18 and with no college shown, was Public Works Director of Anson, Texas. #6080 stops residents under 18 from being weighed, but the town appointer's qualification (src/core2/modules/executive.ts, qualification and experienceFromAge) uses age as a stand-in for experience: a base, the person's reliability and deliberation, a saturating curve of years past 18, and a flat bonus when they work at an organization whose name contains the post's first word. A reliable, deliberate 18-year-old with no job or schooling can still outrank older residents, most of all in a small pool (gov-appointments-weigh-counted-adults). The appointer's ranking should read what the records say each candidate has done: years of related work (their jobs and the deep past's work records) and their schooling.

**Rules.** Decision register, employment (Oct): recruitment into civic or institutional work follows real relationships, experience, visible activity, a genuine opportunity and the appointing institution's authority, not universal qualifications. Sliding scales and causes: no age cutoff and no threshold on years; related work and schooling weigh on a sliding scale beside alignment and acquaintance. No dice. Research before building: a public source's typical experience for the occupation calibrates the town's heads in total and never decides one appointment. Replace, never layer: the record-based weight replaces the age curve.

**Done when.** In a played world of a place drawn from all 56 (place and seed named), and in Anson, Texas with the playtest's seed and Bo Snider born February 3, 2007: the appointer's qualification for a town post reads each candidate's recorded related work and schooling, named by record id in the appointment's reasons, and experienceFromAge is gone; no resident without related work or schooling heads a department while a candidate with them is in the pool; and the town's heads' years of related work are set beside a sourced band for the occupation in the PR body.

**Files.** src/core2/modules/executive.ts, src/core2/data/campaigns/parameters.json, src/core2/executive.test.ts

**Notes.** Filed by the speed lead on Merger 0's send-back of #6080 (Oct 26), which asked that the intended qualification rule be proven, not fixed with an arbitrary new age threshold. play-stop-20 stays open on this item and words-family-talk-kin-address.
