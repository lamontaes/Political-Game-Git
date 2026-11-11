---
id: play-school-names-abbreviated
title: "Who you are shows school names cut to their record abbreviations ('Shamokin Area Intermediate Sch', 'El Sch')"
area: play
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/pool-play-school-names-abbreviated
pr: #8557
after:
blocked-on:
standard: 2
lead: play-first
model: sonnet
effort: low
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T04:05:40.670Z
---

**What.** Who you are lists the player's schools with the school data's abbreviations as stored: in Dalmatia, Pennsylvania (place key 4218080, seed d5a7f4797e3756f8bdd69464f234cc3c2e3a0e91d0ef4b01ef56cfde097588e6) "Shamokin Area Intermediate Sch" and "Shamokin Area El Sch", and in Albion (playtest Oct 26) "Northwestern MS" and "Northwestern El Sch". A player reads these as cut-off names. The abbreviations should be expanded from a data table where a school's name is shown, not by typing names into a screen.

**Cause.** Found in code: `schoolsOf` in src/bench/words.ts (line 25) shows each school's stored name through `properName` (src/director/words.ts, line 15), which only changes case, so "Sch", "El" and "MS" stay as the organization record holds them (`schoolName` in src/core2/past-school.ts, line 62).

**Fix.** Add a data table of school-name abbreviations (Sch, El, Elem, Intermediate, MS and the like) and expand them in `schoolsOf`, reading "El" as Elementary only before Sch or at the end of a school's name, since El also begins place names. No names are typed into a screen.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: expand the abbreviations from the data table in the English engine's side, never by typing names into a screen. One rule, all 56 places: the table holds word forms, no place or school is named in logic.

**Done when.** A second session (not the builder) opens Who you are in a new game in Dalmatia, Pennsylvania (seed above) and sees "Shamokin Area Intermediate School" and "Shamokin Area Elementary School", with a screenshot at 1440x900; a test over `schoolsOf` in two other drawn places (names and seeds in the PR) finds no school name with a trailing Sch or El left in it.

**Waits on.** Nothing.

**Files.** src/bench/words.ts, src/director/words.ts, src/core2/past-school.ts, data/english/school-name-words.json (new)

**Notes.** TODO Playtest Oct 26 sitting 1 (installed v0.34.0): Who you are lists "Northwestern MS" and "Northwestern El Sch" in Albion; raise priority from 3 to 2.
